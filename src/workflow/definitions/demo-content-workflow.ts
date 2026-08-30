import type { WorkflowDefinition } from "../workflow-types";

export const demoContentWorkflow: WorkflowDefinition = {
  type: "DEMO_CONTENT_WORKFLOW",
  steps: [
    {
      key: "normalize_input",
      stepType: "NORMALIZE",
      title: "Normalize input",
      sequence: 1,
      async execute(context) {
        return { normalizedContent: context.input.content.trim(), inputType: context.input.inputType };
      },
    },
    {
      key: "demo_llm_analysis",
      stepType: "LLM_ANALYSIS",
      title: "Demo LLM analysis",
      sequence: 2,
      async execute(context) {
        const result = await context.provider.generate({ userPrompt: `Summarize this content in one sentence:\n${context.input.content}`, signal: context.signal });
        return { summary: result.content, usage: result.usage, model: result.model };
      },
    },
    {
      key: "finalize_result",
      stepType: "FINALIZE",
      title: "Finalize result",
      sequence: 3,
      async execute(context) {
        const analysis = context.previousStepOutputs.demo_llm_analysis as { summary?: string } | undefined;
        const normalized = context.previousStepOutputs.normalize_input as { normalizedContent?: string } | undefined;
        return { normalizedContent: normalized?.normalizedContent ?? context.input.content, analysis: analysis?.summary ?? "" };
      },
    },
  ],
};
