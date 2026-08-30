import { describe, expect, it } from "vitest";

import { DemoProvider } from "@/src/ai/llm/providers/demo-provider";
import { StructuredContentDemoService } from "@/src/workflow/structured-content-demo.service";

const outputs = {
  "content-analysis": {
    topic: "异地恋",
    contentType: "剧情短视频",
    targetAudience: ["情侣"],
    coreMessage: "沟通很重要",
    summary: "一段关系故事",
  },
  "hook-analysis": {
    type: "冲突型",
    content: "她突然提出分手",
    score: 82,
    reason: "关系危机直接出现",
    strengths: ["冲突明确"],
    problems: ["背景较少"],
  },
  "structure-analysis": [{ stage: "HOOK", content: "冲突出现", purpose: "吸引注意", startOrder: 1, endOrder: 1 }],
};

describe("StructuredContentDemoService", () => {
  it("executes content, hook, and structure analysis in order with typed outputs", async () => {
    const service = new StructuredContentDemoService(new DemoProvider({ structuredOutputs: outputs }));
    const result = await service.run({ inputType: "TRANSCRIPT", content: "她等了很久，终于收到他的消息。" });

    expect(result.analysis.topic).toBe("异地恋");
    expect(result.hook.score).toBe(82);
    expect(result.structure[0]?.stage).toBe("HOOK");
  });

  it("fails the structured demo when a step cannot satisfy its Schema", async () => {
    const service = new StructuredContentDemoService(new DemoProvider({ structuredOutputs: { ...outputs, "hook-analysis": { score: 101 } } }));

    await expect(service.run({ inputType: "COPY", content: "原始文案" })).rejects.toMatchObject({
      code: "STRUCTURED_OUTPUT_RETRY_EXHAUSTED",
    });
  });
});
