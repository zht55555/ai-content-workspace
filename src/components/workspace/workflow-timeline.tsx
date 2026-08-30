import React from "react";
import type { WorkflowRunSnapshot } from "@/src/workflow/events/workflow-run.reducer";
import { getWorkflowProgress } from "./workspace-utils";
import { WorkflowStepItem } from "./workflow-step-item";

export function WorkflowTimeline({ snapshot, connectionState }: { snapshot: WorkflowRunSnapshot | null; connectionState: string }) {
  if (!snapshot) return <div className="p-5 text-sm text-slate-500">尚未启动 Workflow。</div>;
  const progress = getWorkflowProgress(snapshot.steps);
  return <section className="px-5 py-5"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Workflow Timeline</p><h2 className="mt-1 text-lg font-semibold text-slate-900">FULL_CONTENT_ANALYSIS</h2></div><div className="text-right"><p className="text-lg font-semibold text-slate-900">{progress.completed} / {progress.total}</p><p className="text-xs text-slate-500">{progress.percentage}% 已完成</p></div></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress.percentage}%` }} /></div><p className="mt-3 text-xs text-slate-400">实时连接：{connectionState}</p><ol className="mt-3">{snapshot.steps.map((step) => <WorkflowStepItem key={step.id} step={step} />)}</ol></section>;
}
