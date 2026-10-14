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
  unique,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
export {
  contentIntakeSchema,
  intakeArchives,
  intakeItems,
  intakeDrafts,
  intakeReviews,
} from "./intake-schema";
export {
  examDefinitionsTable,
  examPaperVersions,
  examTaskVersions,
  examMediaAssets,
  examReviewSignoffs,
  examAttempts,
  examResponses,
  examFeedback,
  examGoals,
  examPublicationEvents,
} from "./exams-schema";
import type { PublicCard, SharedContent } from "@/lib/social-model";
import type { LearningState } from "@/lib/learning";
import type { SignatureDrawing } from "@/lib/community-model";
import type { LessonPack, ReviewCategory } from "@/lib/content-pipeline/model";
// Reference Neon's existing user table; its schema is managed by Neon, not our migrations.
const neonUsers = pgSchema("neon_auth").table("user", {
  id: uuid("id").primaryKey(),
});
export const sentencePosts = pgTable(
  "sentence_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => neonUsers.id, { onDelete: "cascade" }),
    german: text("german").notNull(),
    signature: text("signature").notNull().default(""),
    signatureStyle: text("signature_style").notNull().default("written"),
    signatureDrawing: jsonb("signature_drawing").$type<SignatureDrawing>(),
    revision: integer("revision").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("sentence_posts_author_sentence").on(table.authorId, table.german),
    index("sentence_posts_feed").on(table.createdAt, table.id),
    check(
      "sentence_posts_text_length",
      sql`length(trim(${table.german})) between 1 and 500`,
    ),
    check(
      "sentence_posts_signature_length",
      sql`length(${table.signature})<=60`,
    ),
    check(
      "sentence_posts_signature_style",
      sql`${table.signatureStyle} in ('drawn','written','clean')`,
    ),
    check(
      "sentence_posts_drawing_shape",
      sql`${table.signatureDrawing} is null or jsonb_typeof(${table.signatureDrawing})='object'`,
    ),
    check(
      "sentence_posts_drawing_style",
      sql`(${table.signatureStyle}='drawn')=(${table.signatureDrawing} is not null)`,
    ),
    check("sentence_posts_revision", sql`${table.revision}>=0`),
  ],
);
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

// Shared curriculum is stored once; existing personal snapshots remain intact.
export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  cefr: text("cefr").notNull(),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});
export const lessonVersions = pgTable(
  "lesson_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonKey: text("lesson_key").notNull(),
    version: integer("version").notNull(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    content: jsonb("content_json").$type<LessonPack>().notNull(),
    contentHash: text("content_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("lesson_version_key").on(table.lessonKey, table.version),
    uniqueIndex("lesson_publication_identity").on(
      table.courseId,
      table.lessonKey,
      table.id,
    ),
    check("lesson_positive_version", sql`${table.version}>0`),
  ],
);
export const contentReviews = pgTable(
  "content_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonVersionId: uuid("lesson_version_id")
      .notNull()
      .references(() => lessonVersions.id),
    category: text("category").$type<ReviewCategory>().notNull(),
    reviewerId: uuid("reviewer_id").notNull(),
    reviewerName: text("reviewer_name").notNull(),
    decision: text("decision").notNull(),
    comment: text("comment").notNull(),
    contentHash: text("content_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("content_review_lookup").on(
      table.lessonVersionId,
      table.category,
      table.createdAt,
    ),
    check(
      "content_review_category",
      sql`${table.category} in ('language','pedagogy','arabic','rights','audio')`,
    ),
    check(
      "content_review_decision",
      sql`${table.decision} in ('approved','changes_requested')`,
    ),
  ],
);
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonVersionId: uuid("lesson_version_id")
      .notNull()
      .references(() => lessonVersions.id),
    assetKey: text("asset_key").notNull(),
    storageKey: text("storage_key").notNull(),
    fileHash: text("file_hash").notNull(),
    licenseRef: text("license_ref").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verification: jsonb("verification").$type<{
      duration: number;
      sampleRate: number;
      channels: number;
      bytes: number;
      fileHash: string;
    }>(),
  },
  (table) => [
    uniqueIndex("version_media_key").on(table.lessonVersionId, table.assetKey),
  ],
);
export const curriculumSources = pgTable("curriculum_sources", {
  id: text("id").primaryKey(),
  sourceUrl: text("source_url").notNull(),
  license: text("license"),
  attribution: text("attribution"),
  permissionDoc: text("permission_doc"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
});
export const coursePublications = pgTable(
  "course_publications",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    lessonKey: text("lesson_key").notNull(),
    publishedVersionId: uuid("published_version_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.courseId, table.lessonKey] }),
    foreignKey({
      columns: [table.courseId, table.lessonKey, table.publishedVersionId],
      foreignColumns: [
        lessonVersions.courseId,
        lessonVersions.lessonKey,
        lessonVersions.id,
      ],
    }),
  ],
);
export const contentPublicationEvents = pgTable("content_publication_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonVersionId: uuid("lesson_version_id")
    .notNull()
    .references(() => lessonVersions.id),
  actorId: uuid("actor_id").notNull(),
  contentHash: text("content_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
