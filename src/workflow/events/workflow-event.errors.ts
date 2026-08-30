export class WorkflowEventSerializationError extends Error {
  readonly code = "EVENT_SERIALIZATION_ERROR" as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "WorkflowEventSerializationError";
  }
}
