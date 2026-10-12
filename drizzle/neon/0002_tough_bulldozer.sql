CREATE TABLE "profile_shares" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"card" jsonb NOT NULL,
	"image" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_shares_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "study_space_invites" (
	"space_id" uuid NOT NULL,
	"seat" integer NOT NULL,
	"token_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "study_space_invites_space_id_seat_pk" PRIMARY KEY("space_id","seat"),
	CONSTRAINT "study_space_invites_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "study_space_invite_seats" CHECK ("study_space_invites"."seat" in (1, 2))
);
--> statement-breakpoint
CREATE TABLE "study_space_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"author_id" uuid,
	"author_name" text NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_space_members" (
	"space_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"seat" integer NOT NULL,
	CONSTRAINT "study_space_members_space_id_user_id_pk" PRIMARY KEY("space_id","user_id"),
	CONSTRAINT "study_space_three_seats" CHECK ("study_space_members"."seat" between 0 and 2)
);
--> statement-breakpoint
CREATE TABLE "study_spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_spaces_owner_id_unique" UNIQUE("owner_id")
);
--> statement-breakpoint
ALTER TABLE "profile_shares" ADD CONSTRAINT "profile_shares_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_space_invites" ADD CONSTRAINT "study_space_invites_space_id_study_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."study_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_space_items" ADD CONSTRAINT "study_space_items_space_id_study_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."study_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_space_items" ADD CONSTRAINT "study_space_items_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "neon_auth"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_space_members" ADD CONSTRAINT "study_space_members_space_id_study_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."study_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_space_members" ADD CONSTRAINT "study_space_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_spaces" ADD CONSTRAINT "study_spaces_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "study_space_items_index" ON "study_space_items" USING btree ("space_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "study_space_seat_unique" ON "study_space_members" USING btree ("space_id","seat");--> statement-breakpoint
CREATE INDEX "study_space_user_index" ON "study_space_members" USING btree ("user_id");