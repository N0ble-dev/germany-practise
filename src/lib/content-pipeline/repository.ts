import { sql, type SQL } from "drizzle-orm";
import { contentHash } from "./hash.ts";
import {
  lessonPackSchema,
  type ContentDetail,
  type ContentReview,
  type LessonPack,
  type ReviewCategory,
} from "./model.ts";
import { publicationBlockers } from "./gates.ts";
import { sourceEvidenceErrors } from "./source-evidence.ts";

type Execute = (query: SQL) => Promise<{ rows: Record<string, unknown>[] }>;
export class ContentError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export class ContentRepository {
  private execute: Execute;
  constructor(execute: Execute) {
    this.execute = execute;
  }
  async importDraft(input: unknown) {
    const pack = lessonPackSchema.parse(input),
      hash = contentHash(pack);
    const evidenceErrors = sourceEvidenceErrors(pack.references);
    if (evidenceErrors.length)
      throw new ContentError(evidenceErrors.join("\n"), 409);
    const { rows } = await this.execute(sql`
      with course as (
        insert into courses (id,cefr,title) values (${pack.courseId},${pack.cefr},${pack.courseSubdivision})
        on conflict (id) do update set id=excluded.id returning id
      ), version as (
        insert into lesson_versions (lesson_key,version,course_id,content_json,content_hash)
        select ${pack.id},${pack.version},id,${JSON.stringify(pack)}::jsonb,${hash} from course
        on conflict (lesson_key,version) do update set lesson_key=excluded.lesson_key
        returning id,content_hash
      ), assets as (
        insert into media_assets (lesson_version_id,asset_key,storage_key,file_hash,license_ref)
        select v.id,m->>'id',m->>'storageKey',m->>'fileHash',m->>'licenseRef'
        from version v,jsonb_array_elements(${JSON.stringify(pack.media)}::jsonb) m
        where v.content_hash=${hash} on conflict (lesson_version_id,asset_key) do nothing
      ), sources as (
        insert into curriculum_sources (id,source_url,license,attribution,permission_doc)
        select r->>'id',r->>'url',r->>'license',r->>'attribution',r->>'permissionRef'
        from jsonb_array_elements(${JSON.stringify(pack.references)}::jsonb) r
        where exists(select 1 from version where content_hash=${hash}) on conflict (id) do nothing
      ) select id,content_hash from version`);
    if (rows[0]?.content_hash !== hash)
      throw new ContentError(
        "This version already contains different content. Increment the version; imported versions are immutable.",
        409,
      );
    return { lessonKey: pack.id, version: pack.version, contentHash: hash };
  }
  async list() {
    return (
      await this.execute(sql`
      select v.lesson_key as "lessonKey",v.version,v.content_hash as "contentHash",
        v.content_json->'title' as title,v.course_id as "courseId",v.created_at::text as "createdAt",
        exists(select 1 from published_lesson_catalog p where p.id=v.id) as published,
        (select count(distinct r.category)::int from content_reviews r where r.lesson_version_id=v.id and r.content_hash=v.content_hash and r.decision='approved'
          and r.id=(select latest.id from content_reviews latest where latest.lesson_version_id=v.id and latest.category=r.category order by latest.created_at desc,latest.id desc limit 1)) as "approvedGates"
      from lesson_versions v order by v.course_id,v.lesson_key,v.version desc limit 300`)
    ).rows;
  }
  async detail(key: string, version: number): Promise<ContentDetail> {
    const { rows } = await this.execute(
      sql`select id,content_json,content_hash,exists(select 1 from published_lesson_catalog p where p.id=v.id) as published from lesson_versions v where lesson_key=${key} and version=${version}`,
    );
    const row = rows[0];
    if (!row) throw new ContentError("This lesson version was not found.", 404);
    const pack = lessonPackSchema.parse(row.content_json);
    if (contentHash(pack) !== row.content_hash)
      throw new ContentError(
        "Stored content does not match its immutable hash.",
        409,
      );
    const [reviewRows, assets, prerequisites] = await Promise.all([
      this.execute(
        sql`select category,reviewer_id as "reviewerId",reviewer_name as "reviewerName",decision,comment,content_hash as "contentHash",created_at::text as "reviewedAt" from content_reviews where lesson_version_id=${row.id}::uuid order by created_at,id`,
      ),
      this.execute(
        sql`select asset_key as id,verified_at::text as "checkedAt" from media_assets where lesson_version_id=${row.id}::uuid and verified_at is not null`,
      ),
      this.execute(sql`select lesson_key from published_lesson_catalog`),
    ]);
    const reviews = reviewRows.rows as unknown as ContentReview[];
    const mediaChecks = assets.rows as unknown as ContentDetail["mediaChecks"];
    return {
      pack,
      contentHash: String(row.content_hash),
      reviews,
      mediaChecks,
      published: Boolean(row.published),
      blockers: publicationBlockers(
        pack,
        reviews,
        mediaChecks.map((a) => a.id),
        prerequisites.rows.map((p) => String(p.lesson_key)),
      ),
    };
  }
  async review(
    actor: { id: string; name: string },
    key: string,
    version: number,
    hash: string,
    category: ReviewCategory,
    decision: "approved" | "changes_requested",
    comment: string,
  ) {
    const { rows } = await this.execute(sql`
      with target as (select id from lesson_versions where lesson_key=${key} and version=${version} and content_hash=${hash} for update)
      insert into content_reviews (lesson_version_id,category,reviewer_id,reviewer_name,decision,comment,content_hash)
      select id,${category},${actor.id}::uuid,${actor.name},${decision},${comment},${hash} from target returning id`);
    if (!rows.length)
      throw new ContentError(
        "The version changed or no longer exists. Reload before reviewing.",
        409,
      );
  }
  async verifyMedia(
    key: string,
    version: number,
    hash: string,
    assetId: string,
    inspection: {
      duration: number;
      sampleRate: number;
      channels: number;
      bytes: number;
      fileHash: string;
    },
  ) {
    const { rows } = await this.execute(sql`
      update media_assets m set verified_at=now(),verification=${JSON.stringify(inspection)}::jsonb
      from lesson_versions v where m.lesson_version_id=v.id and v.lesson_key=${key} and v.version=${version} and v.content_hash=${hash}
      and m.asset_key=${assetId} and m.file_hash=${inspection.fileHash} returning m.id`);
    if (!rows.length)
      throw new ContentError("The recording or lesson hash changed.", 409);
  }
  // Called only by the manually approved promotion CLI, which reads evidence from
  // the configured review database. No HTTP endpoint accepts fabricated reviews.
  async importReviewEvidence(
    key: string,
    version: number,
    review: ContentReview,
  ) {
    await this.execute(sql`
      insert into content_reviews (lesson_version_id,category,reviewer_id,reviewer_name,decision,comment,content_hash,created_at)
      select v.id,${review.category},${review.reviewerId}::uuid,${review.reviewerName},${review.decision},${review.comment},${review.contentHash},${new Date(review.reviewedAt).toISOString()}::timestamptz
      from lesson_versions v where v.lesson_key=${key} and v.version=${version} and v.content_hash=${review.contentHash}
      and not exists(select 1 from content_reviews r where r.lesson_version_id=v.id and r.category=${review.category} and r.reviewer_id=${review.reviewerId}::uuid and r.content_hash=${review.contentHash} and r.decision=${review.decision} and r.created_at=${new Date(review.reviewedAt).toISOString()}::timestamptz)`);
  }
  async publish(actorId: string, key: string, version: number, hash: string) {
    const detail = await this.detail(key, version);
    if (detail.contentHash !== hash)
      throw new ContentError(
        "Reload the exact version before publishing.",
        409,
      );
    if (detail.blockers.length)
      throw new ContentError(detail.blockers.join("\n"), 409);
    // Lock the immutable version. Reviews also lock this row: publication and a new
    // review cannot race to apply a stale approval. All gates are rechecked in SQL.
    const { rows } = await this.execute(sql`
      with locked as (select * from lesson_versions where lesson_key=${key} and version=${version} and content_hash=${hash} for update),
      ready as (select v.* from locked v where v.content_json->'rights'->>'commercialUseCleared'='true'
        and exists(select 1 from publishable_lesson_versions checked where checked.id=v.id)
        and not exists(select 1 from media_assets m where m.lesson_version_id=v.id and m.verified_at is null)
        and not exists(select 1 from jsonb_array_elements_text(v.content_json->'prerequisites') pre where not exists(select 1 from published_lesson_catalog p where p.lesson_key=pre))
      ), pointer as (
        insert into course_publications (course_id,lesson_key,published_version_id)
        select course_id,lesson_key,id from ready on conflict (course_id,lesson_key)
        do update set published_version_id=excluded.published_version_id,updated_at=now() returning published_version_id
      ), marked as (update lesson_versions set published_at=coalesce(published_at,now()) where id in(select published_version_id from pointer))
      insert into content_publication_events (lesson_version_id,actor_id,content_hash)
      select published_version_id,${actorId}::uuid,${hash} from pointer returning id`);
    if (!rows.length)
      throw new ContentError(
        "Publication gates changed. Reload the review report.",
        409,
      );
  }
  async published(courseId?: string) {
    const rows = (
      await this.execute(
        sql`select lesson_key as "lessonKey",version,content_hash as "contentHash",content_json as pack from published_lesson_catalog ${courseId ? sql`where course_id=${courseId}` : sql``} order by course_id,(content_json->>'lessonNumber')::int`,
      )
    ).rows as unknown as {
      lessonKey: string;
      version: number;
      contentHash: string;
      pack: LessonPack;
    }[];
    return rows.map((row) => {
      const pack = lessonPackSchema.parse(row.pack);
      if (contentHash(pack) !== row.contentHash)
        throw new ContentError(
          "Published content failed its immutable hash check.",
          409,
        );
      return { ...row, pack };
    });
  }
}
