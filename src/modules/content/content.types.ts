import type { InferSelectModel } from "drizzle-orm";

import type { contentItems, contentVersions } from "@/src/db/schema";

export const CONTENT_PLATFORMS = ["DOUYIN", "XIAOHONGSHU", "BILIBILI", "WECHAT", "OTHER"] as const;
export type ContentPlatform = (typeof CONTENT_PLATFORMS)[number];

export const CONTENT_STATUSES = ["DRAFT", "AI_PROCESSING", "WAITING_REVIEW", "NEEDS_REVISION", "APPROVED", "REJECTED", "PUBLISHED", "ARCHIVED"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const CONTENT_VERSION_SOURCES = ["ORIGINAL", "AI_GENERATED", "HUMAN_EDIT", "AI_REGENERATED"] as const;
export type ContentVersionSource = (typeof CONTENT_VERSION_SOURCES)[number];

export const REVIEW_DECISIONS = ["APPROVED", "NEEDS_REVISION", "REJECTED"] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export type ContentVersionPayload = {
  schemaVersion: "content-deliverable.v1";
  script: string;
  titles: string[];
  coverCopy: string[];
  publishCopy: string;
  keywords: string[];
};

export type ContentItemRecord = InferSelectModel<typeof contentItems>;
export type ContentVersionRecord = InferSelectModel<typeof contentVersions>;

export type ContentVersionDTO = {
  id: string;
  contentItemId: string;
  versionNumber: number;
  source: ContentVersionSource;
  createdBy: string;
  baseVersionId: string | null;
  workflowRunId: string | null;
  analysisResultId: string | null;
  contentJson: ContentVersionPayload;
  isFinal: boolean;
  createdAt: string;
};

export type ReviewDTO = {
  id: string;
  contentItemId: string;
  contentVersionId: string;
  reviewerId: string;
  decision: ReviewDecision;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};
