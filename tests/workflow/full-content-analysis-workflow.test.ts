import { DemoProvider } from "@/src/ai/llm/providers/demo-provider";
import { fullContentAnalysisWorkflow } from "@/src/workflow/definitions/full-content-analysis-workflow";
import type { WorkflowContext } from "@/src/workflow/workflow-types";
import { describe, expect, it } from "vitest";

const context: WorkflowContext = {
  workflowRunId: "run-1",
  taskId: "task-1",
  userId: "user-1",
  provider: new DemoProvider(),
  input: { inputType: "TRANSCRIPT", content: "一个人面对困难，最后找到解决办法。", metadata: {} },
  previousStepOutputs: {},
  signal: new AbortController().signal,
};

describe("Full Content Analysis Workflow", () => {
  it("contains the seven fixed business steps in order", () => {
    expect(fullContentAnalysisWorkflow.type).toBe("FULL_CONTENT_ANALYSIS");
    expect(fullContentAnalysisWorkflow.steps.map((step) => step.key)).toEqual([
      "content-analysis",
      "hook-analysis",
      "structure-analysis",
      "emotion-analysis",
      "optimization",
      "script-generation",
      "marketing-content",
    ]);
  });

  it("passes only typed preceding context to each step", async () => {
    const outputs: Record<string, unknown> = {};
    const seenPrompts: string[] = [];
    const provider = new DemoProvider();
    const testContext = { ...context, provider, previousStepOutputs: outputs };
    const original = provider.generateStructuredWithUsage.bind(provider);
    provider.generateStructuredWithUsage = async (request) => {
      seenPrompts.push(`${request.structuredOutputKey}:${request.userPrompt ?? ""}`);
      return original(request);
    };

    for (const step of fullContentAnalysisWorkflow.steps) {
      outputs[step.key] = await step.execute(testContext, outputs);
    }

    expect(seenPrompts).toHaveLength(7);
    expect(seenPrompts[1]).toContain("内容分析");
    expect(seenPrompts[1]).not.toContain("情绪");
    expect(seenPrompts[6]).toContain("生成脚本");
    expect(seenPrompts[6]).not.toContain("优化建议");
  });
});
