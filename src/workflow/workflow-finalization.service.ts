import { eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import * as schema from "@/src/db/schema";
import { ContentAnalysisResultSchema, type ContentAnalysisResult } from "@/src/ai/schemas/content-analysis.schema";
import { AnalysisResultRepository } from "./analysis-result.repository";
import type { TaskDb } from "@/src/modules/task/task.repository";

export const FULL_CONTENT_RESULT_TYPE = "CONTENT_ANALYSIS";
export const FULL_CONTENT_SCHEMA_VERSION = "content-analysis-result.v1";

export class WorkflowFinalizationService {
  private readonly resultRepository: AnalysisResultRepository;

  constructor(private readonly database: TaskDb = db, resultRepository?: AnalysisResultRepository) {
    this.resultRepository = resultRepository ?? new AnalysisResultRepository(database);
  }

  async finalize(input: { taskId: string; workflowRunId: string; output: unknown }): Promise<{ result: ContentAnalysisResult; analysisResultId: string }> {
    const result = ContentAnalysisResultSchema.parse(input.output);
    return this.database.transaction(async (transaction) => {
      const existing = await this.resultRepository.findByWorkflowRunId(input.workflowRunId, transaction);
      if (existing) return { result, analysisResultId: existing.id };

      const analysisResult = await this.resultRepository.insert({ taskId: input.taskId, workflowRunId: input.workflowRunId, result, database: transaction });
      const now = new Date();
      await transaction.update(schema.workflowRuns).set({ status: "COMPLETED", outputJson: result, completedAt: now, updatedAt: now }).where(eq(schema.workflowRuns.id, input.workflowRunId));
      await transaction.update(schema.tasks).set({ status: "COMPLETED", completedAt: now, updatedAt: now }).where(eq(schema.tasks.id, input.taskId));
      return { result, analysisResultId: analysisResult.id };
    });
  }
}
