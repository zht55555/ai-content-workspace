import { DemoProvider } from "@/src/ai/llm/providers/demo-provider";
import { ContentAnalysisResultSchema } from "@/src/ai/schemas/content-analysis.schema";
import { describe, expect, it } from "vitest";

describe("DemoProvider full content fixtures", () => {
  it("returns valid output for all seven structured prompts", async () => {
    const provider = new DemoProvider();
    const outputs = await Promise.all([
      "content-analysis",
      "hook-analysis",
      "structure-analysis",
      "emotion-analysis",
      "optimization",
      "script-generation",
      "marketing-content",
    ].map(async (structuredOutputKey) => [structuredOutputKey, await provider.generateStructured({ structuredOutputKey })] as const));

    const result = ContentAnalysisResultSchema.parse({
      analysis: outputs[0][1],
      hook: outputs[1][1],
      structure: outputs[2][1],
      emotion: outputs[3][1],
      optimization: outputs[4][1],
      generatedScript: outputs[5][1],
      marketing: outputs[6][1],
    });

    expect(result.analysis.topic).toBe(result.generatedScript.coreDirection);
    expect(result.marketing.publishCopy).toContain(result.generatedScript.title);
  });
});
