CREATE TABLE "challenges" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"lang" varchar(8) NOT NULL,
	"start_title" text NOT NULL,
	"target_title" text NOT NULL,
	"created_by_user_id" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_steps" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"run_id" varchar(32) NOT NULL,
	"step_number" integer NOT NULL,
	"from_title" text NOT NULL,
	"to_title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"challenge_id" varchar(32) NOT NULL,
	"user_id" varchar(32),
	"guest_alias" text,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"current_title" text NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"duration_seconds" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"abandoned_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(32) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_page_cache" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"lang" varchar(8) NOT NULL,
	"title" text NOT NULL,
	"canonical_title" text NOT NULL,
	"html" text NOT NULL,
	"links" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_steps" ADD CONSTRAINT "run_steps_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "challenges_lang_titles_idx" ON "challenges" USING btree ("lang","start_title","target_title");--> statement-breakpoint
CREATE INDEX "run_steps_run_id_idx" ON "run_steps" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "run_steps_run_step_unique" ON "run_steps" USING btree ("run_id","step_number");--> statement-breakpoint
CREATE INDEX "runs_challenge_id_idx" ON "runs" USING btree ("challenge_id");--> statement-breakpoint
CREATE INDEX "runs_user_id_idx" ON "runs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "runs_leaderboard_idx" ON "runs" USING btree ("status","clicks","duration_seconds");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "wiki_page_cache_lang_title_unique" ON "wiki_page_cache" USING btree ("lang","title");--> statement-breakpoint
CREATE INDEX "wiki_page_cache_expires_at_idx" ON "wiki_page_cache" USING btree ("expires_at");