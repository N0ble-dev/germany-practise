CREATE TABLE "content_publication_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_version_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_version_id" uuid NOT NULL,
	"category" text NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewer_name" text NOT NULL,
	"decision" text NOT NULL,
	"comment" text NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_review_category" CHECK ("content_reviews"."category" in ('language','pedagogy','arabic','rights','audio')),
	CONSTRAINT "content_review_decision" CHECK ("content_reviews"."decision" in ('approved','changes_requested'))
);
--> statement-breakpoint
CREATE TABLE "course_publications" (
	"course_id" text NOT NULL,
	"lesson_key" text NOT NULL,
	"published_version_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_publications_course_id_lesson_key_pk" PRIMARY KEY("course_id","lesson_key")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"cefr" text NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"source_url" text NOT NULL,
	"license" text,
	"attribution" text,
	"permission_doc" text,
	"last_checked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lesson_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_key" text NOT NULL,
	"version" integer NOT NULL,
	"course_id" text NOT NULL,
	"content_json" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "lesson_positive_version" CHECK ("lesson_versions"."version">0)
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_version_id" uuid NOT NULL,
	"asset_key" text NOT NULL,
	"storage_key" text NOT NULL,
	"file_hash" text NOT NULL,
	"license_ref" text NOT NULL,
	"verified_at" timestamp with time zone,
	"verification" jsonb
);
--> statement-breakpoint
ALTER TABLE "content_publication_events" ADD CONSTRAINT "content_publication_events_lesson_version_id_lesson_versions_id_fk" FOREIGN KEY ("lesson_version_id") REFERENCES "public"."lesson_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_lesson_version_id_lesson_versions_id_fk" FOREIGN KEY ("lesson_version_id") REFERENCES "public"."lesson_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_publication_identity" ON "lesson_versions" USING btree ("course_id","lesson_key","id");--> statement-breakpoint
ALTER TABLE "course_publications" ADD CONSTRAINT "course_publications_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_publications" ADD CONSTRAINT "course_publications_course_id_lesson_key_published_version_id_lesson_versions_course_id_lesson_key_id_fk" FOREIGN KEY ("course_id","lesson_key","published_version_id") REFERENCES "public"."lesson_versions"("course_id","lesson_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_versions" ADD CONSTRAINT "lesson_versions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_lesson_version_id_lesson_versions_id_fk" FOREIGN KEY ("lesson_version_id") REFERENCES "public"."lesson_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_review_lookup" ON "content_reviews" USING btree ("lesson_version_id","category","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_version_key" ON "lesson_versions" USING btree ("lesson_key","version");--> statement-breakpoint
CREATE UNIQUE INDEX "version_media_key" ON "media_assets" USING btree ("lesson_version_id","asset_key");
--> statement-breakpoint
CREATE FUNCTION protect_lesson_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.lesson_key IS DISTINCT FROM OLD.lesson_key OR NEW.version IS DISTINCT FROM OLD.version
    OR NEW.course_id IS DISTINCT FROM OLD.course_id OR NEW.content_json IS DISTINCT FROM OLD.content_json
    OR NEW.content_hash IS DISTINCT FROM OLD.content_hash THEN
    RAISE EXCEPTION 'Lesson versions are immutable; increment the version';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER immutable_lesson_version BEFORE UPDATE ON lesson_versions
FOR EACH ROW EXECUTE FUNCTION protect_lesson_version();
--> statement-breakpoint
CREATE FUNCTION protect_content_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Content reviews are append-only';
END $$;
--> statement-breakpoint
CREATE TRIGGER append_only_content_reviews BEFORE UPDATE OR DELETE ON content_reviews
FOR EACH ROW EXECUTE FUNCTION protect_content_review();
--> statement-breakpoint
CREATE VIEW publishable_lesson_versions AS
SELECT v.* FROM lesson_versions v
WHERE v.content_json->'rights'->>'commercialUseCleared' = 'true'
AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v.content_json->'vocabulary') word
  WHERE word->>'type'='noun' AND word->>'pluralKind'='unknown')
AND NOT EXISTS (
  SELECT 1 FROM unnest(ARRAY['language','pedagogy','arabic','rights','audio']) gate
  WHERE COALESCE((SELECT r.decision FROM content_reviews r
    WHERE r.lesson_version_id=v.id AND r.category=gate AND r.content_hash=v.content_hash
    ORDER BY r.created_at DESC,r.id DESC LIMIT 1),'missing') <> 'approved'
)
AND NOT EXISTS (
  SELECT 1 FROM jsonb_array_elements(v.content_json->'dialogues') dialogue,
    jsonb_array_elements(dialogue->'lines') line
  WHERE NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v.content_json->'media') asset
    JOIN media_assets m ON m.lesson_version_id=v.id AND m.asset_key=asset->>'id'
    WHERE asset->>'lineId'=line->>'id' AND asset->>'storageKey'=line->>'audioKey'
      AND m.file_hash=asset->>'fileHash' AND m.storage_key=asset->>'storageKey'
      AND m.verified_at IS NOT NULL
  )
);
--> statement-breakpoint
CREATE VIEW published_lesson_catalog AS
SELECT v.* FROM publishable_lesson_versions v
JOIN course_publications p ON p.published_version_id=v.id
WHERE NOT EXISTS (
  SELECT 1 FROM jsonb_array_elements_text(v.content_json->'prerequisites') prerequisite
  WHERE NOT EXISTS (
    SELECT 1 FROM course_publications pp
    JOIN publishable_lesson_versions pv ON pv.id=pp.published_version_id
    WHERE pp.lesson_key=prerequisite
  )
);
