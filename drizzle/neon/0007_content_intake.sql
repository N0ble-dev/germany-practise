CREATE SCHEMA "content_intake";
--> statement-breakpoint
CREATE TABLE "content_intake"."archives" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"title" text NOT NULL,
	"manifest_hash" text NOT NULL,
	"manifest" jsonb NOT NULL,
	"expected_count" integer NOT NULL,
	"state" text DEFAULT 'importing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "intake_archive_state" CHECK ("content_intake"."archives"."state" in ('importing','complete')),
	CONSTRAINT "intake_expected_count" CHECK ("content_intake"."archives"."expected_count">0)
);
--> statement-breakpoint
CREATE TABLE "content_intake"."drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" bigint NOT NULL,
	"version" integer NOT NULL,
	"source_hash" text NOT NULL,
	"content_hash" text NOT NULL,
	"content" jsonb NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "intake_positive_version" CHECK ("content_intake"."drafts"."version">0)
);
--> statement-breakpoint
CREATE TABLE "content_intake"."items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"archive_id" text NOT NULL,
	"kind" text NOT NULL,
	"item_key" text NOT NULL,
	"content_hash" text NOT NULL,
	"chapter" integer,
	"page" integer,
	"german" text,
	"english" text,
	"topic" text,
	"list_type" text,
	"payload" jsonb NOT NULL,
	CONSTRAINT "intake_item_kind" CHECK ("content_intake"."items"."kind" in ('source_document','chapter','source_page','vocabulary','vocabulary_category','activity','grammar_reference','source_link','media_reference','extraction_warning','sentence_pair','wiki_page','quarantine'))
);
--> statement-breakpoint
CREATE TABLE "content_intake"."reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"content_hash" text NOT NULL,
	"category" text NOT NULL,
	"decision" text NOT NULL,
	"comment" text NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewer_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "intake_review_category" CHECK ("content_intake"."reviews"."category" in ('language','pedagogy','arabic','rights')),
	CONSTRAINT "intake_review_decision" CHECK ("content_intake"."reviews"."decision" in ('approved','changes_requested'))
);
--> statement-breakpoint
ALTER TABLE "content_intake"."drafts" ADD CONSTRAINT "drafts_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "content_intake"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_intake"."items" ADD CONSTRAINT "items_archive_id_archives_id_fk" FOREIGN KEY ("archive_id") REFERENCES "content_intake"."archives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "intake_draft_hash_identity" ON "content_intake"."drafts" USING btree ("id","content_hash");--> statement-breakpoint
ALTER TABLE "content_intake"."reviews" ADD CONSTRAINT "reviews_draft_id_content_hash_drafts_id_content_hash_fk" FOREIGN KEY ("draft_id","content_hash") REFERENCES "content_intake"."drafts"("id","content_hash") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "intake_draft_version" ON "content_intake"."drafts" USING btree ("item_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "intake_item_identity" ON "content_intake"."items" USING btree ("archive_id","kind","item_key");--> statement-breakpoint
CREATE INDEX "intake_items_browse" ON "content_intake"."items" USING btree ("archive_id","kind","chapter","id");--> statement-breakpoint
CREATE INDEX "intake_items_search" ON "content_intake"."items" USING gin (to_tsvector('simple', coalesce("german",'') || ' ' || coalesce("english",'')));--> statement-breakpoint
CREATE INDEX "intake_reviews_latest" ON "content_intake"."reviews" USING btree ("draft_id","category","created_at","id");
--> statement-breakpoint
CREATE FUNCTION content_intake.protect_source_item() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Source intake is immutable; import a new archive revision'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER immutable_intake_item BEFORE UPDATE ON content_intake.items FOR EACH ROW EXECUTE FUNCTION content_intake.protect_source_item();
--> statement-breakpoint
CREATE TRIGGER immutable_intake_draft BEFORE UPDATE ON content_intake.drafts FOR EACH ROW EXECUTE FUNCTION content_intake.protect_source_item();
--> statement-breakpoint
CREATE FUNCTION content_intake.protect_archive() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.provider IS DISTINCT FROM OLD.provider OR NEW.title IS DISTINCT FROM OLD.title
 OR NEW.manifest_hash IS DISTINCT FROM OLD.manifest_hash OR NEW.manifest IS DISTINCT FROM OLD.manifest
 OR NEW.expected_count IS DISTINCT FROM OLD.expected_count OR (OLD.state='complete' AND NEW.state<>'complete') THEN
  RAISE EXCEPTION 'Source archive manifest is immutable';
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER immutable_intake_archive BEFORE UPDATE ON content_intake.archives FOR EACH ROW EXECUTE FUNCTION content_intake.protect_archive();
--> statement-breakpoint
CREATE FUNCTION content_intake.protect_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Intake reviews are append-only'; END $$;
--> statement-breakpoint
CREATE TRIGGER append_only_intake_reviews BEFORE UPDATE OR DELETE ON content_intake.reviews FOR EACH ROW EXECUTE FUNCTION content_intake.protect_review();
--> statement-breakpoint
CREATE FUNCTION content_intake.save_draft(p_item bigint,p_source_hash text,p_expected integer,p_hash text,p_content jsonb,p_actor uuid,p_name text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE latest integer; result uuid; original content_intake.items%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(p_item);
 SELECT i.* INTO original FROM content_intake.items i JOIN content_intake.archives a ON a.id=i.archive_id WHERE i.id=p_item AND a.state='complete';
 IF NOT FOUND OR original.kind NOT IN ('vocabulary','sentence_pair','activity') OR original.kind<>p_content->>'kind' OR original.content_hash<>p_source_hash THEN
  RAISE EXCEPTION 'Source item missing, changed or not editable' USING ERRCODE='P0001';
 END IF;
 SELECT COALESCE(max(version),0) INTO latest FROM content_intake.drafts WHERE item_id=p_item;
 IF latest<>p_expected THEN RAISE EXCEPTION 'Draft changed; reload before editing' USING ERRCODE='P0001'; END IF;
 INSERT INTO content_intake.drafts (item_id,version,source_hash,content_hash,content,author_id,author_name)
 VALUES (p_item,latest+1,p_source_hash,p_hash,p_content,p_actor,p_name) RETURNING id INTO result;
 RETURN result;
END $$;
