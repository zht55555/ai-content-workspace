import { LLMProviderError } from "@/src/ai/llm/llm-errors";

export type WorkflowErrorCode =
  | "WORKFLOW_NOT_FOUND"
  | "WORKFLOW_DEFINITION_NOT_FOUND"
  | "WORKFLOW_ALREADY_RUNNING"
  | "WORKFLOW_STEP_FAILED"
  | "WORKFLOW_TIMEOUT"
  | "WORKFLOW_CANCELLED"
  | "WORKFLOW_INVALID_STATE"
  | "TASK_ALREADY_RUNNING";

export class WorkflowError extends Error {
  constructor(public readonly code: WorkflowErrorCode, message: string, public readonly retryable = false, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "WorkflowError";
  }
}

export function isRetryableWorkflowError(error: unknown) {
  return error instanceof LLMProviderError && error.retryable;
}
