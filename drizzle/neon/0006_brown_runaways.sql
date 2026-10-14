ALTER TABLE "sentence_posts" DROP CONSTRAINT "sentence_posts_signature_style";--> statement-breakpoint
ALTER TABLE "sentence_posts" ADD COLUMN "signature_drawing" jsonb;--> statement-breakpoint
ALTER TABLE "sentence_posts" ADD CONSTRAINT "sentence_posts_drawing_shape" CHECK ("sentence_posts"."signature_drawing" is null or jsonb_typeof("sentence_posts"."signature_drawing")='object');--> statement-breakpoint
ALTER TABLE "sentence_posts" ADD CONSTRAINT "sentence_posts_drawing_style" CHECK (("sentence_posts"."signature_style"='drawn')=("sentence_posts"."signature_drawing" is not null));--> statement-breakpoint
ALTER TABLE "sentence_posts" ADD CONSTRAINT "sentence_posts_signature_style" CHECK ("sentence_posts"."signature_style" in ('drawn','written','clean'));
--> statement-breakpoint
-- Keep the four-argument function for existing clients; new clients include the
-- validated drawing as the fifth argument. Existing text signatures stay valid.
CREATE FUNCTION public.publish_sentence_posts(p_author uuid, p_sentences text[], p_signature text, p_style text, p_drawing jsonb)
RETURNS TABLE(post_id uuid) LANGUAGE plpgsql AS $$
DECLARE new_count integer; current_count integer;
BEGIN
  IF coalesce(array_length(p_sentences,1),0) NOT BETWEEN 1 AND 5
    OR p_signature IS NULL OR length(p_signature)>60 OR p_style NOT IN ('drawn','written','clean')
    OR (p_style='drawn')<>(p_drawing IS NOT NULL)
    OR (p_drawing IS NOT NULL AND jsonb_typeof(p_drawing)<>'object')
    OR EXISTS(SELECT 1 FROM unnest(p_sentences) s WHERE s IS NULL OR length(trim(s)) NOT BETWEEN 1 AND 500)
  THEN RAISE EXCEPTION 'Invalid public sentence signature batch'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_author::text, 418));
  SELECT count(*) INTO current_count FROM public.sentence_posts WHERE author_id=p_author;
  SELECT count(*) INTO new_count FROM (SELECT DISTINCT trim(s) AS german FROM unnest(p_sentences) s) incoming
    WHERE NOT EXISTS (SELECT 1 FROM public.sentence_posts existing WHERE existing.author_id=p_author AND existing.german=incoming.german);
  IF current_count+new_count>50 THEN RAISE EXCEPTION 'You can share up to 50 public sentences'; END IF;
  INSERT INTO public.sentence_posts(author_id,german,signature,signature_style,signature_drawing)
    SELECT p_author,trim(s),trim(p_signature),p_style,p_drawing FROM unnest(p_sentences) s
    ON CONFLICT ON CONSTRAINT sentence_posts_author_sentence DO NOTHING;
  RETURN QUERY SELECT existing.id FROM public.sentence_posts existing WHERE existing.author_id=p_author AND existing.german=ANY(p_sentences);
END;
$$;
