import {
  pgTable,
  pgSchema,
  uuid,
  timestamp,
  integer,
  jsonb,
  text,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { PublicCard, SharedContent } from "@/lib/social-model";
import type { LearningState } from "@/lib/learning";
// Reference Neon's existing user table; its schema is managed by Neon, not our migrations.
const neonUsers = pgSchema("neon_auth").table("user", {
  id: uuid("id").primaryKey(),
});
export const learningStates = pgTable("neon_learning_states", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => neonUsers.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<LearningState>().notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const googleCalendarConnections = pgTable(
  "google_calendar_connections",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => neonUsers.id, { onDelete: "cascade" }),
    calendarId: text("calendar_id").notNull(),
    refreshToken: text("refresh_token_encrypted").notNull(),
    syncedIds: jsonb("synced_ids").$type<string[]>().notNull().default([]),
    revision: integer("revision").notNull().default(0),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    syncLockUntil: timestamp("sync_lock_until", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const studySpaces = pgTable("study_spaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .unique()
    .references(() => neonUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const studySpaceMembers = pgTable(
  "study_space_members",
  {
    spaceId: uuid("space_id")
      .notNull()
      .references(() => studySpaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => neonUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    seat: integer("seat").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.spaceId, table.userId] }),
    uniqueIndex("study_space_seat_unique").on(table.spaceId, table.seat),
    index("study_space_user_index").on(table.userId),
    check("study_space_three_seats", sql`${table.seat} between 0 and 2`),
  ],
);
export const studySpaceInvites = pgTable(
  "study_space_invites",
  {
    spaceId: uuid("space_id")
      .notNull()
      .references(() => studySpaces.id, { onDelete: "cascade" }),
    seat: integer("seat").notNull(),
    tokenHash: text("token_hash").unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.spaceId, table.seat] }),
    check("study_space_invite_seats", sql`${table.seat} in (1, 2)`),
  ],
);
export const studySpaceItems = pgTable(
  "study_space_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => studySpaces.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => neonUsers.id, {
      onDelete: "set null",
    }),
    authorName: text("author_name").notNull(),
    content: jsonb("content").$type<SharedContent>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("study_space_items_index").on(
      table.spaceId,
      table.createdAt,
      table.id,
    ),
  ],
);
export const profileShares = pgTable("profile_shares", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => neonUsers.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  card: jsonb("card").$type<PublicCard>().notNull(),
  image: text("image").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
