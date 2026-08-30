import type { Analysis, Emotion, GeneratedScript, Hook, Marketing, Optimization, StructureNode } from "@/src/ai/schemas/content-analysis.schema";

export type FullContentStepKey = "content-analysis" | "hook-analysis" | "structure-analysis" | "emotion-analysis" | "optimization" | "script-generation" | "marketing-content";
export type RawContentContext = { inputType: "TRANSCRIPT" | "COPY" | "TOPIC"; content: string };
export type ContentAnalysisInput = RawContentContext;
export type HookAnalysisInput = RawContentContext & { analysis: Analysis };
export type StructureAnalysisInput = RawContentContext & { analysis: Analysis; hook: Hook };
export type EmotionAnalysisInput = RawContentContext & { analysis: Analysis; structure: StructureNode[] };
export type OptimizationInput = { content: string; analysis: Analysis; hook: Hook; structure: StructureNode[]; emotion: Emotion };
export type ScriptGenerationInput = OptimizationInput & { optimization: Optimization };
export type MarketingContentInput = { content: string; analysis: Analysis; generatedScript: GeneratedScript };

export type FullContentStepOutputs = {
  "content-analysis": Analysis;
  "hook-analysis": Hook;
  "structure-analysis": StructureNode[];
  "emotion-analysis": Emotion;
  optimization: Optimization;
  "script-generation": GeneratedScript;
  "marketing-content": Marketing;
};
