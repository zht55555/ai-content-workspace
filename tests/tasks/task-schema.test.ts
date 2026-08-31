import { describe, expect, it } from "vitest";

import { createTaskInputSchema, updateTaskSchema } from "@/src/modules/task/task.schema";

describe("task request schemas", () => {
  it("accepts a transcript analysis task", () => {
    const result = createTaskInputSchema.parse({
      title: "分析逐字稿",
      type: "TRANSCRIPT_ANALYSIS",
      input: { inputType: "TRANSCRIPT", content: "一段内容" },
    });

    expect(result.input.metadata).toEqual({});
  });

  it("rejects mismatched task and input types", () => {
    expect(() =>
      createTaskInputSchema.parse({
        title: "文案分析",
        type: "COPY_ANALYSIS",
        input: { inputType: "TOPIC", content: "一个选题" },
      }),
    ).toThrow();
  });

  it("only permits editable task fields on update", () => {
    expect(updateTaskSchema.parse({ title: "新标题" })).toEqual({ title: "新标题" });
    expect(() => updateTaskSchema.parse({ userId: "not-allowed" })).toThrow();
  });

  it("accepts an optional ContentItem association", () => {
    const result = createTaskInputSchema.parse({
      title: "关联内容",
      type: "COPY_ANALYSIS",
      contentItemId: "11111111-1111-4111-8111-111111111111",
      input: { inputType: "COPY", content: "文案" },
    });

    expect(result.contentItemId).toBe("11111111-1111-4111-8111-111111111111");
  });
});
