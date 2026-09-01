import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db, pool } from "@/src/db/client";
import * as schema from "@/src/db/schema";
import { ContentRepository } from "@/src/modules/content/content.repository";
import { ContentProcessingService } from "@/src/modules/content/content-processing.service";

const runIntegrationTests = Boolean(process.env.DATABASE_URL);

describe.skipIf(!runIntegrationTests)("Content AI processing integration", () => {
  const contentRepository = new ContentRepository();
  const service = new ContentProcessingService();
  const contentIds: string[] = [];
  let demoUserId: string;

  beforeAll(async () => {
    const user = await contentRepository.findDemoUser();
    if (!user) throw new Error("Demo User is not seeded.");
    demoUserId = user.id;
  });

  afterAll(async () => {
    for (const contentId of contentIds) await db.delete(schema.contentItems).where(eq(schema.contentItems.id, contentId));
    await pool.end();
  });

  it("connects ContentItem to Task, Workflow, AnalysisResult and AI_GENERATED Version", async () => {
    const content = await contentRepository.createWithOriginalVersion({ userId: demoUserId, title: `AI processing ${Date.now()}`, rawContent: "一段需要完整分析的内容。", platform: "DOUYIN", tags: [] });
    contentIds.push(content.content.id);

    const started = await service.start(content.content.id);
    expect(started.status).toBe("AI_PROCESSING");

    let finalContent = await contentRepository.findById(content.content.id);
    for (let attempt = 0; attempt < 80 && finalContent?.status === "AI_PROCESSING"; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      finalContent = await contentRepository.findById(content.content.id);
    }

    expect(finalContent?.status).toBe("WAITING_REVIEW");
    expect(finalContent?.currentVersionId).not.toBe(content.content.currentVersionId);

    const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, started.taskId));
    const [taskInput] = await db.select().from(schema.taskInputs).where(eq(schema.taskInputs.taskId, started.taskId));
    const [run] = await db.select().from(schema.workflowRuns).where(eq(schema.workflowRuns.id, started.workflowRunId));
    const [analysis] = await db.select().from(schema.analysisResults).where(eq(schema.analysisResults.workflowRunId, started.workflowRunId));
    const [version] = await db.select().from(schema.contentVersions).where(eq(schema.contentVersions.id, finalContent!.currentVersionId!));

    expect(task?.contentItemId).toBe(content.content.id);
    expect(taskInput?.rawContent).toBe(content.content.rawContent);
    expect(run?.status).toBe("COMPLETED");
    expect(analysis?.resultJson).toHaveProperty("analysis");
    expect(version).toMatchObject({ source: "AI_GENERATED", workflowRunId: started.workflowRunId, analysisResultId: analysis?.id, baseVersionId: content.content.currentVersionId, isFinal: true });
    expect(version?.contentJson).toEqual(expect.objectContaining({ schemaVersion: "content-deliverable.v1", script: expect.any(String), titles: expect.any(Array), coverCopy: expect.any(Array), publishCopy: expect.any(String), keywords: expect.any(Array) }));
    expect(version?.contentJson).not.toHaveProperty("analysis");

    await contentRepository.updateStatus(content.content.id, "WAITING_REVIEW");
    const regenerated = await service.start(content.content.id);
    let regeneratedContent = await contentRepository.findById(content.content.id);
    for (let attempt = 0; attempt < 80 && regeneratedContent?.status === "AI_PROCESSING"; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      regeneratedContent = await contentRepository.findById(content.content.id);
    }
    expect(regeneratedContent?.status).toBe("WAITING_REVIEW");
    const allVersions = await db.select().from(schema.contentVersions).where(eq(schema.contentVersions.contentItemId, content.content.id));
    const regeneratedVersion = allVersions.find((item) => item.id === regeneratedContent?.currentVersionId);
    expect(regeneratedVersion).toMatchObject({ source: "AI_REGENERATED", workflowRunId: regenerated.workflowRunId, isFinal: true });
    expect(allVersions.filter((item) => item.isFinal)).toHaveLength(1);
  }, 60_000);

  it("restores a reviewable status and keeps the current version after a workflow failure", async () => {
    const content = await contentRepository.createWithOriginalVersion({ userId: demoUserId, title: `AI failure ${Date.now()}`, rawContent: "失败恢复测试内容。", platform: "OTHER", tags: [] });
    contentIds.push(content.content.id);
    await contentRepository.updateStatus(content.content.id, "WAITING_REVIEW");

    await service.handleWorkflowFailure({ contentItemId: content.content.id, taskId: "task-failure", workflowRunId: "run-failure", previousStatus: "WAITING_REVIEW", error: new Error("provider timeout") });
    const restored = await contentRepository.findById(content.content.id);
    expect(restored).toMatchObject({ status: "WAITING_REVIEW", currentVersionId: content.content.currentVersionId, lastError: "provider timeout" });
  }, 30_000);
});
