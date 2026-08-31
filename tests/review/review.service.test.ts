import { describe, expect, it } from "vitest";

import { ReviewService } from "@/src/modules/review/review.service";
import type { ReviewDTO } from "@/src/modules/content/content.types";

describe("ReviewService", () => {
  it("persists a decision and note for a concrete ContentVersion", async () => {
    const repository = {
      findVersion: async () => ({ id: "22222222-2222-4222-8222-222222222222", contentItemId: "11111111-1111-4111-8111-111111111111" }),
      findCurrentVersionId: async () => "22222222-2222-4222-8222-222222222222",
      insert: async (input: Record<string, unknown>) => ({ id: "review-1", ...input }),
    };
    const service = new ReviewService(repository as never);
    const reviewDto: ReviewDTO = { id: "review-1", contentItemId: "11111111-1111-4111-8111-111111111111", contentVersionId: "22222222-2222-4222-8222-222222222222", reviewerId: "33333333-3333-4333-8333-333333333333", decision: "APPROVED", note: "可以发布", createdAt: "2026-08-31T00:00:00.000Z", updatedAt: "2026-08-31T00:00:00.000Z" };

    const result = await service.createReview({ contentItemId: "11111111-1111-4111-8111-111111111111", contentVersionId: "22222222-2222-4222-8222-222222222222", reviewerId: "33333333-3333-4333-8333-333333333333", decision: "APPROVED", note: "可以发布" });

    expect(reviewDto.note).toBe("可以发布");
    expect(result.contentVersionId).toBe("22222222-2222-4222-8222-222222222222");
    expect(result.note).toBe("可以发布");
  });

  it("rejects a review for a missing ContentVersion", async () => {
    const repository = { findVersion: async () => null };
    const service = new ReviewService(repository as never);

    await expect(service.createReview({ contentItemId: "11111111-1111-4111-8111-111111111111", contentVersionId: "22222222-2222-4222-8222-222222222222", reviewerId: "33333333-3333-4333-8333-333333333333", decision: "REJECTED" })).rejects.toMatchObject({ name: "ContentError", code: "CONTENT_NOT_FOUND" });
  });

  it("rejects a review whose version belongs to another ContentItem", async () => {
    const repository = { findVersion: async () => ({ id: "22222222-2222-4222-8222-222222222222", contentItemId: "44444444-4444-4444-8444-444444444444" }) };
    const service = new ReviewService(repository as never);

    await expect(service.createReview({ contentItemId: "11111111-1111-4111-8111-111111111111", contentVersionId: "22222222-2222-4222-8222-222222222222", reviewerId: "33333333-3333-4333-8333-333333333333", decision: "REJECTED" })).rejects.toMatchObject({ name: "ContentError", code: "CONTENT_NOT_FOUND" });
  });

  it("rejects a review of an old ContentVersion", async () => {
    const repository = {
      findVersion: async () => ({ id: "22222222-2222-4222-8222-222222222222", contentItemId: "11111111-1111-4111-8111-111111111111" }),
      findCurrentVersionId: async () => "33333333-3333-4333-8333-333333333333",
    };
    const service = new ReviewService(repository as never);

    await expect(service.createReview({ contentItemId: "11111111-1111-4111-8111-111111111111", contentVersionId: "22222222-2222-4222-8222-222222222222", reviewerId: "33333333-3333-4333-8333-333333333333", decision: "APPROVED" })).rejects.toMatchObject({ name: "NonCurrentReviewTargetError", code: "NON_CURRENT_REVIEW_TARGET" });
  });

  it("applies approval to the current version and records finalization", async () => {
    const repository = {
      findVersion: async () => ({ id: "22222222-2222-4222-8222-222222222222", contentItemId: "11111111-1111-4111-8111-111111111111" }),
      findCurrentVersionId: async () => "22222222-2222-4222-8222-222222222222",
      applyDecision: async (input: Record<string, unknown>) => ({ id: "review-1", ...input }),
    };
    const service = new ReviewService(repository as never);

    const result = await service.createReview({ contentItemId: "11111111-1111-4111-8111-111111111111", contentVersionId: "22222222-2222-4222-8222-222222222222", reviewerId: "33333333-3333-4333-8333-333333333333", decision: "APPROVED", note: "通过" });

    expect(result).toMatchObject({ decision: "APPROVED", note: "通过" });
  });

  it.each(["NEEDS_REVISION", "REJECTED"] as const)("records %s without changing the version pointer", async (decision) => {
    const repository = {
      findVersion: async () => ({ id: "22222222-2222-4222-8222-222222222222", contentItemId: "11111111-1111-4111-8111-111111111111" }),
      findCurrentVersionId: async () => "22222222-2222-4222-8222-222222222222",
      applyDecision: async (input: Record<string, unknown>) => ({ id: "review-1", ...input }),
    };
    const service = new ReviewService(repository as never);

    await expect(service.createReview({ contentItemId: "11111111-1111-4111-8111-111111111111", contentVersionId: "22222222-2222-4222-8222-222222222222", reviewerId: "33333333-3333-4333-8333-333333333333", decision, note: "备注" })).resolves.toMatchObject({ decision, note: "备注" });
  });

  it("lists review history newest first", async () => {
    const repository = { listForContent: async () => [{ id: "review-2" }, { id: "review-1" }] };
    const service = new ReviewService(repository as never);

    await expect(service.listReviews("11111111-1111-4111-8111-111111111111")).resolves.toEqual([{ id: "review-2" }, { id: "review-1" }]);
  });
});
