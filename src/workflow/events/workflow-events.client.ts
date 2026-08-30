import type { WorkflowEvent } from "./workflow-event.types";

export type WorkflowEventSubscriptionHandlers = {
  onOpen?: () => void;
  onEvent: (event: WorkflowEvent) => void;
  onError?: () => void;
};

const eventTypes: WorkflowEvent["eventType"][] = [
  "workflow.started",
  "workflow.completed",
  "workflow.failed",
  "workflow.cancelled",
  "workflow.step.started",
  "workflow.step.progress",
  "workflow.step.completed",
  "workflow.step.failed",
  "workflow.step.retrying",
];

export function subscribeToWorkflowEvents(runId: string, handlers: WorkflowEventSubscriptionHandlers): () => void {
  const source = new EventSource(`/api/workflow-runs/${encodeURIComponent(runId)}/events`);
  source.onopen = () => handlers.onOpen?.();
  source.onerror = () => handlers.onError?.();
  const listeners = eventTypes.map((eventType) => {
    const listener = (event: Event) => {
      try {
        handlers.onEvent(JSON.parse((event as MessageEvent<string>).data) as WorkflowEvent);
      } catch {
        handlers.onError?.();
      }
    };
    source.addEventListener(eventType, listener);
    return { eventType, listener };
  });

  return () => {
    for (const { eventType, listener } of listeners) source.removeEventListener(eventType, listener);
    source.close();
  };
}
