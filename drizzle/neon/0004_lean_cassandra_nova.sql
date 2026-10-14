CREATE TABLE "exam_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"paper_version_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"skill" text,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"definition" jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deadline" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"interrupted" boolean DEFAULT false NOT NULL,
	"report" jsonb,
	CONSTRAINT "exam_attempt_mode" CHECK ("exam_attempts"."mode" in ('coach','timed_section','preview')),
	CONSTRAINT "exam_attempt_status" CHECK ("exam_attempts"."status" in ('in_progress','submitted')),
	CONSTRAINT "exam_timed_section_skill" CHECK ("exam_attempts"."mode" <> 'timed_section' or ("exam_attempts"."skill" in ('listening','reading','writing','speaking') and "exam_attempts"."deadline" is not null))
);
--> statement-breakpoint
CREATE TABLE "exam_definitions" (
	"code" text PRIMARY KEY NOT NULL,
	"definition" jsonb NOT NULL,
	"revision" text NOT NULL,
	"checked_at" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_feedback" (
	"attempt_id" uuid NOT NULL,
	"task_version_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewer_id" uuid,
	"feedback_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_feedback_attempt_id_task_version_id_pk" PRIMARY KEY("attempt_id","task_version_id"),
	CONSTRAINT "exam_feedback_status" CHECK ("exam_feedback"."status" in ('pending','reviewed'))
);
--> statement-breakpoint
CREATE TABLE "exam_goals" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"exam_code" text NOT NULL,
	"planned_date" text,
	"booking_confirmed" boolean DEFAULT false NOT NULL,
	"daily_minutes" integer NOT NULL,
	"time_zone" text NOT NULL,
	"language" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_goal_minutes" CHECK ("exam_goals"."daily_minutes" between 5 and 120),
	CONSTRAINT "exam_goal_language" CHECK ("exam_goals"."language" in ('en','ar')),
	CONSTRAINT "exam_goal_booking" CHECK (not "exam_goals"."booking_confirmed" or "exam_goals"."planned_date" is not null)
);
--> statement-breakpoint
CREATE TABLE "exam_media_assets" (
	"paper_version_id" uuid NOT NULL,
	"asset_key" text NOT NULL,
	"storage_key" text NOT NULL,
	"file_hash" text NOT NULL,
	"manifest" jsonb NOT NULL,
	"verified_at" timestamp with time zone,
	"inspection" jsonb,
	CONSTRAINT "exam_media_assets_paper_version_id_asset_key_pk" PRIMARY KEY("paper_version_id","asset_key")
);
--> statement-breakpoint
CREATE TABLE "exam_paper_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_code" text NOT NULL,
	"paper_slug" text NOT NULL,
	"version" integer NOT NULL,
	"content_hash" text NOT NULL,
	"content_json" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_paper_positive_version" CHECK ("exam_paper_versions"."version" > 0),
	CONSTRAINT "exam_paper_status" CHECK ("exam_paper_versions"."status" in ('draft','published','retired')),
	CONSTRAINT "exam_paper_hash" CHECK ("exam_paper_versions"."content_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "exam_publication_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paper_version_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_responses" (
	"paper_version_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"task_version_id" uuid NOT NULL,
	"answer_json" jsonb NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_responses_attempt_id_task_version_id_pk" PRIMARY KEY("attempt_id","task_version_id")
);
--> statement-breakpoint
CREATE TABLE "exam_review_signoffs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paper_version_id" uuid NOT NULL,
	"content_hash" text NOT NULL,
	"category" text NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewer_name" text NOT NULL,
	"decision" text NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_review_category" CHECK ("exam_review_signoffs"."category" in ('language','pedagogy','arabic','rights','audio')),
	CONSTRAINT "exam_review_decision" CHECK ("exam_review_signoffs"."decision" in ('approved','changes_requested'))
);
--> statement-breakpoint
CREATE TABLE "exam_task_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paper_version_id" uuid NOT NULL,
	"task_key" text NOT NULL,
	"skill" text NOT NULL,
	"order_index" integer NOT NULL,
	"prompt_json" jsonb NOT NULL,
	"private_solution_json" jsonb NOT NULL,
	CONSTRAINT "exam_task_skill" CHECK ("exam_task_versions"."skill" in ('listening','reading','writing','speaking'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "exam_attempt_create_once" ON "exam_attempts" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_attempt_paper_identity" ON "exam_attempts" USING btree ("paper_version_id","id");--> statement-breakpoint
CREATE INDEX "exam_attempt_user_time" ON "exam_attempts" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_paper_version_unique" ON "exam_paper_versions" USING btree ("paper_slug","version");--> statement-breakpoint
CREATE INDEX "exam_review_latest" ON "exam_review_signoffs" USING btree ("paper_version_id","category","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_task_key_unique" ON "exam_task_versions" USING btree ("paper_version_id","task_key");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_task_paper_identity" ON "exam_task_versions" USING btree ("paper_version_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_task_order_unique" ON "exam_task_versions" USING btree ("paper_version_id","order_index");--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_paper_version_id_exam_paper_versions_id_fk" FOREIGN KEY ("paper_version_id") REFERENCES "public"."exam_paper_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_feedback" ADD CONSTRAINT "exam_feedback_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_feedback" ADD CONSTRAINT "exam_feedback_attempt_id_task_version_id_exam_responses_attempt_id_task_version_id_fk" FOREIGN KEY ("attempt_id","task_version_id") REFERENCES "public"."exam_responses"("attempt_id","task_version_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_goals" ADD CONSTRAINT "exam_goals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_goals" ADD CONSTRAINT "exam_goals_exam_code_exam_definitions_code_fk" FOREIGN KEY ("exam_code") REFERENCES "public"."exam_definitions"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_media_assets" ADD CONSTRAINT "exam_media_assets_paper_version_id_exam_paper_versions_id_fk" FOREIGN KEY ("paper_version_id") REFERENCES "public"."exam_paper_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_paper_versions" ADD CONSTRAINT "exam_paper_versions_exam_code_exam_definitions_code_fk" FOREIGN KEY ("exam_code") REFERENCES "public"."exam_definitions"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_publication_events" ADD CONSTRAINT "exam_publication_events_paper_version_id_exam_paper_versions_id_fk" FOREIGN KEY ("paper_version_id") REFERENCES "public"."exam_paper_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_publication_events" ADD CONSTRAINT "exam_publication_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_responses" ADD CONSTRAINT "exam_response_same_attempt_paper" FOREIGN KEY ("paper_version_id","attempt_id") REFERENCES "public"."exam_attempts"("paper_version_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_responses" ADD CONSTRAINT "exam_response_same_task_paper" FOREIGN KEY ("paper_version_id","task_version_id") REFERENCES "public"."exam_task_versions"("paper_version_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_review_signoffs" ADD CONSTRAINT "exam_review_signoffs_paper_version_id_exam_paper_versions_id_fk" FOREIGN KEY ("paper_version_id") REFERENCES "public"."exam_paper_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_review_signoffs" ADD CONSTRAINT "exam_review_signoffs_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_task_versions" ADD CONSTRAINT "exam_task_versions_paper_version_id_exam_paper_versions_id_fk" FOREIGN KEY ("paper_version_id") REFERENCES "public"."exam_paper_versions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE VIEW publishable_exam_papers AS
SELECT p.* FROM exam_paper_versions p JOIN exam_definitions d ON d.code=p.exam_code
WHERE p.content_json->>'kind' IN ('drill','section')
  AND p.content_json->>'definitionRevision'=d.revision
  AND p.content_json->'rights'->>'verified'='true'
  AND p.content_json->'rights'->>'provenance' IN ('original','licensed','openly_licensed')
  AND p.content_json->'rights'->>'scope'='commercial_saas'
  AND p.content_json->'rights'->>'licenseCode' IN ('DJ-ORIGINAL','CC-BY-4.0','CC0-1.0','LICENSED')
  AND (p.content_json->'rights'->>'provenance'<>'original' OR p.content_json->'rights'->>'licenseCode'='DJ-ORIGINAL')
  AND (p.content_json->'rights'->>'provenance'='original' OR (p.content_json->'rights'->>'sourceUrl' LIKE 'https://%' AND p.content_json->'rights'->>'licenseUrl' LIKE 'https://%'))
  AND (SELECT count(*) FROM exam_task_versions t WHERE t.paper_version_id=p.id)=jsonb_array_length(p.content_json->'tasks')
  AND NOT EXISTS (
    SELECT 1 FROM unnest(ARRAY['language','pedagogy','arabic','rights'] || CASE WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(p.content_json->'tasks') t WHERE t->>'skill'='listening') THEN ARRAY['audio'] ELSE ARRAY[]::text[] END) required(category)
    WHERE NOT EXISTS (SELECT 1 FROM exam_review_signoffs r WHERE r.paper_version_id=p.id AND r.category=required.category AND r.content_hash=p.content_hash AND r.decision='approved'
      AND r.id=(SELECT latest.id FROM exam_review_signoffs latest WHERE latest.paper_version_id=p.id AND latest.category=required.category ORDER BY latest.created_at DESC,latest.id DESC LIMIT 1)))
  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p.content_json->'tasks') t WHERE t->>'skill'='listening' AND (t->>'audioId' IS NULL OR NOT EXISTS (SELECT 1 FROM exam_media_assets m WHERE m.paper_version_id=p.id AND m.asset_key=t->>'audioId' AND m.verified_at IS NOT NULL)))
  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p.content_json->'media') asset WHERE asset->>'licenseCode' NOT IN ('DJ-ORIGINAL','CC-BY-4.0','CC0-1.0','LICENSED') OR NOT EXISTS (SELECT 1 FROM exam_media_assets m WHERE m.paper_version_id=p.id AND m.asset_key=asset->>'id' AND m.manifest=asset AND m.verified_at IS NOT NULL));
--> statement-breakpoint
CREATE VIEW published_exam_catalog AS SELECT * FROM publishable_exam_papers WHERE status='published';
--> statement-breakpoint
CREATE FUNCTION exam_content_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Exam content versions are retained; retire them instead'; END IF;
  IF TG_TABLE_NAME='exam_paper_versions' THEN
    IF (to_jsonb(NEW)-'status'-'published_at') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'published_at') THEN RAISE EXCEPTION 'Exam paper versions are immutable'; END IF;
  ELSIF TG_TABLE_NAME='exam_media_assets' THEN
    IF (to_jsonb(NEW)-'verified_at'-'inspection') IS DISTINCT FROM (to_jsonb(OLD)-'verified_at'-'inspection') THEN RAISE EXCEPTION 'Exam media manifests are immutable'; END IF;
  ELSE RAISE EXCEPTION 'Exam task versions are immutable';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER exam_paper_immutable BEFORE UPDATE OR DELETE ON exam_paper_versions FOR EACH ROW EXECUTE FUNCTION exam_content_immutable();
--> statement-breakpoint
CREATE TRIGGER exam_task_immutable BEFORE UPDATE OR DELETE ON exam_task_versions FOR EACH ROW EXECUTE FUNCTION exam_content_immutable();
--> statement-breakpoint
CREATE TRIGGER exam_media_immutable BEFORE UPDATE OR DELETE ON exam_media_assets FOR EACH ROW EXECUTE FUNCTION exam_content_immutable();
--> statement-breakpoint
CREATE FUNCTION exam_audit_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Exam review and publication records are append-only'; END $$;
--> statement-breakpoint
CREATE TRIGGER exam_reviews_append_only BEFORE UPDATE OR DELETE ON exam_review_signoffs FOR EACH ROW EXECUTE FUNCTION exam_audit_append_only();
--> statement-breakpoint
CREATE TRIGGER exam_publication_append_only BEFORE UPDATE OR DELETE ON exam_publication_events FOR EACH ROW EXECUTE FUNCTION exam_audit_append_only();
--> statement-breakpoint
CREATE FUNCTION exam_response_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE attempt_status text;
BEGIN
  SELECT status INTO attempt_status FROM exam_attempts WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.attempt_id ELSE NEW.attempt_id END FOR UPDATE;
  IF TG_OP='DELETE' AND attempt_status IS NULL THEN RETURN OLD; END IF;
  IF attempt_status IS DISTINCT FROM 'in_progress' THEN RAISE EXCEPTION 'Submitted exam responses are sealed'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER exam_responses_sealed BEFORE INSERT OR UPDATE OR DELETE ON exam_responses FOR EACH ROW EXECUTE FUNCTION exam_response_guard();
--> statement-breakpoint
CREATE FUNCTION exam_attempt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status='submitted' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Submitted exam attempts are immutable'; END IF;
  IF (to_jsonb(NEW)-'revision'-'status'-'submitted_at'-'interrupted'-'report') IS DISTINCT FROM (to_jsonb(OLD)-'revision'-'status'-'submitted_at'-'interrupted'-'report') THEN RAISE EXCEPTION 'Attempt owner, paper and timer are immutable'; END IF;
  IF NEW.status='submitted' AND (NEW.report IS NULL OR NEW.submitted_at IS NULL) THEN RAISE EXCEPTION 'Submission needs a saved report and server timestamp'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER exam_attempts_sealed BEFORE UPDATE ON exam_attempts FOR EACH ROW EXECUTE FUNCTION exam_attempt_guard();
--> statement-breakpoint
CREATE FUNCTION publish_exam_version(target_id uuid,target_hash text,actor uuid,publication_action text) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE target_slug text;
BEGIN
  SELECT paper_slug INTO target_slug FROM exam_paper_versions WHERE id=target_id AND content_hash=target_hash;
  IF target_slug IS NULL THEN RAISE EXCEPTION 'Unknown exam version or hash'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('exam:'||target_slug));
  PERFORM id FROM exam_paper_versions WHERE id=target_id AND content_hash=target_hash FOR UPDATE;
  IF publication_action='publish' THEN
    IF NOT EXISTS (SELECT 1 FROM publishable_exam_papers WHERE id=target_id AND content_hash=target_hash) THEN RAISE EXCEPTION 'Exam publication gates are incomplete'; END IF;
    UPDATE exam_paper_versions SET status='retired' WHERE paper_slug=target_slug AND id<>target_id AND status='published';
    UPDATE exam_paper_versions SET status='published',published_at=coalesce(published_at,now()) WHERE id=target_id;
  ELSIF publication_action='retire' THEN UPDATE exam_paper_versions SET status='retired' WHERE id=target_id;
  ELSE RAISE EXCEPTION 'Unsupported publication action'; END IF;
  INSERT INTO exam_publication_events (paper_version_id,actor_id,action,content_hash) VALUES (target_id,actor,publication_action,target_hash);
  RETURN target_id;
END $$;
