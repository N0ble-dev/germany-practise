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
import { sql, type SQL } from "drizzle-orm";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ execute: vi.fn(), session: vi.fn() }));
vi.mock("@/db", () => ({ getDb: () => ({ execute: mocks.execute }) }));
vi.mock("@/lib/auth", () => ({
  isCloudConfigured: () => true,
  getAuth: () => ({ getSession: mocks.session }),
}));
import { ContentRepository } from "@/lib/content-pipeline/repository";
import { factoryEvidence } from "@/lib/content-factory/repository";
import { reviewCategories } from "@/lib/content-pipeline/model";
import { contentHash } from "@/lib/content-pipeline/hash";
import { inspectWav } from "@/lib/content-pipeline/audio";
import {
  completePack,
  pilotPack,
  recordingBytes,
} from "../fixtures/content-pack";
import { GET, POST } from "@/app/api/admin/content/route";
import { GET as catalog } from "@/app/api/catalog/route";
const actor = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Fixture reviewer",
  email: "reviewer@example.test",
  emailVerified: true,
};
let postgres: PGlite;
const dialect = new PgDialect();
const repository = new ContentRepository((query) => mocks.execute(query));
const origin = "http://localhost:3008";
const request = (body?: unknown) =>
  new Request(origin + "/api/admin/content", {
    method: body ? "POST" : "GET",
    headers: { Origin: origin, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
beforeAll(async () => {
  postgres = new PGlite();
  await postgres.exec(
    'create schema neon_auth;create table neon_auth."user" (id uuid primary key);',
  );
  const journal = JSON.parse(
    readFileSync("drizzle/neon/meta/_journal.json", "utf8"),
  );
  for (const entry of journal.entries)
    await postgres.exec(readFileSync(`drizzle/neon/${entry.tag}.sql`, "utf8"));
}, 30000);
beforeEach(async () => {
  await postgres.exec("truncate courses cascade;");
  mocks.execute.mockImplementation((query: SQL) => {
    const compiled = dialect.sqlToQuery(query);
    return postgres.query(compiled.sql, compiled.params);
  });
  mocks.session.mockResolvedValue({ data: { user: actor }, error: null });
  vi.stubEnv("APP_URL", origin);
  for (const role of ["author", ...reviewCategories, "publisher"])
    vi.stubEnv(`CONTENT_${role.toUpperCase()}_EMAILS`, actor.email);
});
afterAll(async () => {
  await postgres.close();
  vi.unstubAllEnvs();
});
async function approve(version = 1) {
  const pack = completePack(version);
  await repository.importDraft(pack);
  const hash = contentHash(pack);
  for (const asset of pack.media)
    await repository.verifyMedia(
      pack.id,
      version,
      hash,
      asset.id,
      inspectWav(recordingBytes()),
    );
  for (const category of reviewCategories)
    await repository.review(
      actor,
      pack.id,
      version,
      hash,
      category,
      "approved",
      "Synthetic fixture approval, local test only.",
    );
  return { pack, hash };
}
describe("real PostgreSQL content storage and publication", () => {
  it("loads latest factory evidence in one query while preserving an older effective publication and newest rejection", async () => {
    const first = await approve();
    await repository.publish(actor.id, first.pack.id, 1, first.hash);
    const second = completePack(2);
    await repository.importDraft(second);
    await repository.review(
      actor,
      second.id,
      2,
      contentHash(second),
      "language",
      "approved",
      "Initial check.",
    );
    await repository.review(
      actor,
      second.id,
      2,
      contentHash(second),
      "language",
      "changes_requested",
      "Latest correction required.",
    );
    mocks.execute.mockClear();
    const evidence = await factoryEvidence(
      (query) => mocks.execute(query),
      [first.pack.id],
    );
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    expect(evidence).toHaveLength(2);
    expect(evidence.find((e) => e.pack.version === 1)?.published).toBe(true);
    const latest = evidence.find((e) => e.pack.version === 2)!;
    expect(latest.published).toBe(false);
    expect(latest.reviews).toHaveLength(1);
    expect(latest.reviews[0].decision).toBe("changes_requested");
    await repository.review(
      actor,
      first.pack.id,
      1,
      first.hash,
      "rights",
      "changes_requested",
      "Rights withdrawn.",
    );
    expect(
      (
        await factoryEvidence((query) => mocks.execute(query), [first.pack.id])
      ).some((e) => e.published),
    ).toBe(false);
  });
  it("imports idempotently, rejects same-version edits and protects immutability in SQL", async () => {
    const pack = pilotPack();
    const result = await repository.importDraft(pack);
    expect(await repository.importDraft(pack)).toEqual(result);
    pack.title.en += " changed";
    await expect(repository.importDraft(pack)).rejects.toMatchObject({
      status: 409,
    });
    expect((await repository.list()).length).toBe(1);
    await expect(
      postgres.exec("update lesson_versions set content_hash='modified';"),
    ).rejects.toThrow(/immutable/);
  });
  it("keeps drafts private, publishes a completely reviewed version and withdraws rejected content", async () => {
    await repository.importDraft(pilotPack());
    expect(await repository.published()).toEqual([]);
    await expect(
      repository.publish(actor.id, "a1-1-l01", 1, contentHash(pilotPack())),
    ).rejects.toMatchObject({ status: 409 });
    await postgres.exec("truncate courses cascade;");
    const { pack, hash } = await approve();
    expect((await repository.detail(pack.id, 1)).blockers).toEqual([]);
    await repository.publish(actor.id, pack.id, 1, hash);
    expect((await repository.published())[0].pack.title).toEqual(pack.title);
    await repository.review(
      actor,
      pack.id,
      1,
      hash,
      "language",
      "changes_requested",
      "A correction is required.",
    );
    expect(await repository.published()).toEqual([]);
    await expect(
      postgres.exec("update content_reviews set comment='rewrite';"),
    ).rejects.toThrow(/append-only/);
  });
  it("keeps new versions unapproved and supports rollback to an earlier reviewed version", async () => {
    const first = await approve();
    await repository.publish(actor.id, first.pack.id, 1, first.hash);
    const second = completePack(2);
    second.title.en += " revised";
    await repository.importDraft(second);
    expect((await repository.detail(second.id, 2)).reviews).toEqual([]);
    expect((await repository.published())[0].version).toBe(1);
    await expect(
      repository.publish(actor.id, second.id, 2, contentHash(second)),
    ).rejects.toMatchObject({ status: 409 });
    for (const asset of second.media)
      await repository.verifyMedia(
        second.id,
        2,
        contentHash(second),
        asset.id,
        inspectWav(recordingBytes()),
      );
    for (const category of reviewCategories)
      await repository.review(
        actor,
        second.id,
        2,
        contentHash(second),
        category,
        "approved",
        "Test approval.",
      );
    await repository.publish(actor.id, second.id, 2, contentHash(second));
    expect((await repository.published())[0].version).toBe(2);
    await repository.publish(actor.id, first.pack.id, 1, first.hash);
    expect((await repository.published())[0].version).toBe(1);
    expect(
      (
        await postgres.query<{ n: number }>(
          "select count(*)::int as n from content_publication_events",
        )
      ).rows[0].n,
    ).toBe(3);
  });
  it("enforces unpublished prerequisites and does not expose a manually pointed draft", async () => {
    const { pack, hash } = await approve();
    pack.prerequisites = ["missing-lesson"];
    pack.version = 2;
    pack.media = [];
    for (const line of pack.dialogues[0].lines) line.audioKey = null;
    await repository.importDraft(pack);
    await expect(
      repository.publish(actor.id, pack.id, 2, contentHash(pack)),
    ).rejects.toMatchObject({ status: 409 });
    await mocks.execute(
      sql`insert into course_publications (course_id,lesson_key,published_version_id) select course_id,lesson_key,id from lesson_versions where version=2`,
    );
    expect(await repository.published()).toEqual([]);
    expect(hash).toBeTruthy();
  });
  it("protects admin APIs by verified identity, roles, origin and version hash", async () => {
    mocks.session.mockResolvedValue({ data: null, error: null });
    expect((await GET(request())).status).toBe(401);
    mocks.session.mockResolvedValue({
      data: { user: { ...actor, emailVerified: false } },
      error: null,
    });
    expect((await GET(request())).status).toBe(403);
    mocks.session.mockResolvedValue({ data: { user: actor }, error: null });
    vi.stubEnv("CONTENT_AUTHOR_EMAILS", "");
    expect(
      (await POST(request({ action: "import", pack: pilotPack() }))).status,
    ).toBe(403);
    vi.stubEnv("CONTENT_AUTHOR_EMAILS", actor.email);
    const cross = request({ action: "import", pack: pilotPack() });
    cross.headers.set("Origin", "https://evil.example");
    expect((await POST(cross)).status).toBe(403);
    expect(
      (await POST(request({ action: "import", pack: pilotPack() }))).status,
    ).toBe(200);
    expect(
      (
        await POST(
          request({
            action: "review",
            lessonKey: "a1-1-l01",
            version: 1,
            contentHash: "f".repeat(64),
            category: "language",
            decision: "approved",
            comment: "Wrong hash",
          }),
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await POST(
          request({
            action: "review",
            lessonKey: "a1-1-l01",
            version: 1,
            contentHash: contentHash(pilotPack()),
            category: "audio",
            decision: "approved",
            comment: "No recordings",
          }),
        )
      ).status,
    ).toBe(409);
  });
  it("serves the catalog without consulting a session, returning no drafts", async () => {
    await repository.importDraft(pilotPack());
    mocks.session.mockClear();
    const response = await catalog(new Request(origin + "/api/catalog"));
    expect(await response.json()).toEqual({ lessons: [] });
    expect(mocks.session).not.toHaveBeenCalled();
  });
  it("promotes original review evidence idempotently and preserves a later production rejection", async () => {
    const first = await approve();
    const source = await repository.detail(first.pack.id, 1);
    await postgres.exec("truncate courses cascade;");
    await repository.importDraft(first.pack);
    for (const evidence of source.reviews) {
      await repository.importReviewEvidence(first.pack.id, 1, evidence);
      await repository.importReviewEvidence(first.pack.id, 1, evidence);
    }
    const copied = await repository.detail(first.pack.id, 1);
    expect(copied.reviews).toHaveLength(5);
    expect(copied.reviews[0].reviewerId).toBe(actor.id);
    await repository.review(
      actor,
      first.pack.id,
      1,
      first.hash,
      "language",
      "changes_requested",
      "Production issue reported.",
    );
    for (const evidence of source.reviews)
      await repository.importReviewEvidence(first.pack.id, 1, evidence);
    await expect(
      repository.publish(actor.id, first.pack.id, 1, first.hash),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (await repository.detail(first.pack.id, 1)).blockers.some((b) =>
        b.startsWith("language:"),
      ),
    ).toBe(true);
  });
  it("accepts an explicit human audio approval after actual file verification", async () => {
    const pack = completePack();
    await repository.importDraft(pack);
    const hash = contentHash(pack);
    for (const asset of pack.media)
      await repository.verifyMedia(
        pack.id,
        1,
        hash,
        asset.id,
        inspectWav(recordingBytes()),
      );
    const response = await POST(
      request({
        action: "review",
        lessonKey: pack.id,
        version: 1,
        contentHash: hash,
        category: "audio",
        decision: "approved",
        comment: "Synthetic fixture listening review.",
      }),
    );
    expect(response.status).toBe(200);
    expect((await repository.detail(pack.id, 1)).reviews.at(-1)?.category).toBe(
      "audio",
    );
  });
});
