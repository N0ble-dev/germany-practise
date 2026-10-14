import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ execute: vi.fn(), session: vi.fn() }));
vi.mock("@/db", () => ({ getDb: () => ({ execute: mocks.execute }) }));
vi.mock("@/lib/auth", () => ({
  isCloudConfigured: () => true,
  getAuth: () => ({ getSession: mocks.session }),
}));
import { CommunityRepository } from "@/lib/community-repository";
import {
  editPublicSentenceSchema,
  publishSentencesSchema,
  signatureDrawingSchema,
} from "@/lib/community-model";
import { GET as feedRoute } from "@/app/api/community/sentences/route";
import {
  GET as mineRoute,
  POST as publishRoute,
} from "@/app/api/community/mine/route";
import {
  DELETE as removeRoute,
  PATCH as editRoute,
} from "@/app/api/community/mine/[postId]/route";
const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  origin = "http://localhost:3008";
const input = (
  sentences = ["Ich lerne jeden Tag Deutsch."],
  signature = "Nabil",
) =>
  publishSentencesSchema.parse({
    sentences,
    signature,
    signatureStyle: "written",
    public: true,
  });
const request = (
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
) =>
  new Request(origin + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "X-Learning-Account": owner,
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
let db: PGlite;
const dialect = new PgDialect(),
  repo = new CommunityRepository((query) => mocks.execute(query));
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    'create schema neon_auth;create table neon_auth."user"(id uuid primary key);',
  );
  const journal = JSON.parse(
    readFileSync("drizzle/neon/meta/_journal.json", "utf8"),
  );
  for (const entry of journal.entries)
    await db.exec(readFileSync(`drizzle/neon/${entry.tag}.sql`, "utf8"));
  await db.query('insert into neon_auth."user" values ($1),($2)', [
    owner,
    other,
  ]);
}, 30000);
beforeEach(async () => {
  await db.exec("truncate public.sentence_posts;");
  mocks.execute.mockImplementation((query: SQL) => {
    const compiled = dialect.sqlToQuery(query);
    return db.query(compiled.sql, compiled.params);
  });
  mocks.session.mockResolvedValue({
    data: { user: { id: owner, name: "Nabil", email: "private@example.test" } },
    error: null,
  });
  vi.stubEnv("APP_URL", origin);
});
afterAll(async () => {
  await db.close();
  vi.unstubAllEnvs();
});

describe("Opt-in public sentence sharing", () => {
  it("saves real signature strokes in public copies and allows owned redraws", async () => {
    const drawing = signatureDrawingSchema.parse({
      aspectRatio: 3,
      strokes: [
        [
          { x: 0.1, y: 0.7 },
          { x: 0.2, y: 0.2 },
          { x: 0.35, y: 0.65 },
        ],
      ],
    });
    const payload = publishSentencesSchema.parse({
      ...input(),
      signatureStyle: "drawn",
      signatureDrawing: drawing,
    });
    const [post] = await repo.publish(owner, payload);
    expect(post.signatureDrawing).toEqual(drawing);
    expect((await repo.feed()).posts[0].signatureDrawing).toEqual(drawing);
    const changed = {
      ...drawing,
      strokes: [
        ...drawing.strokes,
        [
          { x: 0.4, y: 0.7 },
          { x: 0.6, y: 0.2 },
        ],
      ],
    };
    const [edited] = await repo.edit(
      owner,
      post.id,
      editPublicSentenceSchema.parse({
        german: post.german,
        signature: "Nabil",
        signatureStyle: "drawn",
        signatureDrawing: changed,
        revision: 0,
      }),
    );
    expect(edited.signatureDrawing?.strokes).toHaveLength(2);
    await expect(
      db.query("update sentence_posts set signature_drawing=null where id=$1", [
        post.id,
      ]),
    ).rejects.toThrow(/drawing_style/);
    const [typed] = await repo.edit(
      owner,
      post.id,
      editPublicSentenceSchema.parse({
        german: post.german,
        signature: "Nabil",
        signatureStyle: "clean",
        signatureDrawing: null,
        revision: 1,
      }),
    );
    expect(typed.signatureDrawing).toBeNull();
  });
  it("rejects invalid/oversized drawings, arbitrary SVG markup and mismatched signature styles", () => {
    const drawing = {
      aspectRatio: 3,
      strokes: [
        [
          { x: 0.1, y: 0.5 },
          { x: 0.5, y: 0.2 },
        ],
      ],
    };
    expect(signatureDrawingSchema.safeParse(drawing).success).toBe(true);
    for (const invalid of [
      { ...drawing, aspectRatio: Infinity },
      { ...drawing, strokes: [] },
      {
        ...drawing,
        strokes: [
          [
            { x: 2, y: 0.2 },
            { x: 0.2, y: 0.2 },
          ],
        ],
      },
      { ...drawing, svg: "<svg onload=alert(1)>" },
      {
        ...drawing,
        strokes: Array.from({ length: 3 }, () =>
          Array(800).fill({ x: 0.1, y: 0.2 }),
        ),
      },
    ])
      expect(signatureDrawingSchema.safeParse(invalid).success).toBe(false);
    expect(
      publishSentencesSchema.safeParse({ ...input(), signatureStyle: "drawn" })
        .success,
    ).toBe(false);
    expect(
      publishSentencesSchema.safeParse({
        ...input(),
        signatureDrawing: drawing,
      }).success,
    ).toBe(false);
  });
  it("publishes only selected sentence copies without changing private learning tables", async () => {
    await repo.publish(
      owner,
      input(["Ich lerne Deutsch.", "Ich trinke Kaffee."], "— Mein Name"),
    );
    const feed = await repo.feed();
    expect(feed.posts).toHaveLength(2);
    expect(feed.posts.map((post) => post.german).sort()).toEqual([
      "Ich lerne Deutsch.",
      "Ich trinke Kaffee.",
    ]);
    expect(Object.keys(feed.posts[0]).sort()).toEqual(
      [
        "createdAt",
        "german",
        "id",
        "signature",
        "signatureStyle",
        "signatureDrawing",
        "updatedAt",
      ].sort(),
    );
    expect(JSON.stringify(feed)).not.toMatch(
      /authorId|author_id|email|revision|savedSentences|private@example/,
    );
    const states = await db.query<{ count: number }>(
      "select count(*)::int as count from neon_learning_states",
    );
    expect(states.rows[0].count).toBe(0);
  });
  it("deduplicates retries without overwriting an existing signature and requires explicit consent", async () => {
    const first = await repo.publish(owner, input());
    const retry = await repo.publish(
      owner,
      input(undefined, "Another signature"),
    );
    expect(retry).toEqual(first);
    expect(
      publishSentencesSchema.safeParse({ ...input(), public: false }).success,
    ).toBe(false);
    expect(
      publishSentencesSchema.safeParse({ ...input(), sentences: ["a", " a "] })
        .success,
    ).toBe(false);
    expect(
      publishSentencesSchema.safeParse({ ...input(), authorId: other }).success,
    ).toBe(false);
    expect(
      publishSentencesSchema.safeParse({
        ...input(),
        sentences: Array(6).fill("Sentence"),
      }).success,
    ).toBe(false);
    expect(input(["  Scho\u0308n!  "], "  Learner  ").sentences).toEqual([
      "Schön!",
    ]);
  });
  it("protects edits/deletion by owner and revision and removes published content immediately", async () => {
    const [post] = await repo.publish(owner, input());
    const edit = editPublicSentenceSchema.parse({
      german: "Heute lerne ich Deutsch.",
      signature: "نَبيل",
      signatureStyle: "clean",
      revision: 0,
    });
    await expect(repo.edit(other, post.id, edit)).rejects.toThrow(/account/);
    await expect(repo.remove(other, post.id)).rejects.toThrow(/account/);
    const [updated] = await repo.edit(owner, post.id, edit);
    expect(updated).toMatchObject({
      german: edit.german,
      signature: "نَبيل",
      revision: 1,
    });
    await expect(repo.edit(owner, post.id, edit)).rejects.toThrow(/changed/);
    expect((await repo.feed()).posts[0].german).toBe(edit.german);
    await repo.remove(owner, post.id);
    expect((await repo.feed()).posts).toEqual([]);
  });
  it("keeps owners separate and enforces the atomic 50-post limit with no partial batch", async () => {
    for (let group = 0; group < 10; group++)
      await repo.publish(
        owner,
        input(
          Array.from({ length: 5 }, (_, i) => `Mein Satz ${group * 5 + i}.`),
        ),
      );
    await expect(
      repo.publish(owner, input(["Another sentence", "Second new sentence"])),
    ).rejects.toThrow(/50 public sentences/);
    expect(await repo.own(owner)).toHaveLength(50);
    await repo.publish(owner, input(["Mein Satz 1."]));
    await repo.publish(other, input(["Mein Satz 1."], "Other learner"));
    expect(await repo.own(other)).toHaveLength(1);
    const [first] = await repo.own(owner);
    await repo.remove(owner, first.id);
    expect(await repo.publish(owner, input(["One new sentence"]))).toHaveLength(
      50,
    );
  });
  it("paginates tied microsecond timestamps without leaks, duplicates or dependence on a deleted cursor post", async () => {
    for (let group = 0; group < 6; group++)
      await repo.publish(
        owner,
        input(Array.from({ length: 5 }, (_, i) => `Satz ${group * 5 + i}.`)),
      );
    await db.exec(
      "update sentence_posts set created_at='2026-10-14T12:00:00.123456Z';",
    );
    const first = await repo.feed();
    expect(first.posts).toHaveLength(24);
    expect(first.nextCursor).toBeTruthy();
    expect(first.posts[0].createdAt).toBe("2026-10-14T12:00:00.123456Z");
    const removed = first.posts.at(-1)!;
    await repo.remove(owner, removed.id);
    const second = await repo.feed("", first.nextCursor!);
    expect(second.posts).toHaveLength(6);
    expect(second.nextCursor).toBeNull();
    expect(
      new Set([...first.posts, ...second.posts].map((post) => post.id)).size,
    ).toBe(30);
    await expect(repo.feed("", "bad-cursor")).rejects.toThrow(/page link/);
  });
  it("searches text/signature literally and permits public browsing without authentication", async () => {
    await repo.publish(
      owner,
      input(["Ich trinke Kaffee.", "100% Deutsch_"], "MeinName"),
    );
    expect((await repo.feed("kaffee")).posts).toHaveLength(1);
    expect((await repo.feed("meinname")).posts).toHaveLength(2);
    expect((await repo.feed("%")).posts).toHaveLength(1);
    expect((await repo.feed("_")).posts).toHaveLength(1);
    mocks.session.mockResolvedValue({ data: null, error: null });
    const response = await feedRoute(request("/api/community/sentences"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect((await response.json()).posts).toHaveLength(2);
    expect((await mineRoute(request("/api/community/mine"))).status).toBe(401);
    expect(
      (await publishRoute(request("/api/community/mine", "POST", input())))
        .status,
    ).toBe(401);
  });
  it("rejects forged ownership, cross-origin/stale account requests and enforces owner APIs", async () => {
    expect(
      (
        await publishRoute(
          request("/api/community/mine", "POST", {
            ...input(),
            authorId: other,
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await publishRoute(
          request("/api/community/mine", "POST", input(), {
            Origin: "https://untrusted.test",
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await publishRoute(
          request("/api/community/mine", "POST", input(), {
            "X-Learning-Account": other,
          }),
        )
      ).status,
    ).toBe(409);
    const response = await publishRoute(
      request("/api/community/mine", "POST", input()),
    );
    expect(response.status).toBe(200);
    const [post] = (await response.json()).posts;
    mocks.session.mockResolvedValue({
      data: { user: { id: other } },
      error: null,
    });
    const context = { params: Promise.resolve({ postId: post.id }) };
    expect(
      (
        await removeRoute(
          request(`/api/community/mine/${post.id}`, "DELETE", undefined, {
            "X-Learning-Account": other,
          }),
          context,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await editRoute(
          request(
            `/api/community/mine/${post.id}`,
            "PATCH",
            {
              german: "Hacked",
              signature: "",
              signatureStyle: "clean",
              revision: 0,
            },
            { "X-Learning-Account": other },
          ),
          context,
        )
      ).status,
    ).toBe(409);
    expect((await repo.feed()).posts[0].german).toBe(input().sentences[0]);
  });
  it("rejects oversized/invalid requests and respects account deletion", async () => {
    expect(
      (
        await publishRoute(
          request("/api/community/mine", "POST", {
            payload: "x".repeat(97000),
          }),
        )
      ).status,
    ).toBe(413);
    const invalid = new Request(origin + "/api/community/mine", {
      method: "POST",
      headers: { Origin: origin },
      body: "not json",
    });
    expect((await publishRoute(invalid)).status).toBe(400);
    await repo.publish(other, input());
    await db.query('delete from neon_auth."user" where id=$1', [other]);
    expect((await repo.feed()).posts).toHaveLength(0);
    await db.query('insert into neon_auth."user" values($1)', [other]);
  });
});
