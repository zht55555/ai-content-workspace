export class TaskError extends Error {
  constructor(public readonly code: "TASK_NOT_FOUND" | "INVALID_STATUS_TRANSITION", message: string) {
    super(message);
    this.name = "TaskError";
  }
}
