import { describe, expect, it } from "vitest";

import { DemoProvider } from "@/src/ai/llm/providers/demo-provider";
import { structuredContentWorkflow } from "@/src/workflow/definitions/structured-content-workflow";
import type { WorkflowContext } from "@/src/workflow/workflow-types";

const context = (provider: DemoProvider): WorkflowContext => ({
  workflowRunId: "run-1",
  taskId: "task-1",
  userId: "user-1",
  provider,
  input: { inputType: "TRANSCRIPT", content: "她等了三小时，终于等到一句解释。", metadata: {} },
  previousStepOutputs: {},
  signal: new AbortController().signal,
});

describe("structuredContentWorkflow", () => {
  it("defines the three structured steps in sequence", () => {
    expect(structuredContentWorkflow.type).toBe("STRUCTURED_CONTENT_DEMO");
    expect(structuredContentWorkflow.steps.map((step) => step.key)).toEqual(["content-analysis", "hook-analysis", "structure-analysis"]);
    expect(structuredContentWorkflow.steps.map((step) => step.sequence)).toEqual([1, 2, 3]);
  });

  it("passes typed structured outputs through the three handlers", async () => {
    const provider = new DemoProvider({
      structuredOutputs: {
        "content-analysis": { topic: "关系", contentType: "剧情", targetAudience: ["情侣"], coreMessage: "沟通", summary: "关系故事" },
        "hook-analysis": { type: "冲突型", content: "她等了三小时", score: 85, reason: "冲突直接", strengths: ["明确"], problems: ["背景少"] },
        "structure-analysis": [{ stage: "HOOK", content: "等待消息", purpose: "吸引注意", startOrder: 1, endOrder: 1 }],
      },
    });
    const workflowContext = context(provider);

    const analysis = await structuredContentWorkflow.steps[0].execute(workflowContext, workflowContext.input);
    workflowContext.previousStepOutputs["content-analysis"] = analysis;
    const hook = await structuredContentWorkflow.steps[1].execute(workflowContext, workflowContext.input);
    workflowContext.previousStepOutputs["hook-analysis"] = hook;
    const structure = await structuredContentWorkflow.steps[2].execute(workflowContext, workflowContext.input);

    expect(analysis).toMatchObject({ topic: "关系" });
    expect(hook).toMatchObject({ score: 85 });
    expect(structure).toEqual([{ stage: "HOOK", content: "等待消息", purpose: "吸引注意", startOrder: 1, endOrder: 1 }]);
  });
});
