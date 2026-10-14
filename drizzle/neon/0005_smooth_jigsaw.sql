CREATE TABLE "sentence_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"german" text NOT NULL,
	"signature" text DEFAULT '' NOT NULL,
	"signature_style" text DEFAULT 'written' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sentence_posts_author_sentence" UNIQUE("author_id","german"),
	CONSTRAINT "sentence_posts_text_length" CHECK (length(trim("sentence_posts"."german")) between 1 and 500),
	CONSTRAINT "sentence_posts_signature_length" CHECK (length("sentence_posts"."signature")<=60),
	CONSTRAINT "sentence_posts_signature_style" CHECK ("sentence_posts"."signature_style" in ('written','clean')),
	CONSTRAINT "sentence_posts_revision" CHECK ("sentence_posts"."revision">=0)
);
--> statement-breakpoint
ALTER TABLE "sentence_posts" ADD CONSTRAINT "sentence_posts_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sentence_posts_feed" ON "sentence_posts" USING btree ("created_at","id");
--> statement-breakpoint
-- Serialize each author's publication batches before checking the active limit.
-- This is an invoker function: application authentication supplies p_author.
CREATE FUNCTION public.publish_sentence_posts(p_author uuid, p_sentences text[], p_signature text, p_style text)
RETURNS TABLE(post_id uuid) LANGUAGE plpgsql AS $$
DECLARE new_count integer; current_count integer;
BEGIN
  IF coalesce(array_length(p_sentences,1),0) NOT BETWEEN 1 AND 5
    OR p_signature IS NULL OR length(p_signature)>60 OR p_style NOT IN ('written','clean')
    OR EXISTS(SELECT 1 FROM unnest(p_sentences) s WHERE s IS NULL OR length(trim(s)) NOT BETWEEN 1 AND 500)
  THEN RAISE EXCEPTION 'Invalid public sentence batch'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_author::text, 418));
  SELECT count(*) INTO current_count FROM public.sentence_posts WHERE author_id=p_author;
  SELECT count(*) INTO new_count FROM (SELECT DISTINCT trim(s) AS german FROM unnest(p_sentences) s) incoming
    WHERE NOT EXISTS (SELECT 1 FROM public.sentence_posts existing WHERE existing.author_id=p_author AND existing.german=incoming.german);
  IF current_count+new_count>50 THEN RAISE EXCEPTION 'You can share up to 50 public sentences'; END IF;
  INSERT INTO public.sentence_posts(author_id,german,signature,signature_style)
    SELECT p_author,trim(s),trim(p_signature),p_style FROM unnest(p_sentences) s
    ON CONFLICT ON CONSTRAINT sentence_posts_author_sentence DO NOTHING;
  RETURN QUERY SELECT existing.id FROM public.sentence_posts existing WHERE existing.author_id=p_author AND existing.german=ANY(p_sentences);
END;
$$;
