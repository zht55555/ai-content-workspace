import { db } from "@/src/db/client";
import * as schema from "@/src/db/schema";
import type { LLMUsage } from "@/src/ai/llm/llm-types";
import type { TaskDb } from "@/src/modules/task/task.repository";

export class WorkflowUsageService {
  constructor(private readonly database: TaskDb = db) {}

  async record(input: { taskId: string; workflowRunId: string; workflowStepId: string; provider: string; model: string; usage: LLMUsage | null; latencyMs: number }) {
    await this.database.insert(schema.llmUsages).values({
      taskId: input.taskId,
      workflowRunId: input.workflowRunId,
      workflowStepId: input.workflowStepId,
      provider: input.provider,
      model: input.model,
      inputTokens: input.usage?.promptTokens ?? null,
      outputTokens: input.usage?.completionTokens ?? null,
      totalTokens: input.usage?.totalTokens ?? null,
      latencyMs: input.latencyMs,
    });
  }
}
