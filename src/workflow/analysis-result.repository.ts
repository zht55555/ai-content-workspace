import { desc, eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import * as schema from "@/src/db/schema";
import type { TaskDb } from "@/src/modules/task/task.repository";
import type { ContentAnalysisResult } from "@/src/ai/schemas/content-analysis.schema";

export class AnalysisResultRepository {
  constructor(private readonly database: TaskDb = db) {}

  async findLatestForTask(taskId: string) {
    const rows = await this.database
      .select()
      .from(schema.analysisResults)
      .where(eq(schema.analysisResults.taskId, taskId))
      .orderBy(desc(schema.analysisResults.createdAt))
      .limit(1);
    return rows[0];
  }

  async findByWorkflowRunId(workflowRunId: string, database: TaskDb = this.database) {
    const rows = await database.select().from(schema.analysisResults).where(eq(schema.analysisResults.workflowRunId, workflowRunId));
    return rows[0];
  }

  async insert(input: { taskId: string; workflowRunId: string; result: ContentAnalysisResult; database?: TaskDb }) {
    const database = input.database ?? this.database;
    const [result] = await database
      .insert(schema.analysisResults)
      .values({ taskId: input.taskId, workflowRunId: input.workflowRunId, resultType: "CONTENT_ANALYSIS", schemaVersion: "content-analysis-result.v1", resultJson: input.result })
      .returning();
    if (!result) throw new Error("AnalysisResult creation failed.");
    return result;
  }
}
