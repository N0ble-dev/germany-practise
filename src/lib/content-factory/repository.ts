import { sql, type SQL } from "drizzle-orm";
import { contentHash } from "../content-pipeline/hash.ts";
import {
  lessonPackSchema,
  type ContentReview,
} from "../content-pipeline/model.ts";
import type { FactoryEvidence } from "./coverage.ts";

export async function factoryEvidence(
  execute: (query: SQL) => Promise<{ rows: Record<string, unknown>[] }>,
  lessonIds: string[],
): Promise<FactoryEvidence[]> {
  if (!lessonIds.length) return [];
  const { rows } = await execute(sql`
    with requested as (
      select jsonb_array_elements_text(${JSON.stringify(lessonIds)}::jsonb) as lesson_key
    ), latest as (
      select distinct on (lesson_key) id from lesson_versions
      where lesson_key in (select lesson_key from requested)
      order by lesson_key,version desc
    ), selected as (
      select id from latest union
      select id from published_lesson_catalog where lesson_key in (select lesson_key from requested)
    )
    select v.content_json as pack,v.content_hash as "contentHash",
      exists(select 1 from published_lesson_catalog p where p.id=v.id) as published,
      coalesce((select jsonb_agg(jsonb_build_object('category',r.category,'decision',r.decision,
        'contentHash',r.content_hash,'reviewerId',r.reviewer_id,'reviewerName',r.reviewer_name,
        'comment',r.comment,'reviewedAt',r.created_at)) from (
          select distinct on (category) * from content_reviews where lesson_version_id=v.id and content_hash=v.content_hash
          order by category,created_at desc,id desc
        ) r),'[]'::jsonb) as reviews,
      coalesce((select jsonb_agg(jsonb_build_object('id',m.asset_key,'checkedAt',m.verified_at))
        from media_assets m where m.lesson_version_id=v.id and m.verified_at is not null),'[]'::jsonb) as "mediaChecks"
    from lesson_versions v join selected s on s.id=v.id`);
  return rows.map((row) => {
    const pack = lessonPackSchema.parse(row.pack);
    if (contentHash(pack) !== row.contentHash)
      throw new Error("The staged lesson hash is inconsistent.");
    return {
      pack,
      contentHash: String(row.contentHash),
      published: row.published === true,
      reviews: row.reviews as ContentReview[],
      mediaChecks: row.mediaChecks as FactoryEvidence["mediaChecks"],
    };
  });
}
