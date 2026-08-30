import type { WorkflowEvent } from "./workflow-event.types";

export interface WorkflowEventPublisher {
  publish(event: WorkflowEvent): void | Promise<void>;
}
