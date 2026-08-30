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
});
