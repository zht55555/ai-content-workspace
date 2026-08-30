import type { LLMProvider } from "@/src/ai/llm/llm-types";
import type { TaskStatus, WorkflowRunStatus, WorkflowStepStatus } from "@/src/db/schema";

export type { TaskStatus, WorkflowRunStatus, WorkflowStepStatus };

export type WorkflowInput = {
  content: string;
  inputType: "TRANSCRIPT" | "COPY" | "TOPIC";
  metadata: Record<string, unknown>;
};

export type WorkflowContext = {
  workflowRunId: string;
  taskId: string;
  userId: string;
  provider: LLMProvider;
  input: WorkflowInput;
  previousStepOutputs: Record<string, unknown>;
  signal: AbortSignal;
};

export type WorkflowStepHandler = {
  key: string;
  stepType: string;
  title: string;
  sequence: number;
  execute(context: WorkflowContext, input: unknown): Promise<unknown>;
};

export type WorkflowDefinition = {
  type: string;
  steps: WorkflowStepHandler[];
};
