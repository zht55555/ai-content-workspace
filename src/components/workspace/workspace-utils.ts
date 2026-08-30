import type { TaskStatus, TaskType } from "@/src/modules/task/task.types";

export const taskTypeLabels: Record<TaskType, string> = {
  TRANSCRIPT_ANALYSIS: "视频逐字稿",
  COPY_ANALYSIS: "文案",
  TOPIC_ANALYSIS: "选题",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  DRAFT: "草稿",
  QUEUED: "排队中",
  RUNNING: "分析中",
  COMPLETED: "已完成",
  FAILED: "执行失败",
  CANCELLED: "已取消",
};

export function getTaskTypeLabel(type: TaskType) {
  return taskTypeLabels[type];
}

export function getTaskStatusLabel(status: TaskStatus) {
  return taskStatusLabels[status];
}

export function getWorkflowProgress(steps: Array<{ status: string }>) {
  const completed = steps.filter((step) => step.status === "SUCCESS").length;
  const total = steps.length;
  return { completed, total, percentage: total ? Math.round((completed / total) * 100) : 0 };
}

export function validateNewTask(input: { title: string; content: string }) {
  const errors: { title?: string; content?: string } = {};
  if (!input.title.trim()) errors.title = "请输入任务标题";
  if (!input.content.trim()) errors.content = "请输入需要分析的内容";
  return errors;
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function formatDuration(startedAt?: string | null, completedAt?: string | null) {
  if (!startedAt) return "—";
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
