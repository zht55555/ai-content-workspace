import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const taskStatusEnum = pgEnum("task_status", [
  "DRAFT",
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export const workflowRunStatusEnum = pgEnum("workflow_run_status", [
  "PENDING",
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export const workflowStepStatusEnum = pgEnum("workflow_step_status", [
  "PENDING",
  "RUNNING",
  "SUCCESS",
  "FAILED",
  "SKIPPED",
]);

export const contentTypeEnum = pgEnum("content_type", ["TRANSCRIPT", "COPY", "TOPIC"]);
export const contentPlatformEnum = pgEnum("content_platform", ["DOUYIN", "XIAOHONGSHU", "BILIBILI", "WECHAT", "OTHER"]);
export const contentStatusEnum = pgEnum("content_status", ["DRAFT", "AI_PROCESSING", "WAITING_REVIEW", "NEEDS_REVISION", "APPROVED", "REJECTED", "PUBLISHED", "ARCHIVED"]);
export const contentVersionSourceEnum = pgEnum("content_version_source", ["ORIGINAL", "AI_GENERATED", "HUMAN_EDIT", "AI_REGENERATED"]);
export const reviewDecisionEnum = pgEnum("review_decision", ["APPROVED", "NEEDS_REVISION", "REJECTED"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contentItems = pgTable(
  "content_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    title: text("title").notNull(),
    rawContent: text("raw_content").notNull(),
    source: text("source"),
    platform: contentPlatformEnum("platform").default("OTHER").notNull(),
    sourceUrl: text("source_url"),
    tags: jsonb("tags").default([]).notNull(),
    status: contentStatusEnum("status").default("DRAFT").notNull(),
    lastError: text("last_error"),
    currentVersionId: uuid("current_version_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("content_items_user_updated_idx").on(table.userId, table.updatedAt), index("content_items_user_status_idx").on(table.userId, table.status), index("content_items_user_platform_idx").on(table.userId, table.platform)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    contentItemId: uuid("content_item_id").references(() => contentItems.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    status: taskStatusEnum("status").default("DRAFT").notNull(),
    contentType: contentTypeEnum("content_type").notNull(),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("tasks_user_id_idx").on(table.userId), index("tasks_updated_at_idx").on(table.updatedAt)],
);

export const taskInputs = pgTable("task_inputs", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }).unique(),
  rawContent: text("raw_content").notNull(),
  normalizedContent: text("normalized_content"),
  contentType: contentTypeEnum("content_type").notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    workflowType: text("workflow_type").default("DEMO_CONTENT_WORKFLOW").notNull(),
    status: workflowRunStatusEnum("status").default("QUEUED").notNull(),
    inputJson: jsonb("input_json"),
    outputJson: jsonb("output_json"),
    currentStep: text("current_step"),
    retryCount: integer("retry_count").default(0).notNull(),
    totalTokens: integer("total_tokens").default(0).notNull(),
    durationMs: integer("duration_ms"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("workflow_runs_task_id_idx").on(table.taskId),
    uniqueIndex("workflow_runs_one_active_per_task_idx").on(table.taskId).where(sql`${table.status} in ('PENDING', 'QUEUED', 'RUNNING')`),
  ],
);

export const workflowSteps = pgTable(
  "workflow_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workflowRunId: uuid("workflow_run_id").notNull().references(() => workflowRuns.id, { onDelete: "cascade" }),
    stepKey: text("step_key").notNull(),
    stepType: text("step_type").notNull(),
    title: text("title").notNull(),
    stepOrder: integer("step_order").notNull(),
    status: workflowStepStatusEnum("status").default("PENDING").notNull(),
    inputJson: jsonb("input_json"),
    outputJson: jsonb("output_json"),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("workflow_steps_run_key_unique").on(table.workflowRunId, table.stepKey),
    index("workflow_steps_run_id_idx").on(table.workflowRunId),
  ],
);

export const analysisResults = pgTable(
  "analysis_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    workflowRunId: uuid("workflow_run_id").notNull().references(() => workflowRuns.id, { onDelete: "cascade" }),
    resultType: text("result_type").default("CONTENT_ANALYSIS").notNull(),
    schemaVersion: text("schema_version").default("content-analysis-result.v1").notNull(),
    resultJson: jsonb("result_json").notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("analysis_results_workflow_run_unique").on(table.workflowRunId), index("analysis_results_task_created_idx").on(table.taskId, table.createdAt)],
);

export const contentVersions = pgTable(
  "content_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentItemId: uuid("content_item_id").notNull().references(() => contentItems.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    source: contentVersionSourceEnum("source").notNull(),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    baseVersionId: uuid("base_version_id"),
    workflowRunId: uuid("workflow_run_id").references(() => workflowRuns.id, { onDelete: "set null" }),
    analysisResultId: uuid("analysis_result_id").references(() => analysisResults.id, { onDelete: "set null" }),
    contentJson: jsonb("content_json").notNull(),
    isFinal: boolean("is_final").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("content_versions_item_number_unique").on(table.contentItemId, table.versionNumber), index("content_versions_item_created_idx").on(table.contentItemId, table.createdAt), uniqueIndex("content_versions_one_final_idx").on(table.contentItemId).where(sql`${table.isFinal} = true`)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentItemId: uuid("content_item_id").notNull().references(() => contentItems.id, { onDelete: "cascade" }),
    contentVersionId: uuid("content_version_id").notNull().references(() => contentVersions.id, { onDelete: "restrict" }),
    reviewerId: uuid("reviewer_id").notNull().references(() => users.id),
    decision: reviewDecisionEnum("decision").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("reviews_content_created_idx").on(table.contentItemId, table.createdAt), index("reviews_version_created_idx").on(table.contentVersionId, table.createdAt)],
);

export const promptTemplates = pgTable(
  "prompt_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    promptKey: text("prompt_key").notNull(),
    version: integer("version").notNull(),
    systemPrompt: text("system_prompt").notNull(),
    inputSchemaJson: jsonb("input_schema_json").notNull(),
    outputSchemaJson: jsonb("output_schema_json").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("prompt_templates_key_version_unique").on(table.promptKey, table.version)],
);

export const llmUsages = pgTable("llm_usages", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  workflowRunId: uuid("workflow_run_id").notNull().references(() => workflowRuns.id, { onDelete: "cascade" }),
  workflowStepId: uuid("workflow_step_id").references(() => workflowSteps.id, { onDelete: "set null" }),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  totalTokens: integer("total_tokens"),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];
export type WorkflowRunStatus = (typeof workflowRunStatusEnum.enumValues)[number];
export type WorkflowStepStatus = (typeof workflowStepStatusEnum.enumValues)[number];
export type ContentPlatform = (typeof contentPlatformEnum.enumValues)[number];
export type ContentStatus = (typeof contentStatusEnum.enumValues)[number];
export type ContentVersionSource = (typeof contentVersionSourceEnum.enumValues)[number];
export type ReviewDecision = (typeof reviewDecisionEnum.enumValues)[number];
