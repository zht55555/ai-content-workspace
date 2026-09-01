import { describe, expect, it } from "vitest";
import { ProductService } from "@/src/modules/product/product.service";

describe("ProductService", () => {
  it("loads dashboard aggregates from the product repository for the demo user", async () => {
    const repository = { getDashboard: async (userId: string) => ({ userId, counts: { DRAFT: 2, AI_PROCESSING: 1, WAITING_REVIEW: 3, NEEDS_REVISION: 1, APPROVED: 4 }, recent: [], waitingReview: [], recentlyCompleted: [] }) };
    const service = new ProductService({ findDemoUser: async () => ({ id: "demo-user" }) } as never, repository as never);
    await expect(service.dashboard()).resolves.toMatchObject({ userId: "demo-user", counts: { WAITING_REVIEW: 3 } });
  });

  it("validates Review Center status filters before querying", async () => {
    const service = new ProductService({ findDemoUser: async () => ({ id: "demo-user" }) } as never, { listReviewCenter: async (_userId: string, status?: string) => [{ status }] } as never);
    await expect(service.reviewCenter({ status: "NEEDS_REVISION" })).resolves.toEqual([{ status: "NEEDS_REVISION" }]);
    await expect(service.reviewCenter({ status: "DRAFT" })).rejects.toThrow();
  });
});
