import { sql, type SQL } from "drizzle-orm";
import { ContentError } from "../content-pipeline/repository.ts";
import {
  libraryKinds,
  safeLibraryUrl,
  type LibraryItem,
  type LibraryOverview,
  type LibraryQuery,
  type LibraryPage,
  type LibraryCredit,
  type LibraryCollection,
} from "./model.ts";
type SourceRelease = {
  archives: { id: string; provider: string; manifestHash: string }[];
};
type Row = Record<string, unknown>;
type Execute = (query: SQL) => Promise<{ rows: Row[] }>;
const string = (value: unknown) => (typeof value === "string" ? value : "");
function credit(row: Row, payload?: Row): LibraryCredit {
  const manifest = row.manifest as Row;
  const germanId = string(payload?.germanId);
  return {
    label: string(payload?.title) || string(row.title),
    url: germanId
      ? `https://tatoeba.org/en/sentences/show/${germanId}`
      : (safeLibraryUrl(payload?.revisionUrl ?? payload?.sourceUrl) ??
        string(manifest.sourceUrl)),
    license: string(manifest.licenseClaim),
    licenseUrl: string(manifest.licenseUrl),
    attribution: string(payload?.attribution) || string(manifest.attribution),
  };
}
function project(row: Row): LibraryItem {
  const payload = row.payload as Row;
  const german =
    (row.kind === "activity" ? string(payload.title) : "") ||
    string(row.german) ||
    string(payload.title_de) ||
    string(payload.title) ||
    string(payload.reference_code) ||
    string(payload.topic) ||
    safeLibraryUrl(payload.url) ||
    string(row.item_key);
  return {
    id: Number(row.id),
    kind: row.kind as LibraryItem["kind"],
    key: string(row.item_key),
    collection: string(row.provider),
    german,
    english: string(row.english),
    topic: string(row.topic) || string(payload.topic_en) || null,
    chapter:
      row.chapter == null
        ? row.kind === "chapter"
          ? Number(payload.chapter_number)
          : null
        : Number(row.chapter),
    page: row.page == null ? null : Number(row.page),
    listType: string(row.list_type) || null,
    article: string(payload.article) || null,
    headword: string(payload.headword) || null,
    plural: string(payload.plural_notation) || null,
    text:
      (Array.isArray(payload.normalizedContent)
        ? payload.normalizedContent
            .filter((value) => typeof value === "string")
            .join("\n")
        : "") ||
      string(payload.raw_text) ||
      string(payload.source_excerpt) ||
      string(payload.sourceExcerpt) ||
      string(payload.outline_text) ||
      null,
    url: safeLibraryUrl(
      payload.reference_url ??
        payload.url ??
        payload.media_url ??
        payload.sourceUrl,
    ),
    source: credit(row, payload),
  };
}
export class LibraryRepository {
  private execute: Execute;
  private release: SourceRelease;
  constructor(execute: Execute, release: SourceRelease) {
    this.execute = execute;
    this.release = release;
  }
  private allowed() {
    return sql`(${sql.join(
      this.release.archives.map(
        (a) => sql`(a.id=${a.id} and a.manifest_hash=${a.manifestHash})`,
      ),
      sql` or `,
    )})`;
  }
  async overview(): Promise<LibraryOverview> {
    const { rows } = await this.execute(
      sql`select a.id,a.provider,a.title,a.manifest from content_intake.archives a where a.state='complete' and ${this.allowed()} order by a.provider`,
    );
    const collections: LibraryCollection[] = rows.map((row) => {
      const counts = Object.fromEntries(
        Object.entries(
          (row.manifest as Row).counts as Record<string, number>,
        ).filter(([kind]) =>
          libraryKinds.includes(kind as (typeof libraryKinds)[number]),
        ),
      );
      return {
        id: string(row.id),
        provider: string(row.provider),
        title: string(row.title),
        counts,
        total: Object.values(counts).reduce((sum, n) => sum + n, 0),
        source: credit(row),
      };
    });
    const chapters = await this.list({
      collection: "deutsch_im_blick",
      kind: "chapter",
      q: "",
      length: "all",
    });
    return {
      collections,
      words: collections.reduce((n, c) => n + (c.counts.vocabulary ?? 0), 0),
      sentences: collections.reduce(
        (n, c) => n + (c.counts.sentence_pair ?? 0),
        0,
      ),
      chapters: chapters.items,
      available: rows.length === this.release.archives.length,
    };
  }
  async list(input: LibraryQuery): Promise<LibraryPage> {
    const words = sql`array_length(regexp_split_to_array(btrim(i.german), '[[:space:]]+'),1)`;
    const { rows } = await this
      .execute(sql`select i.id,i.kind,i.item_key,i.chapter,i.page,left(i.german,1000) as german,i.english,i.topic,i.list_type,
      i.payload-'raw_text'-'raw_intro_text'-'outline_text'-'learning_goals'-'source_excerpt'-'sourceExcerpt' as payload,a.provider,a.title,a.manifest
      from content_intake.items i join content_intake.archives a on a.id=i.archive_id and a.state='complete'
      where ${this.allowed()} and a.provider=${input.collection} and i.kind=${input.kind}
      ${input.chapter ? sql`and i.chapter=${input.chapter}` : sql``}
      ${input.list ? sql`and i.list_type=${input.list}` : sql``}
      ${input.q ? sql`and to_tsvector('simple',coalesce(i.german,'') || ' ' || coalesce(i.english,'')) @@ plainto_tsquery('simple',${input.q})` : sql``}
      ${input.cursor ? sql`and i.id>${input.cursor}` : sql``}
      ${input.length === "short" ? sql`and ${words}<=6` : input.length === "medium" ? sql`and ${words} between 7 and 12` : input.length === "long" ? sql`and ${words}>12` : sql``}
      order by i.id limit 25`);
    const items = rows.slice(0, 24).map(project);
    return { items, nextCursor: rows.length > 24 ? items.at(-1)!.id : null };
  }
  async detail(id: number): Promise<LibraryItem> {
    const { rows } = await this
      .execute(sql`select i.id,i.kind,i.item_key,i.chapter,i.page,i.german,i.english,i.topic,i.list_type,i.payload,a.provider,a.title,a.manifest
      from content_intake.items i join content_intake.archives a on a.id=i.archive_id and a.state='complete'
      where i.id=${id} and ${this.allowed()} and i.kind in (${sql.join(
        libraryKinds.map((k) => sql`${k}`),
        sql`, `,
      )})`);
    if (!rows.length)
      throw new ContentError("This source item is not available.", 404);
    return project(rows[0]);
  }
}
