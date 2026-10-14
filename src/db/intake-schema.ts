import {
  pgSchema,
  text,
  jsonb,
  integer,
  bigserial,
  bigint,
  uuid,
  timestamp,
  index,
  uniqueIndex,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { IntakeArchive, CorrectedEntry } from "@/lib/content-intake/model";
import type {
  IntakeKind,
  IntakeReviewCategory,
} from "@/lib/content-intake/constants";
export const contentIntakeSchema = pgSchema("content_intake");
const intake = contentIntakeSchema;
export const intakeArchives = intake.table(
  "archives",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    title: text("title").notNull(),
    manifestHash: text("manifest_hash").notNull(),
    manifest: jsonb("manifest").$type<IntakeArchive["manifest"]>().notNull(),
    expectedCount: integer("expected_count").notNull(),
    state: text("state").notNull().default("importing"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    check("intake_archive_state", sql`${t.state} in ('importing','complete')`),
    check("intake_expected_count", sql`${t.expectedCount}>0`),
  ],
);
export const intakeItems = intake.table(
  "items",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    archiveId: text("archive_id")
      .notNull()
      .references(() => intakeArchives.id),
    kind: text("kind").$type<IntakeKind>().notNull(),
    itemKey: text("item_key").notNull(),
    contentHash: text("content_hash").notNull(),
    chapter: integer("chapter"),
    page: integer("page"),
    german: text("german"),
    english: text("english"),
    topic: text("topic"),
    listType: text("list_type"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  },
  (t) => [
    uniqueIndex("intake_item_identity").on(t.archiveId, t.kind, t.itemKey),
    index("intake_items_browse").on(t.archiveId, t.kind, t.chapter, t.id),
    index("intake_items_search").using(
      "gin",
      sql`to_tsvector('simple', coalesce(${t.german},'') || ' ' || coalesce(${t.english},''))`,
    ),
    check(
      "intake_item_kind",
      sql`${t.kind} in ('source_document','chapter','source_page','vocabulary','vocabulary_category','activity','grammar_reference','source_link','media_reference','extraction_warning','sentence_pair','wiki_page','quarantine')`,
    ),
  ],
);
export const intakeDrafts = intake.table(
  "drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: bigint("item_id", { mode: "number" })
      .notNull()
      .references(() => intakeItems.id),
    version: integer("version").notNull(),
    sourceHash: text("source_hash").notNull(),
    contentHash: text("content_hash").notNull(),
    content: jsonb("content").$type<CorrectedEntry>().notNull(),
    authorId: uuid("author_id").notNull(),
    authorName: text("author_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("intake_draft_version").on(t.itemId, t.version),
    uniqueIndex("intake_draft_hash_identity").on(t.id, t.contentHash),
    check("intake_positive_version", sql`${t.version}>0`),
  ],
);
export const intakeReviews = intake.table(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    draftId: uuid("draft_id").notNull(),
    contentHash: text("content_hash").notNull(),
    category: text("category").$type<IntakeReviewCategory>().notNull(),
    decision: text("decision").notNull(),
    comment: text("comment").notNull(),
    reviewerId: uuid("reviewer_id").notNull(),
    reviewerName: text("reviewer_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.draftId, t.contentHash],
      foreignColumns: [intakeDrafts.id, intakeDrafts.contentHash],
    }),
    index("intake_reviews_latest").on(t.draftId, t.category, t.createdAt, t.id),
    check(
      "intake_review_category",
      sql`${t.category} in ('language','pedagogy','arabic','rights')`,
    ),
    check(
      "intake_review_decision",
      sql`${t.decision} in ('approved','changes_requested')`,
    ),
  ],
);
