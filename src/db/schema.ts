import {
  pgTable,
  pgSchema,
  uuid,
  timestamp,
  integer,
  jsonb,
  text,
} from "drizzle-orm/pg-core";
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
