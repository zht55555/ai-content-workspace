import type { ContentPlatform, ContentStatus } from "@/src/modules/content/content.types";
import type { WorkflowRunSnapshot } from "@/src/workflow/events/workflow-run.reducer";
import { requestJson } from "./client";

export type ContentListItem = { id: string; title: string; rawContent: string; platform: ContentPlatform; status: ContentStatus; source: string | null; sourceUrl: string | null; tags: string[]; lastError?: string | null; updatedAt: string; createdAt: string };
export type ContentDetail = ContentListItem & { currentVersionId: string | null; currentVersion?: { id: string; versionNumber: number; source: string; contentJson: unknown } };
export type ContentListResponse = { items: ContentListItem[]; page: number; pageSize: number; total: number; totalPages: number };
export type ContentProcessingState = { contentItemId: string; taskId: string | null; run: WorkflowRunSnapshot | null };

export function listContents(params: URLSearchParams) {
  const query = params.toString();
  return requestJson<ContentListResponse>(`/api/contents${query ? `?${query}` : ""}`);
}

export function createContent(input: { title: string; rawContent: string; platform: ContentPlatform; source?: string; sourceUrl?: string; tags: string[] }) {
  return requestJson<ContentDetail>("/api/contents", { method: "POST", body: JSON.stringify(input) });
}

export function getContent(contentId: string) {
  return requestJson<ContentDetail>(`/api/contents/${encodeURIComponent(contentId)}`);
}

export function updateContent(contentId: string, input: { title?: string; rawContent?: string; platform?: ContentPlatform; source?: string; sourceUrl?: string; tags?: string[] }) {
  return requestJson<ContentDetail>(`/api/contents/${encodeURIComponent(contentId)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function archiveContent(contentId: string) {
  return requestJson<ContentDetail>(`/api/contents/${encodeURIComponent(contentId)}`, { method: "DELETE" });
}

export function getContentProcessing(contentId: string) {
  return requestJson<ContentProcessingState>(`/api/contents/${encodeURIComponent(contentId)}/processing`);
}

export function startContentProcessing(contentId: string) {
  return requestJson<ContentProcessingState & { status: "AI_PROCESSING" }>(`/api/contents/${encodeURIComponent(contentId)}/processing`, { method: "POST" });
}
