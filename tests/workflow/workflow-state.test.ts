import { describe, expect, it } from "vitest";

import { canTransitionWorkflowRunStatus, canTransitionWorkflowStepStatus } from "@/src/workflow/workflow-state";

describe("workflow state transitions", () => {
  it("allows a run to progress from pending to completed or failed", () => {
    expect(canTransitionWorkflowRunStatus("PENDING", "RUNNING")).toBe(true);
    expect(canTransitionWorkflowRunStatus("RUNNING", "COMPLETED")).toBe(true);
    expect(canTransitionWorkflowRunStatus("COMPLETED", "RUNNING")).toBe(false);
  });

  it("allows a step to succeed or fail but never regress", () => {
    expect(canTransitionWorkflowStepStatus("PENDING", "RUNNING")).toBe(true);
    expect(canTransitionWorkflowStepStatus("RUNNING", "SUCCESS")).toBe(true);
    expect(canTransitionWorkflowStepStatus("SUCCESS", "RUNNING")).toBe(false);
  });
});
