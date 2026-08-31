import { describe, expect, it } from "vitest";

import { ContentService } from "@/src/modules/content/content.service";

const content = { id: "content-1", userId: "11111111-1111-4111-8111-111111111111", title: "测试内容", rawContent: "原始素材", platform: "DOUYIN", status: "DRAFT" };

describe("ContentService", () => {
  it("creates a ContentItem without inventing a deliverable version", async () => {
    const repository = { findDemoUser: async () => ({ id: "11111111-1111-4111-8111-111111111111" }), createWithOriginalVersion: async () => ({ content, originalVersion: null }) };
    const service = new ContentService(repository as never);

    const result = await service.createContent({ userId: "11111111-1111-4111-8111-111111111111", title: "测试内容", rawContent: "原始素材", platform: "DOUYIN" });

    expect(result).toEqual(content);
  });

  it("protects ContentItem business status transitions", async () => {
    const repository = {
      updateStatus: async (_contentItemId: string, status: string) => ({ ...content, status }),
    };
    const service = new ContentService(repository as never);

    await expect(service.transitionStatus("content-1", "DRAFT", "AI_PROCESSING")).resolves.toMatchObject({ status: "AI_PROCESSING" });
    await expect(service.transitionStatus("content-1", "DRAFT", "APPROVED")).rejects.toMatchObject({ code: "CONTENT_INVALID_STATE" });
  });
});
