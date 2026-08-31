import * as schema from "@/src/db/schema";
import { describe, expect, it } from "vitest";

describe("database schema contract", () => {
  it("exports every Phase 1 table", () => {
    expect(schema.users).toBeDefined();
    expect(schema.tasks).toBeDefined();
    expect(schema.taskInputs).toBeDefined();
    expect(schema.workflowRuns).toBeDefined();
    expect(schema.workflowSteps).toBeDefined();
    expect(schema.analysisResults).toBeDefined();
    expect(schema.promptTemplates).toBeDefined();
    expect(schema.llmUsages).toBeDefined();
  });

  it("defines the approved task and workflow step states", () => {
    expect(schema.taskStatusEnum.enumValues).toEqual([
      "DRAFT",
      "QUEUED",
      "RUNNING",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
    ]);
    expect(schema.workflowStepStatusEnum.enumValues).toEqual([
      "PENDING",
      "RUNNING",
      "SUCCESS",
      "FAILED",
      "SKIPPED",
    ]);
  });

  it("exposes result versioning and nullable usage fields", () => {
    expect(schema.analysisResults.resultType).toBeDefined();
    expect(schema.analysisResults.schemaVersion).toBeDefined();
    expect(schema.llmUsages.taskId).toBeDefined();
    expect(schema.llmUsages.inputTokens.notNull).toBe(false);
    expect(schema.llmUsages.outputTokens.notNull).toBe(false);
    expect(schema.llmUsages.totalTokens.notNull).toBe(false);
  });

  it("defines the Phase A business domain enums and tables", async () => {
    const schema = await import("@/src/db/schema");

    expect(schema.contentPlatformEnum.enumValues).toEqual(["DOUYIN", "XIAOHONGSHU", "BILIBILI", "WECHAT", "OTHER"]);
    expect(schema.contentStatusEnum.enumValues).toEqual(["DRAFT", "AI_PROCESSING", "WAITING_REVIEW", "NEEDS_REVISION", "APPROVED", "REJECTED", "PUBLISHED", "ARCHIVED"]);
    expect(schema.contentVersionSourceEnum.enumValues).toEqual(["ORIGINAL", "AI_GENERATED", "HUMAN_EDIT", "AI_REGENERATED"]);
    expect(schema.reviewDecisionEnum.enumValues).toEqual(["APPROVED", "NEEDS_REVISION", "REJECTED"]);
    expect(schema.contentItems).toBeDefined();
    expect(schema.contentVersions).toBeDefined();
    expect(schema.reviews).toBeDefined();
    expect(schema.tasks.contentItemId).toBeDefined();
  });
});
