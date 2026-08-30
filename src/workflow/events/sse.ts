import { serializeWorkflowEvent } from "./workflow-event-serializer";
import type { WorkflowEvent } from "./workflow-event.types";

export function encodeSseEvent(event: WorkflowEvent): string {
  return `id: ${event.eventId}\nevent: ${event.eventType}\ndata: ${serializeWorkflowEvent(event)}\n\n`;
}

export function encodeSseComment(comment: string): string {
  return `: ${comment}\n\n`;
}
