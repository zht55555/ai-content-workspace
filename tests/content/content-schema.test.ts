import { describe, expect, it } from "vitest";

import { ContentDeliverableSchema, contentListQuerySchema, updateContentSchema } from "@/src/modules/content/content.schema";

describe("content deliverable schema", () => {
  it("accepts only editable and publishable deliverables", () => {
    const result = ContentDeliverableSchema.parse({
      schemaVersion: "content-deliverable.v1",
      script: "开场三秒先提出问题。",
      titles: ["标题一"],
      coverCopy: ["封面文案"],
      publishCopy: "发布文案",
      keywords: ["内容运营"],
    });

    expect(result.script).toBe("开场三秒先提出问题。");
    expect(result).not.toHaveProperty("analysis");
  });

  it("rejects analysis fields from the version payload", () => {
    expect(() => ContentDeliverableSchema.parse({
      schemaVersion: "content-deliverable.v1",
      script: "脚本",
      titles: [],
      coverCopy: [],
      publishCopy: "文案",
      keywords: [],
      analysis: { topic: "不能放入版本" },
    })).toThrow();
  });

  it("parses URL-driven library filters and pagination", () => {
    expect(contentListQuerySchema.parse({ search: "  选题  ", platform: "DOUYIN", status: "DRAFT", page: "2", pageSize: "10" })).toEqual({ search: "选题", platform: "DOUYIN", status: "DRAFT", page: 2, pageSize: 10 });
  });

  it("allows only basic content fields and archive status updates", () => {
    expect(updateContentSchema.parse({ title: "新标题", rawContent: "新内容", platform: "OTHER", source: "手动", sourceUrl: "https://example.com", tags: ["标签"] })).toMatchObject({ title: "新标题" });
    expect(updateContentSchema.parse({ status: "ARCHIVED" })).toEqual({ status: "ARCHIVED" });
    expect(() => updateContentSchema.parse({ status: "APPROVED" })).toThrow();
  });
});
