import { TaskError } from "./task.errors";
import type { TaskStatus } from "./task.types";

const transitions: Record<TaskStatus, readonly TaskStatus[]> = {
  DRAFT: ["DRAFT", "QUEUED", "CANCELLED"],
  QUEUED: ["QUEUED", "RUNNING", "CANCELLED", "FAILED"],
  RUNNING: ["RUNNING", "COMPLETED", "FAILED", "CANCELLED"],
  COMPLETED: ["COMPLETED"],
  FAILED: ["FAILED", "QUEUED"],
  CANCELLED: ["CANCELLED", "QUEUED"],
};

export function canTransitionTaskStatus(from: TaskStatus, to: TaskStatus) {
  return transitions[from].includes(to);
}

export function assertTaskStatusTransition(from: TaskStatus, to: TaskStatus) {
  if (!canTransitionTaskStatus(from, to)) {
    throw new TaskError("INVALID_STATUS_TRANSITION", `Cannot transition task from ${from} to ${to}.`);
  }
}
