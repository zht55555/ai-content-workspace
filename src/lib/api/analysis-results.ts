import type { ContentAnalysisResult } from "@/src/ai/schemas/content-analysis.schema";
import { requestJson } from "./client";

export function getLatestAnalysisResult(taskId: string) {
  return requestJson<{ result: ContentAnalysisResult; workflowRunId: string; schemaVersion: string }>(`/api/tasks/${encodeURIComponent(taskId)}/results/latest`);
}
