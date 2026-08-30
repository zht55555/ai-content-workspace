import { describe, expect, it } from "vitest";

import { reduceWorkflowRunEvent } from "@/src/workflow/events/workflow-run.reducer";
import type { WorkflowRunSnapshot } from "@/src/workflow/events/workflow-run.reducer";
import type { WorkflowEvent } from "@/src/workflow/events/workflow-event.types";

const snapshot: WorkflowRunSnapshot = {
  id: "run-1",
  taskId: "task-1",
  status: "RUNNING",
  steps: [
    { id: "step-1", key: "content-analysis", title: "内容分析", sequence: 1, status: "RUNNING", retryCount: 0 },
    { id: "step-2", key: "hook-analysis", title: "钩子分析", sequence: 2, status: "PENDING", retryCount: 0 },
  ],
};

const step = { id: "step-1", key: "content-analysis", sequence: 1, title: "内容分析" };

describe("reduceWorkflowRunEvent", () => {
  it("updates a step to RUNNING on step.started", () => {
    const event: WorkflowEvent = { eventId: "event-1", eventType: "workflow.step.started", workflowRunId: "run-1", taskId: "task-1", timestamp: "2026-08-30T00:00:00.000Z", step };

    expect(reduceWorkflowRunEvent(snapshot, event).steps[0]).toMatchObject({ status: "RUNNING", startedAt: event.timestamp });
  });

  it("updates a step to SUCCESS on step.completed", () => {
    const event: WorkflowEvent = { eventId: "event-2", eventType: "workflow.step.completed", workflowRunId: "run-1", taskId: "task-1", timestamp: "2026-08-30T00:01:00.000Z", step, retryCount: 1 };

    expect(reduceWorkflowRunEvent(snapshot, event).steps[0]).toMatchObject({ status: "SUCCESS", completedAt: event.timestamp, retryCount: 1 });
  });

  it("updates a step to FAILED on step.failed", () => {
    const event: WorkflowEvent = { eventId: "event-3", eventType: "workflow.step.failed", workflowRunId: "run-1", taskId: "task-1", timestamp: "2026-08-30T00:02:00.000Z", step, retryCount: 2, error: { code: "WORKFLOW_STEP_FAILED", message: "失败" } };

    expect(reduceWorkflowRunEvent(snapshot, event).steps[0]).toMatchObject({ status: "FAILED", errorMessage: "失败", retryCount: 2 });
  });

  it("updates workflow status on terminal events", () => {
    const event: WorkflowEvent = { eventId: "event-4", eventType: "workflow.completed", workflowRunId: "run-1", taskId: "task-1", timestamp: "2026-08-30T00:03:00.000Z" };

    expect(reduceWorkflowRunEvent(snapshot, event).status).toBe("COMPLETED");
  });

  it("ignores events from another workflow run", () => {
    const event: WorkflowEvent = { eventId: "event-5", eventType: "workflow.completed", workflowRunId: "run-2", taskId: "task-2", timestamp: "2026-08-30T00:03:00.000Z" };

    expect(reduceWorkflowRunEvent(snapshot, event)).toBe(snapshot);
  });
});
