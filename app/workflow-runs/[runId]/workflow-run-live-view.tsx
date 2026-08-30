"use client";

import { useEffect, useState } from "react";

import { useWorkflowEvents } from "@/src/workflow/events/use-workflow-events";
import type { WorkflowRunSnapshot } from "@/src/workflow/events/workflow-run.reducer";
import { ContentAnalysisResultView } from "@/src/workflow/results/content-analysis-result-view";

type ApiWorkflowRun = Omit<WorkflowRunSnapshot, "steps"> & {
  steps: Array<WorkflowRunSnapshot["steps"][number] & { stepKey?: string; stepOrder?: number }>;
};

function toSnapshot(raw: ApiWorkflowRun): WorkflowRunSnapshot {
  return {
    ...raw,
    steps: raw.steps.map((step) => ({
      ...step,
      key: step.key ?? step.stepKey ?? "",
      sequence: step.sequence ?? step.stepOrder ?? 0,
    })),
  };
}

export function WorkflowRunLiveView({ runId }: { runId: string }) {
  const [initialSnapshot, setInitialSnapshot] = useState<WorkflowRunSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { snapshot, connectionState } = useWorkflowEvents(runId, initialSnapshot);

  useEffect(() => {
    fetch(`/api/workflow-runs/${encodeURIComponent(runId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("WorkflowRun 不存在或无法访问。");
        return toSnapshot((await response.json()) as ApiWorkflowRun);
      })
      .then(setInitialSnapshot)
      .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : "加载 WorkflowRun 失败。"));
  }, [runId]);

  if (loadError) return <main className="min-h-screen p-8 text-red-700">{loadError}</main>;
  if (!snapshot) return <main className="min-h-screen p-8 text-slate-600">正在加载 WorkflowRun…</main>;

  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-sm text-slate-500">WorkflowRun 实时状态</p>
          <h1 className="mt-2 text-2xl font-semibold">{snapshot.status}</h1>
          <p className="mt-2 text-sm text-slate-600">Run ID：{snapshot.id}</p>
          <p className="text-sm text-slate-600">Task ID：{snapshot.taskId}</p>
          <p className="text-sm text-slate-500">SSE：{connectionState}</p>
        </header>
        <section className="rounded-lg border bg-white p-5 shadow-sm">
          <h2 className="font-medium">Step Timeline</h2>
          <ol className="mt-4 space-y-3">
            {snapshot.steps.map((step) => (
              <li className="flex items-center justify-between border-b pb-3 last:border-0" key={step.id}>
                <span>{step.title}</span>
                <span className="text-sm text-slate-600">{step.status} · Retry {step.retryCount}</span>
              </li>
            ))}
          </ol>
        </section>
        <ContentAnalysisResultView taskId={snapshot.taskId} enabled={snapshot.resultAvailable === true} />
      </div>
    </main>
  );
}
