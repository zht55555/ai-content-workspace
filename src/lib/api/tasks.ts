import type { TaskType, TaskView } from "@/src/modules/task/task.types";
import { requestJson } from "./client";

export type TaskListItem = { id: string; title: string; type: TaskType; status: TaskView["status"]; createdAt: string; updatedAt: string };
export type TaskListResponse = { items: TaskListItem[]; page: number; pageSize: number; total: number; totalPages: number };

export function listTasks() {
  return requestJson<TaskListResponse>("/api/tasks?page=1&pageSize=100");
}

export function getTask(taskId: string) {
  return requestJson<TaskView>(`/api/tasks/${encodeURIComponent(taskId)}`);
}

export function createTask(input: { title: string; type: TaskType; input: { inputType: "TRANSCRIPT" | "COPY" | "TOPIC"; content: string } }) {
  return requestJson<TaskView>("/api/tasks", { method: "POST", body: JSON.stringify(input) });
}

export function deleteTask(taskId: string) {
  return requestJson<void>(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
}
