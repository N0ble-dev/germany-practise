import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PgDialect } from "drizzle-orm/pg-core";
import { type SQL } from "drizzle-orm";
import { IntakeRepository } from "@/lib/content-intake/repository";
import { contentHash } from "@/lib/content-pipeline/hash";
import { intakeReviewCategories } from "@/lib/content-intake/constants";
import {
  correctedEntrySchema,
  type IntakeItem,
  type CorrectedEntry,
} from "@/lib/content-intake/model";
import { intakeConnection } from "@/lib/content-intake/branch";
import { parseCsv, dibItem } from "../../scripts/content/resource-files";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ execute: vi.fn(), session: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  isCloudConfigured: () => true,
  getAuth: () => ({ getSession: mocks.session }),
}));
vi.mock("@/lib/content-intake/server", () => ({
  intakeRepository: () => new IntakeRepository((query) => mocks.execute(query)),
}));
import { GET, POST } from "@/app/api/admin/content/imports/route";
let postgres: PGlite;
const dialect = new PgDialect(),
  repository = new IntakeRepository((query) => mocks.execute(query));
const actor = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Fixture editor",
  email: "editor@example.test",
  emailVerified: true,
};
const origin = "http://localhost:3008";
function archive() {
  const provider = "deutsch_im_blick" as const,
    title = "Local test source",
    expectedCount = 3,
    manifest = {
      schemaVersion: 1 as const,
      sourceUrl: "https://example.test/book",
      licenseClaim: "CC-BY-4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      attribution: "Local synthetic test fixture",
      counts: { vocabulary: 2, source_page: 1 },
      files: [],
      notes: ["No real approvals or learner records."],
    };
  return {
    id: "fixture-source",
    provider,
    title,
    expectedCount,
    manifest,
    manifestHash: contentHash({ provider, title, expectedCount, manifest }),
  };
}
function items(): IntakeItem[] {
  return [
    dibItem("vocabulary", {
      id: "word-1",
      source_id: "fixture",
      chapter_id: 1,
      page_number: 18,
      list_type: "core",
      german: "Hallo!",
      english: "Hello!",
      topic_de: "Greetings",
    }),
    dibItem("vocabulary", {
      id: "word-2",
      source_id: "fixture",
      chapter_id: 1,
      page_number: 18,
      list_type: "expanded",
      german: "der Bahnhof",
      english: "station",
      topic_de: "Travel",
    }),
    dibItem("source_pages", {
      source_id: "fixture",
      chapter_id: 1,
      page_number: 18,
      raw_text: "Hallo! Hello! der Bahnhof station",
      text_quality: "fixture",
    }),
  ];
}
const entry: CorrectedEntry = {
  kind: "vocabulary",
  german: "Hallo!",
  english: "Hello!",
  arabic: "مرحبًا",
  cefr: "A1",
  targetLesson: "a1-1-l01",
  topic: "Greetings",
  context: "Greeting a classmate.",
  partOfSpeech: "phrase",
  article: null,
  plural: null,
  pluralKind: "not_used",
  modifications: "Added a reviewed Arabic draft and scene.",
  rightsNotes: "Synthetic own content in local tests only.",
};
async function ready() {
  await repository.importArchive(archive());
  await repository.importBatch("fixture-source", items());
  await repository.completeArchive("fixture-source");
  return (
    await repository.list({ archiveId: "fixture-source", kind: "vocabulary" })
  ).items.find((item) => item.key === "word-1")!;
}
beforeAll(async () => {
  postgres = new PGlite();
  await postgres.exec(
    'create schema neon_auth;create table neon_auth."user"(id uuid primary key);',
  );
  const journal = JSON.parse(
    readFileSync("drizzle/neon/meta/_journal.json", "utf8"),
  );
  for (const step of journal.entries)
    await postgres.exec(readFileSync(`drizzle/neon/${step.tag}.sql`, "utf8"));
}, 30000);
beforeEach(async () => {
  await postgres.exec("truncate content_intake.archives cascade;");
  mocks.execute.mockImplementation((query: SQL) => {
    const q = dialect.sqlToQuery(query);
    return postgres.query(q.sql, q.params);
  });
  mocks.session.mockResolvedValue({ data: { user: actor }, error: null });
  vi.stubEnv("APP_URL", origin);
  for (const role of [
    "author",
    ...intakeReviewCategories,
    "publisher",
    "audio",
  ])
    vi.stubEnv(`CONTENT_${role.toUpperCase()}_EMAILS`, actor.email);
});
afterAll(async () => {
  vi.unstubAllEnvs();
  await postgres.close();
});
describe("isolated source ingestion", () => {
  it("imports idempotently, keeps partial archives hidden and completes only with exact counts", async () => {
    await repository.importArchive(archive());
    await repository.importBatch("fixture-source", items().slice(0, 1));
    expect(
      (
        await repository.list({
          archiveId: "fixture-source",
          kind: "vocabulary",
        })
      ).items,
    ).toEqual([]);
    await expect(
      repository.completeArchive("fixture-source"),
    ).rejects.toMatchObject({ status: 409 });
    await repository.importBatch("fixture-source", items());
    await repository.completeArchive("fixture-source");
    await repository.importArchive(archive());
    await repository.importBatch("fixture-source", items());
    await repository.completeArchive("fixture-source");
    expect(
      (
        await postgres.query<{ n: number }>(
          "select count(*)::int as n from content_intake.items",
        )
      ).rows[0].n,
    ).toBe(3);
    expect(
      (
        await repository.list({
          archiveId: "fixture-source",
          kind: "vocabulary",
        })
      ).items,
    ).toHaveLength(2);
  });
  it("rejects changed archive and item evidence before writing unrelated rows in a batch", async () => {
    await repository.importArchive(archive());
    await repository.importBatch("fixture-source", items().slice(0, 1));
    const changed = items()[0];
    changed.payload.german = "Changed";
    changed.hash = contentHash(changed.payload);
    await expect(
      repository.importBatch("fixture-source", [changed, items()[1]]),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (
        await postgres.query<{ n: number }>(
          "select count(*)::int as n from content_intake.items",
        )
      ).rows[0].n,
    ).toBe(1);
    const different = archive();
    different.title = "Different";
    different.manifestHash = contentHash({
      provider: different.provider,
      title: different.title,
      manifest: different.manifest,
      expectedCount: different.expectedCount,
    });
    await expect(repository.importArchive(different)).rejects.toMatchObject({
      status: 409,
    });
    await expect(
      postgres.exec("update content_intake.items set payload='{}';"),
    ).rejects.toThrow(/immutable/);
  });
  it("supports chapter/list filters, full-text search and source-page lookup without learner rows", async () => {
    const word = await ready();
    expect(
      (
        await repository.list({
          archiveId: "fixture-source",
          kind: "vocabulary",
          query: "Bahnhof",
          listType: "expanded",
          chapter: 1,
        })
      ).items,
    ).toHaveLength(1);
    expect(
      (
        await repository.list({
          archiveId: "fixture-source",
          kind: "vocabulary",
          query: "%",
        })
      ).items,
    ).toHaveLength(0);
    const detail = await repository.detail(word.id);
    expect(detail.sourcePage?.page).toBe(18);
    expect(detail.sourcePage?.text).toContain("Hallo!");
    expect(detail.draft).toBeNull();
    expect(
      (
        await postgres.query<{ n: number }>(
          "select count(*)::int as n from lesson_versions",
        )
      ).rows[0].n,
    ).toBe(0);
  });
  it("creates immutable corrected revisions with CAS and hash-bound approvals that cannot survive an edit", async () => {
    const word = await ready(),
      first = await repository.saveDraft(actor, word.id, word.hash, 0, entry);
    for (const category of intakeReviewCategories)
      await repository.review(
        actor,
        first.draft!.id,
        first.draft!.contentHash,
        category,
        "approved",
        "Local fixture approval.",
      );
    expect((await repository.detail(word.id)).draft?.blockers).toEqual([]);
    await repository.review(
      actor,
      first.draft!.id,
      first.draft!.contentHash,
      "language",
      "changes_requested",
      "Correction needed.",
    );
    expect((await repository.detail(word.id)).draft?.blockers).toContain(
      "language: human approval required for this exact draft.",
    );
    const second = await repository.saveDraft(actor, word.id, word.hash, 1, {
      ...entry,
      german: "Guten Tag!",
    });
    expect(second.draft?.reviews).toEqual([]);
    expect(second.draft?.version).toBe(2);
    await expect(
      repository.saveDraft(actor, word.id, word.hash, 1, entry),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      repository.review(
        actor,
        first.draft!.id,
        first.draft!.contentHash,
        "rights",
        "approved",
        "Stale",
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      postgres.exec("update content_intake.drafts set content='{}';"),
    ).rejects.toThrow(/immutable/);
    await expect(
      postgres.exec("delete from content_intake.reviews;"),
    ).rejects.toThrow(/append-only/);
    expect(second.item.payload.german).toBe("Hallo!");
  });
  it("paginates with stable IDs and excludes source corruption and malformed typed drafts", async () => {
    const word = await ready();
    const first = (
      await repository.list({ archiveId: "fixture-source", kind: "vocabulary" })
    ).items[0];
    const page = await repository.list({
      archiveId: "fixture-source",
      kind: "vocabulary",
      cursor: first.id,
    });
    expect(page.items).toHaveLength(1);
    expect(
      correctedEntrySchema.safeParse({
        ...entry,
        partOfSpeech: "noun",
        article: null,
      }).success,
    ).toBe(false);
    await expect(
      repository.saveDraft(actor, word.id, "0".repeat(64), 0, entry),
    ).rejects.toMatchObject({ status: 409 });
  });
});
describe("branch and format guards", () => {
  it("requires explicit review endpoint and refuses pooled/direct aliases of production", () => {
    const production = "postgresql://fixture:fixture@ep-prod.example/db",
      review = "postgresql://fixture:fixture@ep-dev.example/db";
    expect(
      intakeConnection({
        CONTENT_REVIEW_DATABASE_URL: review,
        CONTENT_PUBLICATION_DATABASE_URL: production,
        CONTENT_REVIEW_BRANCH_HOST: "ep-dev.example",
      }),
    ).toBe(review);
    expect(() =>
      intakeConnection({
        CONTENT_REVIEW_DATABASE_URL: production,
        CONTENT_PUBLICATION_DATABASE_URL: production.replace(
          "ep-prod.",
          "ep-prod-pooler.",
        ),
        CONTENT_REVIEW_BRANCH_HOST: "ep-prod.example",
      }),
    ).toThrow(/separate/);
    expect(() => intakeConnection({ DATABASE_URL: production })).toThrow(
      /Configure/,
    );
  });
  it("parses quoted multiline CSV without changing original content", () => {
    expect(
      parseCsv(
        'de,en\r\n"Hallo, Welt","Hello\nworld"\r\n"Er sagt ""ja""",yes\r\n',
      ),
    ).toEqual([
      ["de", "en"],
      ["Hallo, Welt", "Hello\nworld"],
      ['Er sagt "ja"', "yes"],
    ]);
    expect(() => parseCsv('"Unclosed')).toThrow(/quotation/);
  });
});
describe("source editor APIs", () => {
  const request = (body: unknown, headers: Record<string, string> = {}) =>
    new Request(origin + "/api/admin/content/imports", {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        "X-Learning-Account": actor.id,
        ...headers,
      },
      body: JSON.stringify(body),
    });
  it("denies anonymous/unverified access, cross-origin writes, stale account and oversized bodies", async () => {
    mocks.session.mockResolvedValueOnce({ data: null, error: null });
    expect(
      (await GET(new Request(origin + "/api/admin/content/imports"))).status,
    ).toBe(401);
    mocks.session.mockResolvedValueOnce({
      data: { user: { ...actor, emailVerified: false } },
      error: null,
    });
    expect(
      (await GET(new Request(origin + "/api/admin/content/imports"))).status,
    ).toBe(403);
    expect(
      (await POST(request({}, { Origin: "https://evil.test" }))).status,
    ).toBe(403);
    expect(
      (await POST(request({}, { "X-Learning-Account": "different" }))).status,
    ).toBe(409);
    expect((await POST(request({ padding: "x".repeat(97000) }))).status).toBe(
      413,
    );
  });
  it("validates actual course/level mapping and enforces author and reviewer roles", async () => {
    const word = await ready(),
      action = {
        action: "save_draft",
        itemId: word.id,
        sourceHash: word.hash,
        expectedVersion: 0,
        entry,
      };
    expect(
      (await POST(request({ ...action, entry: { ...entry, cefr: "C2" } })))
        .status,
    ).toBe(400);
    vi.stubEnv("CONTENT_AUTHOR_EMAILS", "");
    expect((await POST(request(action))).status).toBe(403);
    vi.stubEnv("CONTENT_AUTHOR_EMAILS", actor.email);
    const saved = await POST(request(action));
    expect(saved.status).toBe(200);
    const detail = await saved.json();
    vi.stubEnv("CONTENT_RIGHTS_EMAILS", "");
    expect(
      (
        await POST(
          request({
            action: "review",
            draftId: detail.draft.id,
            contentHash: detail.draft.contentHash,
            category: "rights",
            decision: "approved",
            comment: "Reviewed",
          }),
        )
      ).status,
    ).toBe(403);
    const read = await GET(
      new Request(origin + `/api/admin/content/imports?item=${word.id}`),
    );
    expect(read.headers.get("Cache-Control")).toContain("no-store");
  });
});
