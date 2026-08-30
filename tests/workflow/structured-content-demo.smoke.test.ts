import { afterAll, describe, expect, it } from "vitest";

import { DemoProvider } from "@/src/ai/llm/providers/demo-provider";
import { TaskService } from "@/src/modules/task/task.service";
import { pool } from "@/src/db/client";
import { StructuredContentDemoService } from "@/src/workflow/structured-content-demo.service";

const runIntegrationTests = Boolean(process.env.DATABASE_URL);

describe.skipIf(!runIntegrationTests)("Structured Content Demo smoke", () => {
  const taskService = new TaskService();
  const taskIds: string[] = [];

  afterAll(async () => {
    for (const taskId of taskIds) await taskService.deleteTask(taskId);
    await pool.end();
  });

  it("flows Task input through three Zod-validated structured steps", async () => {
    const task = await taskService.createTask({
      title: `Structured smoke ${Date.now()}`,
      type: "TRANSCRIPT_ANALYSIS",
      input: { inputType: "TRANSCRIPT", content: "她等了三小时，终于等到一句解释。" },
    });
    taskIds.push(task.id);

    const result = await new StructuredContentDemoService(
      new DemoProvider({
        structuredOutputs: {
          "content-analysis": { topic: "关系", contentType: "剧情", targetAudience: ["情侣"], coreMessage: "沟通", summary: "关系故事" },
          "hook-analysis": { type: "冲突型", content: "她等了三小时", score: 85, reason: "冲突直接", strengths: ["明确"], problems: ["背景少"] },
          "structure-analysis": [{ stage: "HOOK", content: "等待消息", purpose: "吸引注意", startOrder: 1, endOrder: 1 }],
        },
      }),
    ).run({ inputType: task.input.inputType, content: task.input.content });

    expect(result.analysis.topic).toBe("关系");
    expect(result.hook.score).toBe(85);
    expect(result.structure).toHaveLength(1);
  }, 30_000);
});
