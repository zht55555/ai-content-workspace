import { contentAnalysisPrompt } from "@/src/ai/prompts/content/content-analysis.prompt";
import { hookAnalysisPrompt, type HookAnalysisPromptInput } from "@/src/ai/prompts/content/hook-analysis.prompt";
import { structureAnalysisPrompt, type StructureAnalysisPromptInput } from "@/src/ai/prompts/content/structure-analysis.prompt";
import { AnalysisSchema, HookSchema, type Analysis, type Hook } from "@/src/ai/schemas/content-analysis.schema";
import { StructuredGenerationService } from "@/src/ai/structured/structured-generation.service";
import type { WorkflowDefinition } from "../workflow-types";

export const structuredContentWorkflow: WorkflowDefinition = {
  type: "STRUCTURED_CONTENT_DEMO",
  steps: [
    {
      key: "content-analysis",
      stepType: "STRUCTURED_OUTPUT",
      title: "内容分析",
      sequence: 1,
      execute: (context) => {
        const service = new StructuredGenerationService(context.provider);
        return service.generate(contentAnalysisPrompt, { inputType: context.input.inputType, content: context.input.content });
      },
    },
    {
      key: "hook-analysis",
      stepType: "STRUCTURED_OUTPUT",
      title: "钩子分析",
      sequence: 2,
      execute: (context) => {
        const analysis: Analysis = AnalysisSchema.parse(context.previousStepOutputs["content-analysis"]);
        const input: HookAnalysisPromptInput = { inputType: context.input.inputType, content: context.input.content, analysis };
        const service = new StructuredGenerationService(context.provider);
        return service.generate(hookAnalysisPrompt, input);
      },
    },
    {
      key: "structure-analysis",
      stepType: "STRUCTURED_OUTPUT",
      title: "结构分析",
      sequence: 3,
      execute: (context) => {
        const analysis: Analysis = AnalysisSchema.parse(context.previousStepOutputs["content-analysis"]);
        const hook: Hook = HookSchema.parse(context.previousStepOutputs["hook-analysis"]);
        const input: StructureAnalysisPromptInput = { inputType: context.input.inputType, content: context.input.content, analysis, hook };
        const service = new StructuredGenerationService(context.provider);
        return service.generate(structureAnalysisPrompt, input);
      },
    },
  ],
};
