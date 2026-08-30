export const structuredContentDemoWorkflow = {
  type: "STRUCTURED_CONTENT_DEMO",
  steps: ["content-analysis", "hook-analysis", "structure-analysis"],
} as const;

export type StructuredContentDemoStep = (typeof structuredContentDemoWorkflow.steps)[number];
