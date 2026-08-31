import { describe, expect, it } from "vitest";

import { ContentDeliverableSchema } from "@/src/modules/content/content.schema";

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
});
