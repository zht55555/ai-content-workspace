import type { WorkflowEvent } from "./workflow-event.types";

export type WorkflowRunSnapshot = {
  id: string;
  taskId: string;
  status: "PENDING" | "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  resultAvailable?: boolean;
  error?: string | null;
  steps: Array<{
    id: string;
    key: string;
    title: string;
    sequence: number;
    status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED";
    retryCount: number;
    startedAt?: string | null;
    completedAt?: string | null;
    errorMessage?: string | null;
  }>;
};

export function reduceWorkflowRunEvent(snapshot: WorkflowRunSnapshot, event: WorkflowEvent): WorkflowRunSnapshot {
  if (event.workflowRunId !== snapshot.id) return snapshot;

  if (event.eventType === "workflow.completed") return { ...snapshot, status: "COMPLETED", resultAvailable: event.resultAvailable ?? snapshot.resultAvailable };
  if (event.eventType === "workflow.failed") return { ...snapshot, status: "FAILED", error: event.error.message };
  if (event.eventType === "workflow.cancelled") return { ...snapshot, status: "CANCELLED", error: event.reason ?? null };
  if (!event.eventType.startsWith("workflow.step.")) return snapshot;
  const stepEvent = event as Extract<WorkflowEvent, { step: { id: string; key: string; sequence: number; title: string } }>;

  const steps = snapshot.steps.map((current) => {
    if (current.id !== stepEvent.step.id && current.key !== stepEvent.step.key) return current;
    if (stepEvent.eventType === "workflow.step.started") return { ...current, status: "RUNNING" as const, startedAt: stepEvent.timestamp };
    if (stepEvent.eventType === "workflow.step.retrying") return { ...current, status: "RUNNING" as const, retryCount: stepEvent.retryCount, errorMessage: stepEvent.error.message };
    if (stepEvent.eventType === "workflow.step.completed") return { ...current, status: "SUCCESS" as const, retryCount: stepEvent.retryCount, completedAt: stepEvent.timestamp, errorMessage: null };
    if (stepEvent.eventType === "workflow.step.failed") return { ...current, status: "FAILED" as const, retryCount: stepEvent.retryCount, completedAt: stepEvent.timestamp, errorMessage: stepEvent.error.message };
    return current;
  });

  return { ...snapshot, steps };
}
