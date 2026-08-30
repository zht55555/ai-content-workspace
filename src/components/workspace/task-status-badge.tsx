import React from "react";
import type { TaskStatus } from "@/src/modules/task/task.types";
import { getTaskStatusLabel } from "./workspace-utils";

const tones: Record<TaskStatus, string> = {
  DRAFT: "border-slate-200 bg-slate-50 text-slate-600",
  QUEUED: "border-amber-200 bg-amber-50 text-amber-700",
  RUNNING: "border-blue-200 bg-blue-50 text-blue-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-500",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[status]}`}>{getTaskStatusLabel(status)}</span>;
}
