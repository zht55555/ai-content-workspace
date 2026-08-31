import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import type { analysisResults, contentItems, contentVersions, reviews, taskInputs, tasks, users, workflowRuns, workflowSteps } from "./schema";

export type UserRecord = InferSelectModel<typeof users>;
export type TaskRecord = InferSelectModel<typeof tasks>;
export type TaskInputRecord = InferSelectModel<typeof taskInputs>;
export type WorkflowRunRecord = InferSelectModel<typeof workflowRuns>;
export type WorkflowStepRecord = InferSelectModel<typeof workflowSteps>;
export type AnalysisResultRecord = InferSelectModel<typeof analysisResults>;
export type NewTaskRecord = InferInsertModel<typeof tasks>;
export type ContentItemRecord = InferSelectModel<typeof contentItems>;
export type ContentVersionRecord = InferSelectModel<typeof contentVersions>;
export type ReviewRecord = InferSelectModel<typeof reviews>;
