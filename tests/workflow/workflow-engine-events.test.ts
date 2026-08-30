import { afterAll, describe, expect, it } from "vitest";

import { DemoProvider } from "@/src/ai/llm/providers/demo-provider";
import { pool } from "@/src/db/client";
import type { WorkflowEvent } from "@/src/workflow/events/workflow-event.types";
import type { WorkflowEventPublisher } from "@/src/workflow/events/workflow-event.publisher";
import { WorkflowEngine } from "@/src/workflow/workflow-engine";
import { TaskService } from "@/src/modules/task/task.service";

const runIntegrationTests = Boolean(process.env.DATABASE_URL);

class RecordingPublisher implements WorkflowEventPublisher {
  readonly events: WorkflowEvent[] = [];
  constructor(private readonly shouldFail = false) {}

  publish(event: WorkflowEvent): void {
    this.events.push(event);
    if (this.shouldFail) throw new Error("event sink failed");
  }
}

describe.skipIf(!runIntegrationTests)("WorkflowEngine events", () => {
  const taskService = new TaskService();
  const taskIds: string[] = [];

  afterAll(async () => {
    for (const taskId of taskIds) await taskService.deleteTask(taskId);
    await pool.end();
  });

  async function createTask() {
    const task = await taskService.createTask({ title: `Event test ${Date.now()}`, type: "TRANSCRIPT_ANALYSIS", input: { inputType: "TRANSCRIPT", content: "事件测试内容" } });
    taskIds.push(task.id);
    return task;
  }

  it("publishes ordered workflow and step lifecycle events", async () => {
    const task = await createTask();
    const publisher = new RecordingPublisher();
    const result = await new WorkflowEngine({ provider: new DemoProvider(), eventPublisher: publisher }).runWorkflow(task.id);

    expect(result.status).toBe("COMPLETED");
    expect(publisher.events.map((event) => event.eventType)).toEqual([
      "workflow.started",
      "workflow.step.started",
      "workflow.step.completed",
      "workflow.step.started",
      "workflow.step.completed",
      "workflow.step.started",
      "workflow.step.completed",
      "workflow.completed",
    ]);
  }, 30_000);

  it("publishes retrying and failed events for a failed step", async () => {
    const task = await createTask();
    const publisher = new RecordingPublisher();
    const result = await new WorkflowEngine({ provider: new DemoProvider({ mode: "timeout" }), eventPublisher: publisher }).runWorkflow(task.id);

    expect(result.status).toBe("FAILED");
    expect(publisher.events.map((event) => event.eventType)).toEqual([
      "workflow.started",
      "workflow.step.started",
      "workflow.step.completed",
      "workflow.step.started",
      "workflow.step.retrying",
      "workflow.step.retrying",
      "workflow.step.failed",
      "workflow.failed",
    ]);
  }, 30_000);

  it("does not fail a successful workflow when event publishing throws", async () => {
    const task = await createTask();
    const result = await new WorkflowEngine({ provider: new DemoProvider(), eventPublisher: new RecordingPublisher(true) }).runWorkflow(task.id);

    expect(result.status).toBe("COMPLETED");
  }, 30_000);

  it("returns a run snapshot immediately when starting asynchronously", async () => {
    const task = await createTask();
    const publisher = new RecordingPublisher();
    const engine = new WorkflowEngine({ provider: new DemoProvider({ demoDelayMs: 20 }), eventPublisher: publisher });

    const initial = await engine.startWorkflow(task.id);

    expect(initial.taskId).toBe(task.id);
    expect(["PENDING", "RUNNING", "COMPLETED"]).toContain(initial.status);

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const current = await engine.getRun(initial.id);
      if (current.status === "COMPLETED") return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    throw new Error("Asynchronously started workflow did not complete in time.");
  }, 30_000);
});
