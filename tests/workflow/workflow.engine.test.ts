import { afterAll, describe, expect, it } from "vitest";

import { DemoProvider } from "@/src/ai/llm/providers/demo-provider";
import { pool } from "@/src/db/client";
import { TaskService } from "@/src/modules/task/task.service";
import { WorkflowEngine } from "@/src/workflow/workflow-engine";
import { WorkflowError } from "@/src/workflow/workflow-errors";

const runIntegrationTests = Boolean(process.env.DATABASE_URL);

describe.skipIf(!runIntegrationTests)("WorkflowEngine", () => {
  const taskService = new TaskService();
  const createdTaskIds: string[] = [];

  afterAll(async () => {
    for (const taskId of createdTaskIds) await taskService.deleteTask(taskId);
    await pool.end();
  });

  async function createTask() {
    const task = await taskService.createTask({
      title: `Workflow test ${Date.now()}-${createdTaskIds.length}`,
      type: "TRANSCRIPT_ANALYSIS",
      input: { inputType: "TRANSCRIPT", content: "一段用于 Workflow 测试的内容" },
    });
    createdTaskIds.push(task.id);
    return task;
  }

  it("executes the three demo steps in order and persists the final output", async () => {
    const task = await createTask();
    const result = await new WorkflowEngine({ provider: new DemoProvider({ responseText: "demo summary" }) }).runWorkflow(task.id);

    expect(result.status).toBe("COMPLETED");
    expect(result.steps.map((step) => step.stepKey)).toEqual(["normalize_input", "demo_llm_analysis", "finalize_result"]);
    expect(result.steps.every((step) => step.status === "SUCCESS")).toBe(true);
    expect(result.output).toMatchObject({ analysis: "demo summary" });
    expect((await taskService.getTask(task.id)).status).toBe("COMPLETED");
  }, 30_000);

  it("retries retryable failures and stops after the configured maximum", async () => {
    const task = await createTask();
    const result = await new WorkflowEngine({ provider: new DemoProvider({ mode: "timeout" }) }).runWorkflow(task.id);

    expect(result.status).toBe("FAILED");
    expect(result.steps[1]?.status).toBe("FAILED");
    expect(result.steps[1]?.retryCount).toBe(2);
    expect(result.steps[2]?.status).toBe("PENDING");
  }, 30_000);

  it("does not retry non-retryable provider errors", async () => {
    const task = await createTask();
    const result = await new WorkflowEngine({ provider: new DemoProvider({ mode: "provider_error" }) }).runWorkflow(task.id);

    expect(result.status).toBe("FAILED");
    expect(result.steps[1]?.retryCount).toBe(0);
  }, 30_000);

  it("prevents starting a task already queued or running", async () => {
    const task = await createTask();
    await taskService.updateTaskStatus(task.id, { status: "QUEUED" });

    await expect(new WorkflowEngine().runWorkflow(task.id)).rejects.toMatchObject({ code: "TASK_ALREADY_RUNNING" });
    await expect(new WorkflowEngine().runWorkflow("00000000-0000-4000-8000-000000000000")).rejects.toBeInstanceOf(WorkflowError);
  }, 30_000);
});
