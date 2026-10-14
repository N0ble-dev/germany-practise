import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PgDialect } from "drizzle-orm/pg-core";
import { LibraryRepository } from "@/lib/library/repository";
import {
  libraryBookmarkSchema,
  libraryQuerySchema,
  recallText,
} from "@/lib/library/model";
import { IntakeRepository } from "@/lib/content-intake/repository";
import { contentHash } from "@/lib/content-pipeline/hash";
import { stateSchema, wordSchema } from "@/lib/learning";
import { initialState } from "@/lib/content";
import { buildLearningReport } from "@/lib/learning-report";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ repository: vi.fn() }));
vi.mock("@/lib/library/server", () => ({
  libraryRepository: mocks.repository,
}));
import { GET } from "@/app/api/library/route";
let database: PGlite, library: LibraryRepository;
const dialect = new PgDialect();
function makeArchive(
  id: string,
  provider: "deutsch_im_blick" | "tatoeba",
  counts: Record<string, number>,
) {
  const title = "Synthetic local source",
    expectedCount = Object.values(counts).reduce((n, v) => n + v, 0);
  const manifest = {
    schemaVersion: 1 as const,
    sourceUrl: "https://example.test/source",
    licenseClaim: "CC-BY-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    attribution: "Synthetic local fixture author",
    counts,
    files: [],
    notes: [],
  };
  return {
    id,
    provider,
    title,
    manifest,
    expectedCount,
    manifestHash: contentHash({ provider, title, manifest, expectedCount }),
  };
}
function item(
  kind:
    "vocabulary" | "sentence_pair" | "quarantine" | "source_page" | "chapter",
  key: string,
  german: string,
  english: string,
  payload: Record<string, unknown> = {},
) {
  return {
    kind,
    key,
    german,
    english,
    payload,
    hash: contentHash(payload),
    chapter: kind === "sentence_pair" || kind === "quarantine" ? null : 1,
    page: 18,
    topic: null,
    listType: kind === "vocabulary" ? "core" : null,
  };
}
beforeAll(async () => {
  database = new PGlite();
  await database.exec(
    readFileSync("drizzle/neon/0007_content_intake.sql", "utf8"),
  );
  const run = (query: import("drizzle-orm").SQL) => {
    const q = dialect.sqlToQuery(query);
    return database.query<Record<string, unknown>>(q.sql, q.params);
  };
  const intake = new IntakeRepository(run);
  const book = makeArchive("fixture-book", "deutsch_im_blick", {
    vocabulary: 1,
    source_page: 1,
    chapter: 1,
  });
  const sentences = makeArchive("fixture-sentences", "tatoeba", {
    sentence_pair: 30,
    quarantine: 1,
  });
  const privateArchive = makeArchive(
    "not-in-public-release",
    "deutsch_im_blick",
    { vocabulary: 1 },
  );
  for (const archive of [book, sentences, privateArchive])
    await intake.importArchive(archive);
  await intake.importBatch(book.id, [
    item("vocabulary", "window", "das Fenster", "window", {
      headword: "Fenster",
      article: "das",
      plural_notation: "-",
      reviewer_email: "must-not-be-public@example.test",
    }),
    item("chapter", "1", "Chapter one", "", { title_de: "Chapter one" }),
    item("source_page", "page-18", "Original page text. ".repeat(1000), "", {
      raw_text: "Original page text. ".repeat(1000),
    }),
  ]);
  await intake.importBatch(sentences.id, [
    ...Array.from({ length: 30 }, (_, n) =>
      item(
        "sentence_pair",
        `pair-${n}`,
        n === 29
          ? "Ich arbeite heute mit einem neuen Team in Berlin."
          : `Ich arbeite. ${n}`,
        "I work.",
        {
          germanId: String(n + 1),
          germanAuthor: "German author",
          englishAuthor: "English author",
          attribution: "German author & English author / Tatoeba",
          arabic: null,
        },
      ),
    ),
    item("quarantine", "quarantine", "not public", "", {
      rawRow: "bad private row",
    }),
  ]);
  await intake.importBatch(privateArchive.id, [
    item("vocabulary", "private", "private source", "private source"),
  ]);
  for (const archive of [book, sentences, privateArchive])
    await intake.completeArchive(archive.id);
  library = new LibraryRepository(run, {
    archives: [book, sentences].map(({ id, provider, manifestHash }) => ({
      id,
      provider,
      manifestHash,
    })),
  });
  mocks.repository.mockReturnValue(library);
}, 30000);
afterAll(async () => database.close());
describe("public source library", () => {
  it("shows exact complete source counts and keeps editorial fields out of the public projection", async () => {
    const overview = await library.overview();
    expect(overview).toMatchObject({
      available: true,
      words: 1,
      sentences: 30,
    });
    expect(overview.chapters).toHaveLength(1);
    expect(overview.collections.map((c) => c.id)).not.toContain(
      "not-in-public-release",
    );
    const words = await library.list(libraryQuerySchema.parse({}));
    expect(words.items[0]).toMatchObject({
      german: "das Fenster",
      headword: "Fenster",
      article: "das",
      source: { attribution: "Synthetic local fixture author" },
    });
    expect(JSON.stringify(words)).not.toContain("reviewer_email");
    expect(words.items[0]).not.toHaveProperty("cefr");
  });
  it("supports stable pagination, full-text search and honest length filters without labeling CEFR", async () => {
    const query = libraryQuerySchema.parse({
      collection: "tatoeba",
      kind: "sentence_pair",
      q: "work",
    });
    const first = await library.list(query),
      second = await library.list({ ...query, cursor: first.nextCursor! });
    expect(first.items).toHaveLength(24);
    expect(second.items).toHaveLength(6);
    expect(
      new Set([...first.items, ...second.items].map((item) => item.id)).size,
    ).toBe(30);
    expect(
      (await library.list({ ...query, length: "long" })).items,
    ).toHaveLength(0);
    expect(
      (await library.list({ ...query, length: "medium" })).items,
    ).toHaveLength(1);
    expect(
      (await library.list({ ...query, length: "short" })).items,
    ).toHaveLength(24);
    expect(
      (await library.list({ ...query, q: "no-such-token" })).items,
    ).toEqual([]);
  });
  it("preserves full supplied page text in details, bounds listing previews, and excludes quarantine and unpublished archives", async () => {
    const pages = await library.list(
      libraryQuerySchema.parse({ kind: "source_page" }),
    );
    expect(pages.items[0].german.length).toBe(1000);
    expect(pages.items[0].text).toBeNull();
    expect(
      (await library.detail(pages.items[0].id)).text!.length,
    ).toBeGreaterThan(10000);
    const blocked = await database.query<{ id: number }>(
      "select id from content_intake.items where kind='quarantine' or archive_id='not-in-public-release'",
    );
    for (const row of blocked.rows)
      await expect(library.detail(Number(row.id))).rejects.toMatchObject({
        status: 404,
      });
  });
  it("serves anonymous bounded reads without exposing user data and rejects invalid filters", async () => {
    const response = await GET(
      new Request(
        "https://example.test/api/library?collection=tatoeba&kind=sentence_pair",
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("public");
    expect((await response.json()).items).toHaveLength(24);
    expect(
      (
        await GET(
          new Request("https://example.test/api/library?kind=quarantine"),
        )
      ).status,
    ).toBe(400);
    expect(
      (await GET(new Request("https://example.test/api/library?item=-1")))
        .status,
    ).toBe(400);
  });
  it("keeps legacy learning backups valid and preserves new source credits and private bookmarks", async () => {
    const word = (await library.list(libraryQuerySchema.parse({}))).items[0];
    const state = initialState();
    const saved = libraryBookmarkSchema.parse({
      id: word.id,
      german: word.german,
      english: word.english,
      source: word.source,
    });
    const parsed = stateSchema.parse({ ...state, libraryBookmarks: [saved] });
    expect(parsed.libraryBookmarks?.[0].source.attribution).toBe(
      word.source.attribution,
    );
    const report = buildLearningReport(parsed, "Fixture learner", [
      "sentences",
    ]);
    expect(report.sections[0].entries[0].lines).toContain(
      word.source.attribution,
    );
    expect(stateSchema.parse(state).xp).toBe(0);
    expect(
      wordSchema.parse({ ...state.words[0], source: word.source }).source,
    ).toEqual(word.source);
    expect(
      libraryBookmarkSchema.safeParse({
        ...saved,
        source: { ...saved.source, url: "javascript:alert(1)" },
      }).success,
    ).toBe(false);
    expect(recallText("  Ich arbeite! ")).toBe("ich arbeite");
    expect(recallText("schön")).not.toBe(recallText("schon"));
  });
});
