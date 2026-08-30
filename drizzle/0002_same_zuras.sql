ALTER TYPE "public"."workflow_run_status" ADD VALUE 'PENDING' BEFORE 'QUEUED';--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD COLUMN "workflow_type" text DEFAULT 'DEMO_CONTENT_WORKFLOW' NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD COLUMN "input_json" jsonb;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD COLUMN "output_json" jsonb;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD COLUMN "step_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD COLUMN "title" text NOT NULL;