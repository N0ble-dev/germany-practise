import { sql, type SQL } from "drizzle-orm";
import {
  sentenceCursorSchema,
  type EditPublicSentence,
  type OwnPublicSentence,
  type PublicSentence,
  type PublishSentences,
  type SentenceFeed,
} from "./community-model";

export class CommunityError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
type Execute = (query: SQL) => Promise<{ rows: Record<string, unknown>[] }>;
const publicColumns = sql`id,german,signature,signature_style as "signatureStyle",signature_drawing as "signatureDrawing",to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "createdAt",to_char(updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "updatedAt"`;
export class CommunityRepository {
  private execute: Execute;
  constructor(execute: Execute) {
    this.execute = execute;
  }
  async feed(q = "", cursor?: string): Promise<SentenceFeed> {
    let after: { date: string; id: string } | undefined;
    if (cursor) {
      try {
        after = sentenceCursorSchema.parse(
          JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")),
        );
      } catch {
        throw new CommunityError(
          "This page link expired. Start with the latest sentences.",
        );
      }
    }
    const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    const { rows } = await this
      .execute(sql`select ${publicColumns} from public.sentence_posts
      where (${q}='' or german ilike ${pattern} or signature ilike ${pattern})
      ${after ? sql`and (created_at,id)<(${after.date}::timestamptz,${after.id}::uuid)` : sql``}
      order by created_at desc,id desc limit 25`);
    const posts = rows.slice(0, 24) as unknown as PublicSentence[],
      last = posts.at(-1);
    return {
      posts,
      nextCursor:
        rows.length > 24 && last
          ? Buffer.from(
              JSON.stringify({ date: last.createdAt, id: last.id }),
            ).toString("base64url")
          : null,
    };
  }
  async own(userId: string): Promise<OwnPublicSentence[]> {
    const { rows } = await this.execute(
      sql`select ${publicColumns},revision from public.sentence_posts where author_id=${userId}::uuid order by created_at desc,id desc limit 50`,
    );
    return rows as unknown as OwnPublicSentence[];
  }
  async publish(userId: string, input: PublishSentences) {
    const sentences = sql`ARRAY[${sql.join(
      input.sentences.map((sentence) => sql`${sentence}`),
      sql`, `,
    )}]::text[]`;
    await this.execute(
      sql`select * from public.publish_sentence_posts(${userId}::uuid,${sentences},${input.signature},${input.signatureStyle},${input.signatureDrawing ? JSON.stringify(input.signatureDrawing) : null}::jsonb)`,
    );
    return this.own(userId);
  }
  async edit(userId: string, id: string, input: EditPublicSentence) {
    const { rows } = await this
      .execute(sql`with author_lock as materialized (select pg_advisory_xact_lock(hashtextextended(${userId}::uuid::text,418)))
      update public.sentence_posts set german=${input.german},signature=${input.signature},signature_style=${input.signatureStyle},signature_drawing=${input.signatureDrawing ? JSON.stringify(input.signatureDrawing) : null}::jsonb,revision=revision+1,updated_at=now() from author_lock
      where id=${id}::uuid and author_id=${userId}::uuid and revision=${input.revision} returning id`);
    if (!rows.length)
      throw new CommunityError(
        "This post changed or is unavailable to your account. Reload before editing.",
        409,
      );
    return this.own(userId);
  }
  async remove(userId: string, id: string) {
    const { rows } = await this.execute(
      sql`delete from public.sentence_posts where id=${id}::uuid and author_id=${userId}::uuid returning id`,
    );
    if (!rows.length)
      throw new CommunityError(
        "This public sentence was not found in your account.",
        404,
      );
  }
}
