ALTER TABLE "llm_usages" ALTER COLUMN "input_tokens" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "llm_usages" ALTER COLUMN "input_tokens" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "llm_usages" ALTER COLUMN "output_tokens" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "llm_usages" ALTER COLUMN "output_tokens" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "llm_usages" ALTER COLUMN "total_tokens" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "llm_usages" ALTER COLUMN "total_tokens" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_results" ADD COLUMN "result_type" text DEFAULT 'CONTENT_ANALYSIS' NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_results" ADD COLUMN "schema_version" text DEFAULT 'content-analysis-result.v1' NOT NULL;--> statement-breakpoint
ALTER TABLE "llm_usages" ADD COLUMN "task_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "llm_usages" ADD CONSTRAINT "llm_usages_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analysis_results_task_created_idx" ON "analysis_results" USING btree ("task_id","created_at");--> statement-breakpoint
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_workflow_run_unique" UNIQUE("workflow_run_id");