import React from "react";
import type { WorkflowRunSnapshot } from "@/src/workflow/events/workflow-run.reducer";
import { formatDuration } from "./workspace-utils";

const labels: Record<WorkflowRunSnapshot["steps"][number]["key"], string> = {
  "content-analysis": "内容分析",
  "hook-analysis": "开头钩子分析",
  "structure-analysis": "内容结构分析",
  "emotion-analysis": "情绪分析",
  optimization: "优化建议",
  "script-generation": "脚本生成",
  "marketing-content": "标题与发布内容生成",
};

const statusLabels = { PENDING: "等待", RUNNING: "正在分析", SUCCESS: "已完成", FAILED: "执行失败", SKIPPED: "已跳过" } as const;

export function WorkflowStepItem({ step }: { step: WorkflowRunSnapshot["steps"][number] }) {
  const icon = { PENDING: "○", RUNNING: "◌", SUCCESS: "✓", FAILED: "!", SKIPPED: "–" }[step.status];
  return <li className="flex gap-3 border-b py-3 last:border-0"><span aria-hidden="true" className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${step.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700" : step.status === "FAILED" ? "bg-red-100 text-red-700" : step.status === "RUNNING" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}>{icon}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-800">{labels[step.key] ?? step.title}</p><span className="shrink-0 text-xs text-slate-500">{statusLabels[step.status]}</span></div><p className="mt-1 text-[11px] text-slate-400">{step.key} · Retry {step.retryCount} · {formatDuration(step.startedAt, step.completedAt)}</p>{step.errorMessage && <p className="mt-1 text-xs text-red-600">{step.errorMessage}</p>}</div></li>;
}
