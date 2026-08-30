import type { WorkflowRunSnapshot } from "@/src/workflow/events/workflow-run.reducer";
import { requestJson } from "./client";

type ApiWorkflowRun = Omit<WorkflowRunSnapshot, "steps"> & { steps: Array<Omit<WorkflowRunSnapshot["steps"][number], "key" | "sequence"> & { key?: string; sequence?: number; stepKey?: string; stepOrder?: number }> };

function normalizeSnapshot(snapshot: ApiWorkflowRun): WorkflowRunSnapshot {
  return { ...snapshot, steps: snapshot.steps.map((step) => ({ ...step, key: step.key ?? step.stepKey ?? "", sequence: step.sequence ?? step.stepOrder ?? 0 })) };
}

export function getWorkflowSnapshot(runId: string) {
  return requestJson<ApiWorkflowRun>(`/api/workflow-runs/${encodeURIComponent(runId)}`).then(normalizeSnapshot);
}

export function getLatestWorkflowRun(taskId: string) {
  return requestJson<ApiWorkflowRun | null>(`/api/tasks/${encodeURIComponent(taskId)}/runs/latest`).then((snapshot) => snapshot ? normalizeSnapshot(snapshot) : null);
}

export function runFullContentAnalysis(taskId: string) {
  return requestJson<ApiWorkflowRun>(`/api/tasks/${encodeURIComponent(taskId)}/run`, { method: "POST", body: JSON.stringify({ workflowType: "FULL_CONTENT_ANALYSIS", async: true }) }).then(normalizeSnapshot);
}
