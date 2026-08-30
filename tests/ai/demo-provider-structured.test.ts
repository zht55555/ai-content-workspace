import { describe, expect, it } from "vitest";

import { ContentAnalysisResultSchema, HookSchema, StructureNodeSchema } from "@/src/ai/schemas/content-analysis.schema";
import { DemoProvider } from "@/src/ai/llm/providers/demo-provider";

describe("DemoProvider structured fixtures", () => {
  it("returns configured structured fixtures for each content schema", async () => {
    const provider = new DemoProvider({
      structuredOutputs: {
        "content-analysis": {
          topic: "关系",
          contentType: "剧情短视频",
          targetAudience: ["情侣"],
          coreMessage: "沟通很重要",
          summary: "一段关系故事",
        },
        "hook-analysis": {
          type: "冲突型",
          content: "她突然提出分手",
          score: 80,
          reason: "冲突直接",
          strengths: ["明确"],
          problems: ["背景少"],
        },
        "structure-analysis": [{ stage: "HOOK", content: "冲突出现", purpose: "吸引注意", startOrder: 1, endOrder: 1 }],
      },
    });

    const analysis = await provider.generateStructured({ structuredOutputKey: "content-analysis" });
    const hook = await provider.generateStructured({ structuredOutputKey: "hook-analysis" });
    const structure = await provider.generateStructured({ structuredOutputKey: "structure-analysis" });

    expect(ContentAnalysisResultSchema.shape.analysis.parse(analysis)).toHaveProperty("topic", "关系");
    expect(HookSchema.parse(hook)).toHaveProperty("score", 80);
    expect(StructureNodeSchema.array().parse(structure)).toHaveLength(1);
  });
});
