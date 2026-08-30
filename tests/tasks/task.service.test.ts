import { afterAll, describe, expect, it } from "vitest";

import { pool } from "@/src/db/client";
import { TaskService } from "@/src/modules/task/task.service";

const runIntegrationTests = Boolean(process.env.DATABASE_URL);

describe.skipIf(!runIntegrationTests)("TaskService", () => {
  const service = new TaskService();
  const createdTaskIds: string[] = [];

  afterAll(async () => {
    for (const taskId of createdTaskIds) {
      await service.deleteTask(taskId);
    }
    await pool.end();
  });

  it("creates Task and TaskInput atomically for the Demo User", async () => {
    const task = await service.createTask({
      title: `Phase 2 test ${Date.now()}`,
      type: "TRANSCRIPT_ANALYSIS",
      input: { inputType: "TRANSCRIPT", content: "测试逐字稿", metadata: { language: "zh-CN" } },
    });
    createdTaskIds.push(task.id);

    expect(task.title).toContain("Phase 2 test");
    expect(task.status).toBe("DRAFT");
    expect(task.input.content).toBe("测试逐字稿");
    expect(task.user.email).toBe("demo@ai-content-workflow.local");
  });

  it("lists, updates, gets details, and deletes a task", async () => {
    const created = await service.createTask({
      title: `CRUD test ${Date.now()}`,
      type: "COPY_ANALYSIS",
      input: { inputType: "COPY", content: "测试文案" },
    });
    createdTaskIds.push(created.id);

    const listed = await service.listTasks({ page: 1, pageSize: 10, status: "DRAFT", type: "COPY_ANALYSIS" });
    expect(listed.items.some((task) => task.id === created.id)).toBe(true);

    const updated = await service.updateTask(created.id, { title: "已更新标题" });
    expect(updated.title).toBe("已更新标题");

    const detail = await service.getTask(created.id);
    expect(detail.input.inputType).toBe("COPY");

    await service.deleteTask(created.id);
    await expect(service.getTask(created.id)).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
    createdTaskIds.splice(createdTaskIds.indexOf(created.id), 1);
  }, 30_000);
});
