import { WorkflowEngine } from "./workflow-engine";
import { workflowEventBus } from "./events/in-memory-workflow-event-bus";

type WorkflowRuntime = {
  engine: WorkflowEngine;
  eventBus: typeof workflowEventBus;
};

const globalForWorkflowRuntime = globalThis as typeof globalThis & { workflowRuntime?: WorkflowRuntime };

export const workflowRuntime =
  globalForWorkflowRuntime.workflowRuntime ??
  (globalForWorkflowRuntime.workflowRuntime = {
    eventBus: workflowEventBus,
    engine: new WorkflowEngine({ eventPublisher: workflowEventBus }),
  });
