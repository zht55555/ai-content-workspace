import React from "react";
import type { ContentStatus } from "@/src/modules/content/content.types";

const labels: Record<ContentStatus, string> = { DRAFT: "草稿", AI_PROCESSING: "AI 处理中", WAITING_REVIEW: "待审核", NEEDS_REVISION: "需修改", APPROVED: "已批准", REJECTED: "已拒绝", PUBLISHED: "已发布", ARCHIVED: "已归档" };
const tones: Record<ContentStatus, string> = { DRAFT: "border-slate-200 bg-slate-50 text-slate-600", AI_PROCESSING: "border-blue-200 bg-blue-50 text-blue-700", WAITING_REVIEW: "border-amber-200 bg-amber-50 text-amber-700", NEEDS_REVISION: "border-orange-200 bg-orange-50 text-orange-700", APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700", REJECTED: "border-red-200 bg-red-50 text-red-700", PUBLISHED: "border-violet-200 bg-violet-50 text-violet-700", ARCHIVED: "border-slate-200 bg-slate-100 text-slate-500" };

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tones[status]}`}>{labels[status]}</span>;
}
