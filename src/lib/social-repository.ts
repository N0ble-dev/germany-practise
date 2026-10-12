import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import type {
  ProfileShare,
  PublicCard,
  SocialAction,
  SpaceDetail,
  StudySpace,
} from "./social-model";

export class SocialError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
type Execute = (query: SQL) => Promise<{ rows: Record<string, unknown>[] }>;
type Actor = { id: string; name: string };
export const inviteHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

// Every private statement checks membership or ownership, including mutations.
// A seat is unique per space and constrained to 0..2 by PostgreSQL.
export class SocialRepository {
  constructor(private execute: Execute = (query) => getDb().execute(query)) {}
  async list(userId: string): Promise<StudySpace[]> {
    const { rows } = await this.execute(sql`
      select s.id, s.name, s.owner_id as "ownerId",
        (select jsonb_agg(jsonb_build_object('userId', m.user_id, 'name', m.name, 'seat', m.seat) order by m.seat)
         from study_space_members m where m.space_id = s.id) as members
      from study_spaces s where exists (select 1 from study_space_members me
        where me.space_id = s.id and me.user_id = ${userId}::uuid)
      order by s.created_at, s.id`);
    return rows as unknown as StudySpace[];
  }
  async detail(
    userId: string,
    spaceId: string,
    cursor?: string,
  ): Promise<SpaceDetail> {
    const spaces = await this.list(userId);
    const space = spaces.find((s) => s.id === spaceId);
    if (!space)
      throw new SocialError(
        "This study space is not available to your account.",
        404,
      );
    const membership = sql`exists (select 1 from study_space_members me where me.space_id = ${spaceId}::uuid and me.user_id = ${userId}::uuid)`;
    const { rows: items } = await this.execute(sql`
      select i.id, i.author_id as "authorId", i.author_name as "authorName", i.content, i.created_at::text as "createdAt"
      from study_space_items i where i.space_id = ${spaceId}::uuid and ${membership}
      ${cursor ? sql`and (i.created_at, i.id) < (select c.created_at, c.id from study_space_items c where c.id = ${cursor}::uuid and c.space_id = ${spaceId}::uuid)` : sql``}
      order by i.created_at desc, i.id desc limit 51`);
    const { rows: invites } =
      space.ownerId === userId
        ? await this.execute(sql`
      select seat, expires_at::text as "expiresAt" from study_space_invites
      where space_id = ${spaceId}::uuid and token_hash is not null and expires_at > now()
      and exists (select 1 from study_spaces s where s.id = ${spaceId}::uuid and s.owner_id = ${userId}::uuid)`)
        : { rows: [] };
    return {
      space,
      items: items.slice(0, 50),
      invites,
      nextCursor: items.length > 50 ? String(items[49].id) : null,
    } as SpaceDetail;
  }
  async act(
    actor: Actor,
    action: SocialAction,
  ): Promise<{ spaceId?: string; token?: string }> {
    const uid = actor.id,
      name = actor.name.trim().slice(0, 60) || "Learner";
    if (action.action === "create") {
      const id = randomUUID();
      const { rows } = await this.execute(sql`
        with created as (insert into study_spaces (id, owner_id, name)
          values (${id}::uuid, ${uid}::uuid, ${action.name}) on conflict (owner_id) do nothing returning id)
        insert into study_space_members (space_id, user_id, name, seat)
          select id, ${uid}::uuid, ${name}, 0 from created returning space_id as "spaceId"`);
      if (!rows.length)
        throw new SocialError(
          "You already own a study space. Open it below.",
          409,
        );
      return { spaceId: String(rows[0].spaceId) };
    }
    if (action.action === "join") {
      // Consuming the invite and claiming its reserved seat is one atomic statement.
      // Concurrent joins recheck the updated invite; only one can succeed.
      const { rows } = await this.execute(sql`
        with claimed as (update study_space_invites i set token_hash = null
          where i.token_hash = ${inviteHash(action.token)} and i.expires_at > now()
          and not exists (select 1 from study_space_members m where m.space_id = i.space_id and (m.user_id = ${uid}::uuid or m.seat = i.seat))
          returning i.space_id, i.seat)
        insert into study_space_members (space_id, user_id, name, seat)
          select space_id, ${uid}::uuid, ${name}, seat from claimed on conflict do nothing
          returning space_id as "spaceId"`);
      if (!rows.length)
        throw new SocialError(
          "This invitation expired, was used, or you already belong to this space. Ask the owner for a new link.",
          409,
        );
      return { spaceId: String(rows[0].spaceId) };
    }
    const sid = action.spaceId;
    const owner = sql`exists (select 1 from study_spaces s where s.id = ${sid}::uuid and s.owner_id = ${uid}::uuid)`;
    const member = sql`exists (select 1 from study_space_members m where m.space_id = ${sid}::uuid and m.user_id = ${uid}::uuid)`;
    let rows: Record<string, unknown>[];
    if (action.action === "invite") {
      const token = randomBytes(32).toString("hex");
      ({ rows } = await this.execute(sql`
        insert into study_space_invites (space_id, seat, token_hash, expires_at)
        select ${sid}::uuid, ${action.seat}, ${inviteHash(token)}, now() + interval '7 days'
        where ${owner} and not exists (select 1 from study_space_members m where m.space_id = ${sid}::uuid and m.seat = ${action.seat})
        on conflict (space_id, seat) do update set token_hash = excluded.token_hash, expires_at = excluded.expires_at
        returning seat`));
      if (!rows.length)
        throw new SocialError(
          "Only the owner can invite someone to an empty seat.",
          403,
        );
      return { token };
    }
    if (action.action === "revoke") {
      ({ rows } = await this.execute(
        sql`update study_space_invites set token_hash = null where space_id = ${sid}::uuid and seat = ${action.seat} and ${owner} returning seat`,
      ));
    } else if (action.action === "remove" || action.action === "leave") {
      const target = action.action === "leave" ? uid : action.userId;
      ({ rows } = await this.execute(sql`with removed as (
        delete from study_space_members where space_id = ${sid}::uuid and user_id = ${target}::uuid and seat <> 0
        and ${action.action === "leave" ? member : owner} returning space_id, seat, user_id
      ), revoked as (
        update study_space_invites i set token_hash = null from removed r where i.space_id = r.space_id and i.seat = r.seat returning i.seat
      ) select user_id from removed`));
    } else if (action.action === "share") {
      ({ rows } = await this
        .execute(sql`insert into study_space_items (space_id, author_id, author_name, content)
        select ${sid}::uuid, ${uid}::uuid, ${name}, ${JSON.stringify(action.content)}::jsonb where ${member} returning id`));
    } else {
      ({ rows } = await this
        .execute(sql`delete from study_space_items where id = ${action.itemId}::uuid and space_id = ${sid}::uuid and ${member}
        and (author_id = ${uid}::uuid or ${owner}) returning id`));
    }
    if (!rows.length)
      throw new SocialError(
        "You do not have permission for this action, or it is no longer available.",
        403,
      );
    return { spaceId: sid };
  }
  async ownCard(userId: string): Promise<ProfileShare | null> {
    const { rows } = await this.execute(
      sql`select slug, card, image, updated_at::text as "updatedAt" from profile_shares where user_id = ${userId}::uuid`,
    );
    return (rows[0] as ProfileShare | undefined) ?? null;
  }
  async publicCard(slug: string): Promise<ProfileShare | null> {
    const { rows } = await this.execute(
      sql`select slug, card, image, updated_at::text as "updatedAt" from profile_shares where slug = ${slug}`,
    );
    return (rows[0] as ProfileShare | undefined) ?? null;
  }
  async publishCard(
    userId: string,
    card: PublicCard,
    image: string,
  ): Promise<ProfileShare> {
    const sanitized = {
      ...card,
      words: card.showStats ? card.words : 0,
      xp: card.showStats ? card.xp : 0,
    };
    const { rows } = await this
      .execute(sql`insert into profile_shares (user_id, slug, card, image)
      values (${userId}::uuid, ${randomBytes(24).toString("hex")}, ${JSON.stringify(sanitized)}::jsonb, ${image})
      on conflict (user_id) do update set card = excluded.card, image = excluded.image, updated_at = now()
      returning slug, card, image, updated_at::text as "updatedAt"`);
    return rows[0] as ProfileShare;
  }
  async unpublishCard(userId: string) {
    await this.execute(
      sql`delete from profile_shares where user_id = ${userId}::uuid`,
    );
  }
}
