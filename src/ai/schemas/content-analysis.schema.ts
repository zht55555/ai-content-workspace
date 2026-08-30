import { z } from "zod";

const boundedText = z.string().trim().min(1).max(4_000);
const shortText = z.string().trim().min(1).max(500);
const textList = z.array(shortText).max(20);

export const AnalysisSchema = z.object({
  topic: shortText,
  contentType: shortText,
  targetAudience: z.array(shortText).min(1).max(10),
  coreMessage: boundedText,
  summary: boundedText,
});

export const HookSchema = z.object({
  type: shortText,
  content: boundedText,
  score: z.number().min(0).max(100),
  reason: boundedText,
  strengths: textList,
  problems: textList,
});

export const StructureStageSchema = z.enum([
  "HOOK",
  "SETUP",
  "DEVELOPMENT",
  "CONFLICT",
  "TURN",
  "CLIMAX",
  "ENDING",
  "CTA",
  "OTHER",
]);

export const StructureNodeSchema = z.object({
  stage: StructureStageSchema,
  content: boundedText,
  purpose: boundedText,
  startOrder: z.number().int().min(1),
  endOrder: z.number().int().min(1),
});

export const EmotionTypeSchema = z.enum([
  "HUMOR",
  "CONFLICT",
  "SURPRISE",
  "EMPATHY",
  "SWEET",
  "SAD",
  "ANGER",
  "SATISFACTION",
  "OTHER",
]);

export const EmotionPointSchema = z.object({
  type: EmotionTypeSchema,
  content: boundedText,
  intensity: z.number().min(0).max(100),
  reason: boundedText,
});

export const EmotionSchema = z.object({
  overallTone: shortText,
  emotionalArc: boundedText,
  emotionPoints: z.array(EmotionPointSchema).max(20),
});

export const OptimizationSchema = z.object({
  strengths: textList,
  weaknesses: textList,
  keep: textList,
  change: textList,
  rhythmSuggestions: textList,
  structureSuggestions: textList,
  contentSuggestions: textList,
});

export const GeneratedScriptSchema = z.object({
  title: shortText,
  coreDirection: boundedText,
  script: boundedText,
  notes: textList,
});

export const MarketingSchema = z.object({
  titles: z.array(shortText).min(1).max(5),
  coverTexts: z.array(shortText).min(1).max(5),
  publishCopy: boundedText,
  keywords: z.array(shortText).max(20),
});

export const ContentAnalysisResultSchema = z.object({
  analysis: AnalysisSchema,
  hook: HookSchema,
  structure: z.array(StructureNodeSchema).max(20),
  emotion: EmotionSchema,
  optimization: OptimizationSchema,
  generatedScript: GeneratedScriptSchema,
  marketing: MarketingSchema,
});

export type Analysis = z.infer<typeof AnalysisSchema>;
export type Hook = z.infer<typeof HookSchema>;
export type StructureNode = z.infer<typeof StructureNodeSchema>;
export type EmotionPoint = z.infer<typeof EmotionPointSchema>;
export type Emotion = z.infer<typeof EmotionSchema>;
export type Optimization = z.infer<typeof OptimizationSchema>;
export type GeneratedScript = z.infer<typeof GeneratedScriptSchema>;
export type Marketing = z.infer<typeof MarketingSchema>;
export type ContentAnalysisResult = z.infer<typeof ContentAnalysisResultSchema>;
