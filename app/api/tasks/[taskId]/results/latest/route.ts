import { NextResponse } from "next/server";

import { ContentAnalysisResultSchema } from "@/src/ai/schemas/content-analysis.schema";
import { TaskRepository } from "@/src/modules/task/task.repository";
import { AnalysisResultRepository } from "@/src/workflow/analysis-result.repository";

const tasks = new TaskRepository();
const results = new AnalysisResultRepository();
type Context = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, context: Context) {
  const { taskId } = await context.params;
  const task = await tasks.findById(taskId);
  const demoUser = await tasks.findDemoUser();
  if (!task || !demoUser || task.task.userId !== demoUser.id) return NextResponse.json({ error: "Task not found.", code: "TASK_NOT_FOUND" }, { status: 404 });
  const result = await results.findLatestForTask(taskId);
  if (!result) return NextResponse.json({ error: "Analysis result not found.", code: "ANALYSIS_RESULT_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ id: result.id, taskId: result.taskId, workflowRunId: result.workflowRunId, resultType: result.resultType, schemaVersion: result.schemaVersion, result: ContentAnalysisResultSchema.parse(result.resultJson), createdAt: result.createdAt, updatedAt: result.updatedAt });
}
