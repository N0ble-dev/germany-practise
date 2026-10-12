import {
  beforeAll,
  beforeEach,
  afterAll,
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
const mocks = vi.hoisted(() => ({ session: vi.fn(), execute: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  isCloudConfigured: () => true,
  getAuth: () => ({ getSession: mocks.session }),
}));
vi.mock("@/db", () => ({ getDb: () => ({ execute: mocks.execute }) }));
import { SocialRepository, inviteHash } from "@/lib/social-repository";
import { copySharedWord, sharedWordSchema } from "@/lib/social-model";
import { starterWords } from "@/lib/content";
import { authDestination } from "@/lib/auth-navigation";
import { GET, POST } from "@/app/api/spaces/route";
import {
  GET as getCard,
  POST as publishCard,
  DELETE as unpublishCard,
} from "@/app/api/profile/share/route";
import { GET as publicImage } from "@/app/share/[slug]/image/route";
import SharedCardPage, { generateMetadata } from "@/app/share/[slug]/page";

const owner = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "Amina" };
const partner = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "Omar" };
const third = { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "Lena" };
const outsider = { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", name: "Alex" };
let postgres: PGlite;
const repo = new SocialRepository((query) => mocks.execute(query));
const dialect = new PgDialect();
const origin = "http://localhost:3008";
const request = (
  path: string,
  method = "GET",
  body?: unknown,
  account = owner.id,
) =>
  new Request(origin + path, {
    method,
    headers: {
      Origin: origin,
      "X-Learning-Account": account,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
beforeAll(async () => {
  postgres = new PGlite();
  await postgres.exec(
    'create schema neon_auth; create table neon_auth."user" (id uuid primary key);',
  );
  const journal = JSON.parse(
    readFileSync("drizzle/neon/meta/_journal.json", "utf8"),
  );
  for (const entry of journal.entries)
    await postgres.exec(readFileSync(`drizzle/neon/${entry.tag}.sql`, "utf8"));
}, 30_000);
beforeEach(async () => {
  await postgres.exec('truncate neon_auth."user" cascade;');
  for (const actor of [owner, partner, third, outsider])
    await postgres.query('insert into neon_auth."user" values ($1)', [
      actor.id,
    ]);
  mocks.execute.mockImplementation((sql: SQL) => {
    const query = dialect.sqlToQuery(sql);
    return postgres.query(query.sql, query.params);
  });
  mocks.session.mockResolvedValue({ data: { user: owner }, error: null });
  vi.stubEnv("APP_URL", origin);
});
afterAll(async () => {
  await postgres.close();
  vi.unstubAllEnvs();
});
async function create() {
  return (
    await repo.act(owner, { action: "create", name: "Our German corner" })
  ).spaceId!;
}
async function invite(spaceId: string, seat: 1 | 2 = 1) {
  return (await repo.act(owner, { action: "invite", spaceId, seat })).token!;
}
describe("actual PostgreSQL migration and space authorization", () => {
  it("creates one owned space, isolates other accounts and authorizes each mutation", async () => {
    const spaceId = await create();
    await expect(
      repo.act(owner, { action: "create", name: "Second" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(await repo.list(outsider.id)).toEqual([]);
    await expect(repo.detail(outsider.id, spaceId)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      repo.act(outsider, {
        action: "share",
        spaceId,
        content: { kind: "sentence", sentence: "Hallo!" },
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      repo.act(outsider, { action: "invite", spaceId, seat: 1 }),
    ).rejects.toMatchObject({ status: 403 });
    expect((await repo.detail(owner.id, spaceId)).space.members).toEqual([
      { userId: owner.id, name: owner.name, seat: 0 },
    ]);
  });
  it("claims invitations once and enforces the three-person limit in PostgreSQL", async () => {
    const spaceId = await create(),
      token = await invite(spaceId);
    const joins = await Promise.allSettled(
      [partner, third, outsider].map((actor) =>
        repo.act(actor, { action: "join", token }),
      ),
    );
    expect(joins.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const members = (await repo.detail(owner.id, spaceId)).space.members;
    const other = [partner, third, outsider].find(
      (a) => !members.some((m) => m.userId === a.id),
    )!;
    await repo.act(other, { action: "join", token: await invite(spaceId, 2) });
    expect((await repo.detail(owner.id, spaceId)).space.members).toHaveLength(
      3,
    );
    await expect(invite(spaceId, 1)).rejects.toMatchObject({ status: 403 });
    await expect(
      postgres.query(
        "insert into study_space_members (space_id, user_id, name, seat) values ($1, $2, 'Fourth', 3)",
        [spaceId, outsider.id],
      ),
    ).rejects.toThrow();
    await expect(
      postgres.query(
        "insert into study_space_members (space_id, user_id, name, seat) values ($1, $2, 'Fourth', 2)",
        [spaceId, outsider.id],
      ),
    ).rejects.toThrow();
    const hashes = await postgres.query(
      "select token_hash from study_space_invites",
    );
    expect(
      hashes.rows.every((r) => (r as { token_hash: null }).token_hash === null),
    ).toBe(true);
  });
  it("invalidates replaced, revoked, expired and consumed links", async () => {
    const spaceId = await create(),
      old = await invite(spaceId),
      fresh = await invite(spaceId);
    await expect(
      repo.act(partner, { action: "join", token: old }),
    ).rejects.toMatchObject({ status: 409 });
    await repo.act(owner, { action: "revoke", spaceId, seat: 1 });
    await expect(
      repo.act(partner, { action: "join", token: fresh }),
    ).rejects.toMatchObject({ status: 409 });
    const expired = await invite(spaceId);
    const row = (
      await postgres.query(
        "select token_hash from study_space_invites where space_id = $1",
        [spaceId],
      )
    ).rows[0] as { token_hash: string };
    expect(row.token_hash).toBe(inviteHash(expired));
    expect(row.token_hash).not.toBe(expired);
    await postgres.query(
      "update study_space_invites set expires_at = now() - interval '1 hour' where space_id = $1",
      [spaceId],
    );
    await expect(
      repo.act(partner, { action: "join", token: expired }),
    ).rejects.toMatchObject({ status: 409 });
    const consumed = await invite(spaceId);
    await repo.act(partner, { action: "join", token: consumed });
    await expect(
      repo.act(third, { action: "join", token: consumed }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("shares entries, preserves private review history, and revokes removed members immediately", async () => {
    const spaceId = await create();
    await repo.act(partner, { action: "join", token: await invite(spaceId) });
    const word = sharedWordSchema.parse(starterWords[0]);
    await repo.act(partner, {
      action: "share",
      spaceId,
      content: { kind: "word", word },
    });
    await repo.act(owner, {
      action: "share",
      spaceId,
      content: { kind: "sentence", sentence: "Ich lerne Deutsch." },
    });
    const shared = await repo.detail(partner.id, spaceId);
    expect(shared.items).toHaveLength(2);
    expect(shared.invites).toEqual([]);
    const ownEntry = shared.items.find((i) => i.authorId === owner.id)!;
    await expect(
      repo.act(partner, {
        action: "delete-item",
        spaceId,
        itemId: ownEntry.id,
      }),
    ).rejects.toMatchObject({ status: 403 });
    const copied = copySharedWord(word);
    expect(copied.german).toBe(word.german);
    expect(copied.reviews).toBe(0);
    expect(copied.status).toBe("new");
    expect(copied.interval).toBe(0);
    expect(copied.id).not.toBe(starterWords[0].id);
    await expect(
      repo.act(partner, { action: "remove", spaceId, userId: owner.id }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      repo.act(owner, { action: "leave", spaceId }),
    ).rejects.toMatchObject({ status: 403 });
    await repo.act(owner, { action: "remove", spaceId, userId: partner.id });
    expect(await repo.list(partner.id)).toEqual([]);
    await expect(repo.detail(partner.id, spaceId)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      repo.act(partner, {
        action: "share",
        spaceId,
        content: { kind: "sentence", sentence: "No access" },
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      repo.act(partner, {
        action: "delete-item",
        spaceId,
        itemId: shared.items[0].id,
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect((await repo.detail(owner.id, spaceId)).items).toHaveLength(2);
  });
  it("paginates without dropping entries and keeps joined spaces independent", async () => {
    const spaceId = await create();
    for (let i = 0; i < 55; i++)
      await repo.act(owner, {
        action: "share",
        spaceId,
        content: { kind: "sentence", sentence: `Satz ${i}` },
      });
    const first = await repo.detail(owner.id, spaceId),
      second = await repo.detail(owner.id, spaceId, first.nextCursor!);
    expect(first.items).toHaveLength(50);
    expect(second.items).toHaveLength(5);
    expect(second.nextCursor).toBeNull();
    expect(
      new Set([...first.items, ...second.items].map((i) => i.id)).size,
    ).toBe(55);
    const other = (
      await repo.act(partner, { action: "create", name: "Other space" })
    ).spaceId!;
    expect((await repo.detail(partner.id, other)).items).toEqual([]);
    await expect(repo.detail(partner.id, spaceId)).rejects.toMatchObject({
      status: 404,
    });
  });
});
describe("authenticated HTTP handlers and public profile cards", () => {
  it("checks sessions, origin and stale account hints before touching private data", async () => {
    mocks.execute.mockClear();
    mocks.session.mockResolvedValue({ data: null, error: null });
    expect((await GET(request("/api/spaces"))).status).toBe(401);
    expect((await getCard(request("/api/profile/share"))).status).toBe(401);
    mocks.session.mockResolvedValue({ data: { user: owner }, error: null });
    expect(
      (await GET(request("/api/spaces", "GET", undefined, partner.id))).status,
    ).toBe(409);
    expect(
      (
        await POST(
          new Request(origin + "/api/spaces", {
            method: "POST",
            headers: { Origin: "https://other.example" },
            body: "{}",
          }),
        )
      ).status,
    ).toBe(403);
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(
      (
        await POST(
          request("/api/spaces", "POST", {
            action: "invite",
            spaceId: "invalid",
            seat: 3,
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await POST(
          request("/api/spaces", "POST", {
            action: "create",
            name: "Our space",
          }),
        )
      ).status,
    ).toBe(200);
  });
  it("publishes only the chosen snapshot, keeps a stable link on update and revokes old links", async () => {
    const png = Buffer.alloc(24);
    Buffer.from("89504e470d0a1a0a", "hex").copy(png);
    png.writeUInt32BE(800, 16);
    png.writeUInt32BE(1125, 20);
    const image = `data:image/png;base64,${png.toString("base64")}`;
    const card = {
      name: "Amina",
      showPhoto: false,
      showStats: false,
      words: 42,
      xp: 150,
    };
    const response = await publishCard(
      request("/api/profile/share", "POST", {
        card,
        image,
        email: "private@example.com",
        notes: "private",
      }),
    );
    expect(response.status).toBe(200);
    const { share } = await response.json();
    expect(share.card.words).toBe(0);
    expect(share.card.xp).toBe(0);
    expect(Object.keys(share.card).sort()).toEqual(
      ["name", "showPhoto", "showStats", "words", "xp"].sort(),
    );
    const publicResponse = await publicImage(
      request(`/share/${share.slug}/image`),
      { params: Promise.resolve({ slug: share.slug }) },
    );
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.headers.get("cache-control")).toBe("no-store");
    expect(Buffer.from(await publicResponse.arrayBuffer())).toEqual(png);
    const updated = await repo.publishCard(
      owner.id,
      { ...card, name: "Updated", showStats: true },
      image,
    );
    expect(updated.slug).toBe(share.slug);
    expect((await repo.publicCard(share.slug))?.card.name).toBe("Updated");
    mocks.session.mockResolvedValue({ data: { user: partner }, error: null });
    await unpublishCard(
      request("/api/profile/share", "DELETE", undefined, partner.id),
    );
    expect(await repo.publicCard(share.slug)).not.toBeNull();
    mocks.session.mockResolvedValue({ data: { user: owner }, error: null });
    await unpublishCard(request("/api/profile/share", "DELETE"));
    expect(
      (
        await publicImage(request(`/share/${share.slug}/image`), {
          params: Promise.resolve({ slug: share.slug }),
        })
      ).status,
    ).toBe(404);
    const republished = await repo.publishCard(owner.id, card, image);
    expect(republished.slug).not.toBe(share.slug);
    expect(
      (
        await publishCard(
          request("/api/profile/share", "POST", {
            card,
            image: "data:image/png;base64,aGVsbG8=",
          }),
        )
      ).status,
    ).toBe(400);
  });
  it("preserves only valid invitation routes through Google OAuth", () => {
    const path = `/space?invite=${"a".repeat(64)}`;
    expect(authDestination(path)).toBe(path);
    expect(authDestination("/space")).toBe("/space");
    for (const unsafe of [
      "https://evil.example",
      "//evil.example",
      `${path}&redirect=https://evil.example`,
      "/space?invite=short",
    ])
      expect(authDestination(unsafe)).toBe("/");
  });
  it("renders a published card and link preview metadata without consulting a session", async () => {
    const card = {
      name: "Amina",
      showPhoto: false,
      showStats: true,
      words: 42,
      xp: 150,
    };
    const share = await repo.publishCard(
      owner.id,
      card,
      "data:image/png;base64,aGVsbG8=",
    );
    mocks.session.mockClear();
    const params = Promise.resolve({ slug: share.slug });
    const page = await SharedCardPage({ params });
    expect(page.props.card).toEqual(card);
    expect(page.props.slug).toBe(share.slug);
    const metadata = await generateMetadata({ params });
    expect(metadata.title).toContain("Amina");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.openGraph).toMatchObject({
      images: [{ width: 800, height: 1125 }],
    });
    expect(mocks.session).not.toHaveBeenCalled();
    await repo.unpublishCard(owner.id);
    await expect(SharedCardPage({ params })).rejects.toThrow();
  });
});
