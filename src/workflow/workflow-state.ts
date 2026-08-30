import type { WorkflowRunStatus, WorkflowStepStatus } from "@/src/db/schema";

const runTransitions: Record<WorkflowRunStatus, readonly WorkflowRunStatus[]> = {
  PENDING: ["PENDING", "RUNNING", "FAILED", "CANCELLED"],
  QUEUED: ["QUEUED", "RUNNING", "FAILED", "CANCELLED"],
  RUNNING: ["RUNNING", "COMPLETED", "FAILED", "CANCELLED"],
  COMPLETED: ["COMPLETED"],
  FAILED: ["FAILED"],
  CANCELLED: ["CANCELLED"],
};

const stepTransitions: Record<WorkflowStepStatus, readonly WorkflowStepStatus[]> = {
  PENDING: ["PENDING", "RUNNING", "SKIPPED", "FAILED"],
  RUNNING: ["RUNNING", "SUCCESS", "FAILED"],
  SUCCESS: ["SUCCESS"],
  FAILED: ["FAILED"],
  SKIPPED: ["SKIPPED"],
};

export function canTransitionWorkflowRunStatus(from: WorkflowRunStatus, to: WorkflowRunStatus) {
  return runTransitions[from].includes(to);
}

export function canTransitionWorkflowStepStatus(from: WorkflowStepStatus, to: WorkflowStepStatus) {
  return stepTransitions[from].includes(to);
}
