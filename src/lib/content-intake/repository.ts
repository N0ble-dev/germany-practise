import { sql, type SQL } from "drizzle-orm";
import { contentHash } from "../content-pipeline/hash.ts";
import { ContentError } from "../content-pipeline/repository.ts";
import {
  intakeArchiveSchema,
  intakeItemSchema,
  correctedEntrySchema,
  intakeDraftBlockers,
  type IntakeArchive,
  type IntakeItem,
  type CorrectedEntry,
} from "./model.ts";
import type { IntakeKind, IntakeReviewCategory } from "./constants.ts";
type Execute = (query: SQL) => Promise<{ rows: Record<string, unknown>[] }>;
export type IntakeSummary = {
  id: string;
  provider: string;
  title: string;
  expectedCount: number;
  state: string;
  manifest: IntakeArchive["manifest"];
  manifestHash: string;
};
export type IntakeRow = {
  id: number;
  kind: IntakeKind;
  key: string;
  hash: string;
  chapter: number | null;
  page: number | null;
  german: string | null;
  english: string | null;
  topic: string | null;
  listType: string | null;
  hasDraft: boolean;
};
export type IntakeReview = {
  category: IntakeReviewCategory;
  decision: "approved" | "changes_requested";
  comment: string;
  contentHash: string;
  reviewerName: string;
  reviewedAt: string;
};
export type IntakeDraft = {
  id: string;
  version: number;
  contentHash: string;
  entry: CorrectedEntry;
  authorName: string;
  reviews: IntakeReview[];
  blockers: string[];
};
export type IntakeDetail = {
  item: IntakeRow & { payload: Record<string, unknown>; archiveId: string };
  archive: IntakeSummary;
  sourcePage: { page: number; text: string } | null;
  draft: IntakeDraft | null;
};
export class IntakeRepository {
  private execute: Execute;
  constructor(execute: Execute) {
    this.execute = execute;
  }
  async importArchive(input: unknown) {
    const archive = intakeArchiveSchema.parse(input);
    if (
      contentHash({
        provider: archive.provider,
        title: archive.title,
        manifest: archive.manifest,
        expectedCount: archive.expectedCount,
      }) !== archive.manifestHash
    )
      throw new ContentError("Archive manifest hash differs.", 409);
    const { rows } = await this
      .execute(sql`insert into content_intake.archives(id,provider,title,manifest_hash,manifest,expected_count)
    values(${archive.id},${archive.provider},${archive.title},${archive.manifestHash},${JSON.stringify(archive.manifest)}::jsonb,${archive.expectedCount})
    on conflict(id) do update set id=excluded.id returning manifest_hash`);
    if (rows[0]?.manifest_hash !== archive.manifestHash)
      throw new ContentError(
        "This archive identity already contains different source evidence.",
        409,
      );
  }
  async importBatch(archiveId: string, input: IntakeItem[]) {
    if (!input.length || input.length > 1000)
      throw new ContentError("Import 1–1000 source items per batch.");
    const batch = input.map((x) => intakeItemSchema.parse(x));
    if (
      new Set(batch.map((x) => `${x.kind}:${x.key}`)).size !== batch.length ||
      batch.some((x) => contentHash(x.payload) !== x.hash)
    )
      throw new ContentError(
        "Duplicate source identity or changed payload hash.",
        409,
      );
    const { rows } = await this.execute(sql`with input as (
    select * from jsonb_to_recordset(${JSON.stringify(batch)}::jsonb) as x(kind text,key text,hash text,chapter int,page int,german text,english text,topic text,"listType" text,payload jsonb)
  ), permitted as (select * from input where not exists (
    select 1 from input x join content_intake.items i on i.archive_id=${archiveId} and i.kind=x.kind and i.item_key=x.key where i.content_hash<>x.hash
  ) and not exists(select 1 from content_intake.archives a where a.id=${archiveId} and a.state='complete' and exists(
    select 1 from input x where not exists(select 1 from content_intake.items i where i.archive_id=a.id and i.kind=x.kind and i.item_key=x.key)
  ))), imported as (
   insert into content_intake.items(archive_id,kind,item_key,content_hash,chapter,page,german,english,topic,list_type,payload)
   select ${archiveId},kind,key,hash,chapter,page,german,english,topic,"listType",payload from permitted p
   where not exists(select 1 from content_intake.items i where i.archive_id=${archiveId} and i.kind=p.kind and i.item_key=p.key)
   on conflict(archive_id,kind,item_key) do nothing returning id
  ) select (select count(*) from imported)+(select count(*) from permitted p join content_intake.items i on i.archive_id=${archiveId} and i.kind=p.kind and i.item_key=p.key and i.content_hash=p.hash) as imported`);
    if (Number(rows[0]?.imported) !== batch.length)
      throw new ContentError(
        "Source snapshot differs from existing immutable rows; no items in this batch were changed.",
        409,
      );
  }
  async importedHashes(archiveId: string, cursor = 0) {
    const { rows } = await this
      .execute(sql`select id,kind,item_key as key,content_hash as hash from content_intake.items
      where archive_id=${archiveId} and id>${cursor} order by id limit 25000`);
    return rows.map((row) => ({ ...row, id: Number(row.id) })) as {
      id: number;
      kind: IntakeKind;
      key: string;
      hash: string;
    }[];
  }
  async completeArchive(archiveId: string) {
    const { rows } = await this
      .execute(sql`update content_intake.archives a set state='complete',completed_at=coalesce(completed_at,now())
    where a.id=${archiveId} and a.expected_count=(select count(*) from content_intake.items i where i.archive_id=a.id)
    and not exists(select 1 from jsonb_each_text(a.manifest->'counts') expected where expected.value::int<>(select count(*) from content_intake.items i where i.archive_id=a.id and i.kind=expected.key)) returning id`);
    if (!rows.length)
      throw new ContentError(
        "Archive is incomplete or its per-kind totals differ. Resume the import before review.",
        409,
      );
  }
  async archives(): Promise<IntakeSummary[]> {
    return (
      await this.execute(
        sql`select id,provider,title,expected_count as "expectedCount",state,manifest,manifest_hash as "manifestHash" from content_intake.archives order by provider,id`,
      )
    ).rows as unknown as IntakeSummary[];
  }
  async list(input: {
    archiveId: string;
    kind: IntakeKind;
    chapter?: number;
    listType?: string;
    query?: string;
    cursor?: number;
    drafted?: boolean;
  }) {
    const words = (input.query ?? "").trim();
    const { rows } = await this
      .execute(sql`select i.id,i.kind,i.item_key as key,i.content_hash as hash,i.chapter,i.page,
    left(i.german,500) as german,left(i.english,500) as english,i.topic,i.list_type as "listType",
    exists(select 1 from content_intake.drafts d where d.item_id=i.id) as "hasDraft"
    from content_intake.items i join content_intake.archives a on a.id=i.archive_id and a.state='complete'
    where i.archive_id=${input.archiveId} and i.kind=${input.kind}
    ${input.chapter ? sql`and i.chapter=${input.chapter}` : sql``}
    ${input.listType ? sql`and i.list_type=${input.listType}` : sql``}
    ${words ? sql`and to_tsvector('simple',coalesce(i.german,'') || ' ' || coalesce(i.english,'')) @@ plainto_tsquery('simple',${words})` : sql``}
    ${input.cursor ? sql`and i.id>${input.cursor}` : sql``}
    ${input.drafted === undefined ? sql`` : sql`and exists(select 1 from content_intake.drafts d where d.item_id=i.id)=${input.drafted}`}
    order by i.id limit 25`);
    const items = rows
      .slice(0, 24)
      .map((row) => ({ ...row, id: Number(row.id) })) as IntakeRow[];
    return { items, nextCursor: rows.length > 24 ? items.at(-1)!.id : null };
  }
  async detail(itemId: number): Promise<IntakeDetail> {
    const { rows } = await this
      .execute(sql`select i.id,i.archive_id as "archiveId",i.kind,i.item_key as key,i.content_hash as hash,i.chapter,i.page,i.german,i.english,i.topic,i.list_type as "listType",i.payload,
    jsonb_build_object('id',a.id,'provider',a.provider,'title',a.title,'expectedCount',a.expected_count,'state',a.state,'manifest',a.manifest,'manifestHash',a.manifest_hash) as archive,
    (select jsonb_build_object('page',p.page,'text',p.german) from content_intake.items p where p.archive_id=i.archive_id and p.kind='source_page' and p.page=i.page limit 1) as "sourcePage"
    from content_intake.items i join content_intake.archives a on a.id=i.archive_id and a.state='complete' where i.id=${itemId}`);
    if (!rows.length)
      throw new ContentError("This complete source item was not found.", 404);
    const row = rows[0],
      item = {
        ...row,
        id: Number(row.id),
        hasDraft: false,
      } as unknown as IntakeDetail["item"];
    if (contentHash(item.payload) !== item.hash)
      throw new ContentError(
        "Stored source payload differs from its immutable hash.",
        409,
      );
    const draft = await this.latestDraft(itemId);
    item.hasDraft = !!draft;
    return {
      item,
      archive: row.archive as IntakeSummary,
      sourcePage: row.sourcePage as IntakeDetail["sourcePage"],
      draft,
    };
  }
  private async latestDraft(itemId: number): Promise<IntakeDraft | null> {
    const { rows } = await this
      .execute(sql`select d.id,d.version,d.content_hash as "contentHash",d.content as entry,d.author_name as "authorName",
    coalesce((select jsonb_agg(jsonb_build_object('category',r.category,'decision',r.decision,'comment',r.comment,'contentHash',r.content_hash,'reviewerName',r.reviewer_name,'reviewedAt',r.created_at) order by r.created_at,r.id)
      from content_intake.reviews r where r.draft_id=d.id),'[]'::jsonb) as reviews
    from content_intake.drafts d where d.item_id=${itemId} order by d.version desc limit 1`);
    if (!rows.length) return null;
    const row = rows[0],
      entry = correctedEntrySchema.parse(row.entry),
      hash = contentHash(entry);
    if (hash !== row.contentHash)
      throw new ContentError("Corrected draft does not match its hash.", 409);
    const draft = row as unknown as IntakeDraft;
    return {
      ...draft,
      entry,
      blockers: intakeDraftBlockers(entry, draft.reviews, hash),
    };
  }
  async saveDraft(
    actor: { id: string; name: string },
    itemId: number,
    sourceHash: string,
    expectedVersion: number,
    input: unknown,
  ) {
    const entry = correctedEntrySchema.parse(input),
      hash = contentHash(entry);
    try {
      await this.execute(
        sql`select content_intake.save_draft(${itemId},${sourceHash},${expectedVersion},${hash},${JSON.stringify(entry)}::jsonb,${actor.id}::uuid,${actor.name})`,
      );
    } catch {
      throw new ContentError(
        "The source or draft changed. Reload the item before saving another revision.",
        409,
      );
    }
    return this.detail(itemId);
  }
  async review(
    actor: { id: string; name: string },
    draftId: string,
    hash: string,
    category: IntakeReviewCategory,
    decision: "approved" | "changes_requested",
    comment: string,
  ) {
    const { rows } = await this
      .execute(sql`insert into content_intake.reviews(draft_id,content_hash,category,decision,comment,reviewer_id,reviewer_name)
   select d.id,d.content_hash,${category},${decision},${comment},${actor.id}::uuid,${actor.name} from content_intake.drafts d
   where d.id=${draftId}::uuid and d.content_hash=${hash} and d.version=(select max(version) from content_intake.drafts where item_id=d.item_id)
   returning draft_id`);
    if (!rows.length)
      throw new ContentError(
        "This draft is no longer current. Reload before reviewing.",
        409,
      );
  }
}
