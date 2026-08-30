import type { WorkflowEvent, WorkflowEventListener } from "./workflow-event.types";
import type { WorkflowEventPublisher } from "./workflow-event.publisher";

export class InMemoryWorkflowEventBus implements WorkflowEventPublisher {
  private readonly listeners = new Map<string, Set<WorkflowEventListener>>();

  subscribe(workflowRunId: string, listener: WorkflowEventListener): () => void {
    const runListeners = this.listeners.get(workflowRunId) ?? new Set<WorkflowEventListener>();
    runListeners.add(listener);
    this.listeners.set(workflowRunId, runListeners);
    return () => {
      runListeners.delete(listener);
      if (runListeners.size === 0) this.listeners.delete(workflowRunId);
    };
  }

  async publish(event: WorkflowEvent): Promise<void> {
    const runListeners = this.listeners.get(event.workflowRunId);
    if (!runListeners) return;
    for (const listener of [...runListeners]) {
      try {
        await listener(event);
      } catch (error) {
        console.error("Workflow event listener failed.", error);
      }
    }
  }
}

export const workflowEventBus = new InMemoryWorkflowEventBus();
