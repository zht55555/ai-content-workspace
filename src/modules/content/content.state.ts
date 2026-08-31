import { ContentError } from "./content.errors";
import type { ContentStatus } from "./content.types";

const transitions: Record<ContentStatus, readonly ContentStatus[]> = {
  DRAFT: ["DRAFT", "AI_PROCESSING", "ARCHIVED"],
  AI_PROCESSING: ["AI_PROCESSING", "WAITING_REVIEW", "DRAFT", "NEEDS_REVISION", "ARCHIVED"],
  WAITING_REVIEW: ["WAITING_REVIEW", "NEEDS_REVISION", "APPROVED", "REJECTED", "AI_PROCESSING", "ARCHIVED"],
  NEEDS_REVISION: ["NEEDS_REVISION", "AI_PROCESSING", "APPROVED", "REJECTED", "ARCHIVED"],
  APPROVED: ["APPROVED", "PUBLISHED", "ARCHIVED"],
  REJECTED: ["REJECTED", "DRAFT", "ARCHIVED"],
  PUBLISHED: ["PUBLISHED", "ARCHIVED"],
  ARCHIVED: ["ARCHIVED"],
};

export function canTransitionContentStatus(from: ContentStatus, to: ContentStatus) {
  return transitions[from].includes(to);
}

export function assertContentStatusTransition(from: ContentStatus, to: ContentStatus) {
  if (!canTransitionContentStatus(from, to)) {
    throw new ContentError("CONTENT_INVALID_STATE", `Content cannot transition from ${from} to ${to}.`);
  }
}

export function restoreStatusAfterProcessingFailure(previousStatus: ContentStatus, isRegeneration: boolean): ContentStatus {
  if (!isRegeneration) return "DRAFT";
  if (previousStatus !== "WAITING_REVIEW" && previousStatus !== "NEEDS_REVISION") {
    throw new ContentError("CONTENT_INVALID_STATE", "Regeneration must restore a reviewable content status.");
  }
  return previousStatus;
}
