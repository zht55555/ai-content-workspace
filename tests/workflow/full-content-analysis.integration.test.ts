import { DemoProvider } from "@/src/ai/llm/providers/demo-provider";
import { ContentAnalysisResultSchema } from "@/src/ai/schemas/content-analysis.schema";
import { TaskService } from "@/src/modules/task/task.service";
import { fullContentAnalysisWorkflow } from "@/src/workflow/definitions/full-content-analysis-workflow";
import { AnalysisResultRepository } from "@/src/workflow/analysis-result.repository";
import { WorkflowEngine } from "@/src/workflow/workflow-engine";
import type { WorkflowEvent } from "@/src/workflow/events/workflow-event.types";
import { describe, expect, it } from "vitest";
import { db } from "@/src/db/client";
import * as schema from "@/src/db/schema";
import { eq } from "drizzle-orm";

describe("Full Content Analysis integration", () => {
  it("persists seven successful steps and one validated final result", async () => {
    const taskService = new TaskService();
    const task = await taskService.createTask({ title: "Full analysis integration", type: "TRANSCRIPT_ANALYSIS", input: { inputType: "TRANSCRIPT", content: "一个人面对困难，最后找到解决办法。" } });
    const events: WorkflowEvent[] = [];
    const engine = new WorkflowEngine({ provider: new DemoProvider(), eventPublisher: { publish: async (event) => { events.push(event); } } });

    const run = await engine.runWorkflow(task.id, fullContentAnalysisWorkflow);
    const result = await new AnalysisResultRepository().findLatestForTask(task.id);
    const usage = await db.select().from(schema.llmUsages).where(eq(schema.llmUsages.taskId, task.id));
    const completedSteps = run.steps.filter((step) => step.status === "SUCCESS");

    expect(completedSteps).toHaveLength(7);
    expect(run.status).toBe("COMPLETED");
    expect(result?.workflowRunId).toBe(run.id);
    expect(ContentAnalysisResultSchema.parse(result?.resultJson).marketing.titles).toHaveLength(1);
    expect(events.at(-1)).toMatchObject({ eventType: "workflow.completed", resultAvailable: true });
    expect(usage).toHaveLength(7);
    expect(usage.every((item) => item.totalTokens === 0)).toBe(true);

    await taskService.deleteTask(task.id);
  }, 60_000);
});
