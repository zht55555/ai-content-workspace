CREATE TYPE "public"."content_platform" AS ENUM('DOUYIN', 'XIAOHONGSHU', 'BILIBILI', 'WECHAT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('DRAFT', 'AI_PROCESSING', 'WAITING_REVIEW', 'NEEDS_REVISION', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."content_version_source" AS ENUM('ORIGINAL', 'AI_GENERATED', 'HUMAN_EDIT', 'AI_REGENERATED');--> statement-breakpoint
CREATE TYPE "public"."review_decision" AS ENUM('APPROVED', 'NEEDS_REVISION', 'REJECTED');--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"raw_content" text NOT NULL,
	"source" text,
	"platform" "content_platform" DEFAULT 'OTHER' NOT NULL,
	"source_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"last_error" text,
	"current_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_item_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"source" "content_version_source" NOT NULL,
	"created_by" uuid NOT NULL,
	"base_version_id" uuid,
	"workflow_run_id" uuid,
	"analysis_result_id" uuid,
	"content_json" jsonb NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_versions_item_number_unique" UNIQUE("content_item_id","version_number")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_item_id" uuid NOT NULL,
	"content_version_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"decision" "review_decision" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "content_item_id" uuid;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_workflow_run_id_workflow_runs_id_fk" FOREIGN KEY ("workflow_run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_analysis_result_id_analysis_results_id_fk" FOREIGN KEY ("analysis_result_id") REFERENCES "public"."analysis_results"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_content_version_id_content_versions_id_fk" FOREIGN KEY ("content_version_id") REFERENCES "public"."content_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_items_user_updated_idx" ON "content_items" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "content_items_user_status_idx" ON "content_items" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "content_items_user_platform_idx" ON "content_items" USING btree ("user_id","platform");--> statement-breakpoint
CREATE INDEX "content_versions_item_created_idx" ON "content_versions" USING btree ("content_item_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "content_versions_one_final_idx" ON "content_versions" USING btree ("content_item_id") WHERE "content_versions"."is_final" = true;--> statement-breakpoint
CREATE INDEX "reviews_content_created_idx" ON "reviews" USING btree ("content_item_id","created_at");--> statement-breakpoint
CREATE INDEX "reviews_version_created_idx" ON "reviews" USING btree ("content_version_id","created_at");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;