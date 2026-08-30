export type WorkflowEventType =
  | "workflow.started"
  | "workflow.completed"
  | "workflow.failed"
  | "workflow.cancelled"
  | "workflow.step.started"
  | "workflow.step.progress"
  | "workflow.step.completed"
  | "workflow.step.failed"
  | "workflow.step.retrying";

export type WorkflowEventBase = {
  eventId: string;
  workflowRunId: string;
  taskId: string;
  timestamp: string;
};

export type WorkflowStepEventBase = WorkflowEventBase & {
  step: { id: string; key: string; sequence: number; title: string };
};

export type WorkflowErrorSummary = { code: string; message: string };

export type WorkflowEvent =
  | (WorkflowEventBase & { eventType: "workflow.started"; workflowType: string })
  | (WorkflowEventBase & { eventType: "workflow.completed"; output?: unknown; resultAvailable?: boolean })
  | (WorkflowEventBase & { eventType: "workflow.failed"; error: WorkflowErrorSummary })
  | (WorkflowEventBase & { eventType: "workflow.cancelled"; reason?: string })
  | (WorkflowStepEventBase & { eventType: "workflow.step.started" })
  | (WorkflowStepEventBase & { eventType: "workflow.step.progress"; message: string })
  | (WorkflowStepEventBase & { eventType: "workflow.step.completed"; retryCount: number; output?: unknown })
  | (WorkflowStepEventBase & { eventType: "workflow.step.failed"; retryCount: number; error: WorkflowErrorSummary })
  | (WorkflowStepEventBase & { eventType: "workflow.step.retrying"; retryCount: number; error: WorkflowErrorSummary });

export type WorkflowEventInput =
  | Omit<Extract<WorkflowEvent, { eventType: "workflow.started" }>, "eventId" | "timestamp">
  | Omit<Extract<WorkflowEvent, { eventType: "workflow.completed" }>, "eventId" | "timestamp">
  | Omit<Extract<WorkflowEvent, { eventType: "workflow.failed" }>, "eventId" | "timestamp">
  | Omit<Extract<WorkflowEvent, { eventType: "workflow.cancelled" }>, "eventId" | "timestamp">
  | Omit<Extract<WorkflowEvent, { eventType: "workflow.step.started" }>, "eventId" | "timestamp">
  | Omit<Extract<WorkflowEvent, { eventType: "workflow.step.progress" }>, "eventId" | "timestamp">
  | Omit<Extract<WorkflowEvent, { eventType: "workflow.step.completed" }>, "eventId" | "timestamp">
  | Omit<Extract<WorkflowEvent, { eventType: "workflow.step.failed" }>, "eventId" | "timestamp">
  | Omit<Extract<WorkflowEvent, { eventType: "workflow.step.retrying" }>, "eventId" | "timestamp">;

export type WorkflowEventListener = (event: WorkflowEvent) => void | Promise<void>;
