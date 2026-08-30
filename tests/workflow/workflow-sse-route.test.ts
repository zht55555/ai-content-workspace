import { afterAll, describe, expect, it } from "vitest";

import { pool } from "@/src/db/client";
import { TaskService } from "@/src/modules/task/task.service";
import { GET as getEvents } from "@/app/api/workflow-runs/[runId]/events/route";
import { POST as startRun } from "@/app/api/tasks/[taskId]/run/route";

const runIntegrationTests = Boolean(process.env.DATABASE_URL);

describe.skipIf(!runIntegrationTests)("Workflow SSE routes", () => {
  const taskService = new TaskService();
  const taskIds: string[] = [];

  afterAll(async () => {
    for (const taskId of taskIds) await taskService.deleteTask(taskId);
    await pool.end();
  });

  it("returns a runId from the asynchronous structured workflow start", async () => {
    const task = await taskService.createTask({ title: `SSE route ${Date.now()}`, type: "TRANSCRIPT_ANALYSIS", input: { inputType: "TRANSCRIPT", content: "SSE 路由测试" } });
    taskIds.push(task.id);

    const response = await startRun(new Request("http://localhost/api/tasks/run", { method: "POST", body: JSON.stringify({ workflowType: "STRUCTURED_CONTENT_DEMO", async: true }) }), { params: Promise.resolve({ taskId: task.id }) });
    const body = (await response.json()) as { id?: string; status?: string };

    expect(response.status).toBe(200);
    expect(body.id).toEqual(expect.any(String));
    expect(["PENDING", "RUNNING", "COMPLETED"]).toContain(body.status);
  }, 30_000);

  it("returns a normal 404 response for a missing workflow run", async () => {
    const response = await getEvents(new Request("http://localhost/api/workflow-runs/00000000-0000-0000-0000-000000000000/events"), { params: Promise.resolve({ runId: "00000000-0000-0000-0000-000000000000" }) });
    const body = (await response.json()) as { code?: string };

    expect(response.status).toBe(404);
    expect(body.code).toBe("WORKFLOW_NOT_FOUND");
  });

  it("returns standard SSE headers for an existing completed run", async () => {
    const task = await taskService.createTask({ title: `SSE headers ${Date.now()}`, type: "TRANSCRIPT_ANALYSIS", input: { inputType: "TRANSCRIPT", content: "SSE header test" } });
    taskIds.push(task.id);
    const startResponse = await startRun(new Request("http://localhost/api/tasks/run", { method: "POST", body: JSON.stringify({ workflowType: "STRUCTURED_CONTENT_DEMO" }) }), { params: Promise.resolve({ taskId: task.id }) });
    const run = (await startResponse.json()) as { id: string };

    const response = await getEvents(new Request(`http://localhost/api/workflow-runs/${run.id}/events`), { params: Promise.resolve({ runId: run.id }) });

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("cache-control")).toContain("no-cache");
  }, 30_000);
});
