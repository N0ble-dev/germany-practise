import { sql } from "drizzle-orm";
import {
  pgTable,
  pgSchema,
  uuid,
  text,
  jsonb,
  timestamp,
  integer,
  boolean,
  primaryKey,
  uniqueIndex,
  index,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";
import type { ExamDefinition } from "@/lib/exams/definitions";
import type {
  ExamPack,
  ExamAnswer,
  ExamTask,
  ExamReview,
} from "@/lib/exams/model";
import type { ExamReport } from "@/lib/exams/evaluation";
const users = pgSchema("neon_auth").table("user", {
  id: uuid("id").primaryKey(),
});
const created = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const examDefinitionsTable = pgTable("exam_definitions", {
  code: text("code").primaryKey(),
  definition: jsonb("definition").$type<ExamDefinition>().notNull(),
  revision: text("revision").notNull(),
  checkedAt: text("checked_at").notNull(),
  createdAt: created(),
});
export const examPaperVersions = pgTable(
  "exam_paper_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examCode: text("exam_code")
      .notNull()
      .references(() => examDefinitionsTable.code),
    paperSlug: text("paper_slug").notNull(),
    version: integer("version").notNull(),
    contentHash: text("content_hash").notNull(),
    content: jsonb("content_json").$type<ExamPack>().notNull(),
    status: text("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: created(),
  },
  (table) => [
    uniqueIndex("exam_paper_version_unique").on(table.paperSlug, table.version),
    check("exam_paper_positive_version", sql`${table.version} > 0`),
    check(
      "exam_paper_status",
      sql`${table.status} in ('draft','published','retired')`,
    ),
    check("exam_paper_hash", sql`${table.contentHash} ~ '^[a-f0-9]{64}$'`),
  ],
);
export const examTaskVersions = pgTable(
  "exam_task_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paperVersionId: uuid("paper_version_id")
      .notNull()
      .references(() => examPaperVersions.id, { onDelete: "cascade" }),
    taskKey: text("task_key").notNull(),
    skill: text("skill").notNull(),
    order: integer("order_index").notNull(),
    prompt: jsonb("prompt_json").notNull(),
    solution: jsonb("private_solution_json").$type<ExamTask>().notNull(),
  },
  (table) => [
    uniqueIndex("exam_task_key_unique").on(table.paperVersionId, table.taskKey),
    uniqueIndex("exam_task_paper_identity").on(table.paperVersionId, table.id),
    uniqueIndex("exam_task_order_unique").on(table.paperVersionId, table.order),
    check(
      "exam_task_skill",
      sql`${table.skill} in ('listening','reading','writing','speaking')`,
    ),
  ],
);
export const examMediaAssets = pgTable(
  "exam_media_assets",
  {
    paperVersionId: uuid("paper_version_id")
      .notNull()
      .references(() => examPaperVersions.id, { onDelete: "cascade" }),
    assetKey: text("asset_key").notNull(),
    storageKey: text("storage_key").notNull(),
    fileHash: text("file_hash").notNull(),
    manifest: jsonb("manifest").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    inspection: jsonb("inspection"),
  },
  (table) => [primaryKey({ columns: [table.paperVersionId, table.assetKey] })],
);
export const examReviewSignoffs = pgTable(
  "exam_review_signoffs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paperVersionId: uuid("paper_version_id")
      .notNull()
      .references(() => examPaperVersions.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    category: text("category").$type<ExamReview["category"]>().notNull(),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id),
    reviewerName: text("reviewer_name").notNull(),
    decision: text("decision").notNull(),
    comment: text("comment").notNull(),
    createdAt: created(),
  },
  (table) => [
    index("exam_review_latest").on(
      table.paperVersionId,
      table.category,
      table.createdAt,
    ),
    check(
      "exam_review_category",
      sql`${table.category} in ('language','pedagogy','arabic','rights','audio')`,
    ),
    check(
      "exam_review_decision",
      sql`${table.decision} in ('approved','changes_requested')`,
    ),
  ],
);
export const examAttempts = pgTable(
  "exam_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    paperVersionId: uuid("paper_version_id")
      .notNull()
      .references(() => examPaperVersions.id),
    mode: text("mode").notNull(),
    skill: text("skill"),
    status: text("status").notNull().default("in_progress"),
    definition: jsonb("definition").$type<ExamDefinition>().notNull(),
    revision: integer("revision").notNull().default(0),
    idempotencyKey: uuid("idempotency_key").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deadline: timestamp("deadline", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    interrupted: boolean("interrupted").notNull().default(false),
    report: jsonb("report").$type<ExamReport>(),
  },
  (table) => [
    uniqueIndex("exam_attempt_create_once").on(
      table.userId,
      table.idempotencyKey,
    ),
    uniqueIndex("exam_attempt_paper_identity").on(
      table.paperVersionId,
      table.id,
    ),
    index("exam_attempt_user_time").on(table.userId, table.startedAt),
    check(
      "exam_attempt_mode",
      sql`${table.mode} in ('coach','timed_section','preview')`,
    ),
    check(
      "exam_attempt_status",
      sql`${table.status} in ('in_progress','submitted')`,
    ),
    check(
      "exam_timed_section_skill",
      sql`${table.mode} <> 'timed_section' or (${table.skill} in ('listening','reading','writing','speaking') and ${table.deadline} is not null)`,
    ),
  ],
);
export const examResponses = pgTable(
  "exam_responses",
  {
    paperVersionId: uuid("paper_version_id").notNull(),
    attemptId: uuid("attempt_id").notNull(),
    taskVersionId: uuid("task_version_id").notNull(),
    answer: jsonb("answer_json").$type<ExamAnswer>().notNull(),
    savedAt: timestamp("saved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.attemptId, table.taskVersionId] }),
    foreignKey({
      name: "exam_response_same_attempt_paper",
      columns: [table.paperVersionId, table.attemptId],
      foreignColumns: [examAttempts.paperVersionId, examAttempts.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "exam_response_same_task_paper",
      columns: [table.paperVersionId, table.taskVersionId],
      foreignColumns: [examTaskVersions.paperVersionId, examTaskVersions.id],
    }),
  ],
);
export const examFeedback = pgTable(
  "exam_feedback",
  {
    attemptId: uuid("attempt_id").notNull(),
    taskVersionId: uuid("task_version_id").notNull(),
    status: text("status").notNull().default("pending"),
    reviewerId: uuid("reviewer_id").references(() => users.id),
    feedback: jsonb("feedback_json"),
    createdAt: created(),
  },
  (table) => [
    primaryKey({ columns: [table.attemptId, table.taskVersionId] }),
    foreignKey({
      columns: [table.attemptId, table.taskVersionId],
      foreignColumns: [examResponses.attemptId, examResponses.taskVersionId],
    }).onDelete("cascade"),
    check(
      "exam_feedback_status",
      sql`${table.status} in ('pending','reviewed')`,
    ),
  ],
);
export const examGoals = pgTable(
  "exam_goals",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    examCode: text("exam_code")
      .notNull()
      .references(() => examDefinitionsTable.code),
    plannedDate: text("planned_date"),
    bookingConfirmed: boolean("booking_confirmed").notNull().default(false),
    dailyMinutes: integer("daily_minutes").notNull(),
    timeZone: text("time_zone").notNull(),
    language: text("language").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("exam_goal_minutes", sql`${table.dailyMinutes} between 5 and 120`),
    check("exam_goal_language", sql`${table.language} in ('en','ar')`),
    check(
      "exam_goal_booking",
      sql`not ${table.bookingConfirmed} or ${table.plannedDate} is not null`,
    ),
  ],
);
export const examPublicationEvents = pgTable("exam_publication_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  paperVersionId: uuid("paper_version_id")
    .notNull()
    .references(() => examPaperVersions.id),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(),
  contentHash: text("content_hash").notNull(),
  createdAt: created(),
});
