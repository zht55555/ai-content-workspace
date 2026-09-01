import { requestJson } from "./client";
import type { ContentListItem } from "./contents";

export type DashboardData = { counts: Record<string, number>; recent: ContentListItem[]; waitingReview: ContentListItem[]; recentlyCompleted: ContentListItem[] };
export type ReviewCenterItem = { content: ContentListItem & { currentVersionId: string | null }; currentVersion: { id: string; versionNumber: number; source: string } | null };

export function getDashboard() { return requestJson<DashboardData>("/api/dashboard"); }
export function listReviewCenter(status: string) { const query = status ? `?status=${encodeURIComponent(status)}` : ""; return requestJson<ReviewCenterItem[]>(`/api/reviews${query}`); }
