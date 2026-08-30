import { WorkflowEventSerializationError } from "./workflow-event.errors";
import type { WorkflowEvent } from "./workflow-event.types";

const commonFields = (event: WorkflowEvent) => ({
  eventId: event.eventId,
  workflowRunId: event.workflowRunId,
  taskId: event.taskId,
  timestamp: event.timestamp,
});

export function serializeWorkflowEvent(event: WorkflowEvent): string {
  try {
    switch (event.eventType) {
      case "workflow.started":
        return JSON.stringify({ ...commonFields(event), eventType: event.eventType, workflowType: event.workflowType });
      case "workflow.completed":
        return JSON.stringify({ ...commonFields(event), eventType: event.eventType });
      case "workflow.failed":
        return JSON.stringify({ ...commonFields(event), eventType: event.eventType, error: event.error });
      case "workflow.cancelled":
        return JSON.stringify({ ...commonFields(event), eventType: event.eventType, reason: event.reason });
      case "workflow.step.started":
        return JSON.stringify({ ...commonFields(event), eventType: event.eventType, step: event.step });
      case "workflow.step.progress":
        return JSON.stringify({ ...commonFields(event), eventType: event.eventType, step: event.step, message: event.message });
      case "workflow.step.completed":
        return JSON.stringify({ ...commonFields(event), eventType: event.eventType, step: event.step, retryCount: event.retryCount });
      case "workflow.step.failed":
        return JSON.stringify({ ...commonFields(event), eventType: event.eventType, step: event.step, retryCount: event.retryCount, error: event.error });
      case "workflow.step.retrying":
        return JSON.stringify({ ...commonFields(event), eventType: event.eventType, step: event.step, retryCount: event.retryCount, error: event.error });
    }
  } catch (cause) {
    throw new WorkflowEventSerializationError("Workflow event could not be serialized.", { cause });
  }
}
