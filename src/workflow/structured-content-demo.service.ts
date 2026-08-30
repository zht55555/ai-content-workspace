import type { LLMProvider } from "../ai/llm/llm-types";
import { StructuredGenerationService } from "../ai/structured/structured-generation.service";
import { contentAnalysisPrompt } from "../ai/prompts/content/content-analysis.prompt";
import { hookAnalysisPrompt, type HookAnalysisPromptInput } from "../ai/prompts/content/hook-analysis.prompt";
import { structureAnalysisPrompt, type StructureAnalysis, type StructureAnalysisPromptInput } from "../ai/prompts/content/structure-analysis.prompt";
import type { Analysis, Hook } from "../ai/schemas/content-analysis.schema";
import { structuredContentDemoWorkflow } from "./definitions/structured-content-demo-workflow";

export type StructuredContentInput = {
  inputType: "TRANSCRIPT" | "COPY" | "TOPIC";
  content: string;
};

export type PartialContentAnalysisResult = {
  analysis: Analysis;
  hook: Hook;
  structure: StructureAnalysis;
};

export class StructuredContentDemoService {
  private readonly structuredGeneration: StructuredGenerationService;

  constructor(provider: LLMProvider) {
    this.structuredGeneration = new StructuredGenerationService(provider);
  }

  async run(input: StructuredContentInput): Promise<PartialContentAnalysisResult> {
    const analysis = await this.structuredGeneration.generate(contentAnalysisPrompt, input);
    const hookInput: HookAnalysisPromptInput = { ...input, analysis };
    const hook = await this.structuredGeneration.generate(hookAnalysisPrompt, hookInput);
    const structureInput: StructureAnalysisPromptInput = { ...input, analysis, hook };
    const structure = await this.structuredGeneration.generate(structureAnalysisPrompt, structureInput);

    if (structuredContentDemoWorkflow.steps.length !== 3) {
      throw new Error("Structured content demo must contain exactly three steps.");
    }

    return { analysis, hook, structure };
  }
}
