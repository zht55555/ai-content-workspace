import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db, pool } from "@/src/db/client";
import * as schema from "@/src/db/schema";
import { ContentRepository } from "@/src/modules/content/content.repository";
import { POST, GET } from "@/app/api/contents/[contentId]/processing/route";
import { GET as getContent } from "@/app/api/contents/[contentId]/route";

const runIntegrationTests = Boolean(process.env.DATABASE_URL);

describe.skipIf(!runIntegrationTests)("Content processing API", () => {
  const repository = new ContentRepository();
  const contentIds: string[] = [];
  let userId: string;

  beforeAll(async () => {
    const user = await repository.findDemoUser();
    if (!user) throw new Error("Demo User is not seeded.");
    userId = user.id;
  });

  afterAll(async () => {
    for (const contentId of contentIds) await db.delete(schema.contentItems).where(eq(schema.contentItems.id, contentId));
    await pool.end();
  });

  it("starts processing and exposes the latest run for page refresh recovery", async () => {
    const created = await repository.createWithOriginalVersion({ userId, title: `Processing API ${Date.now()}`, rawContent: "API 处理测试内容。", platform: "DOUYIN", tags: [] });
    contentIds.push(created.content.id);

    const response = await POST(new Request("http://localhost/api/contents/content-id/processing"), { params: Promise.resolve({ contentId: created.content.id }) });
    expect(response.status).toBe(202);
    const started = (await response.json()) as { taskId: string; workflowRunId: string; status: string; run: { id: string; status: string } };
    expect(started).toMatchObject({ status: "AI_PROCESSING", taskId: expect.any(String), workflowRunId: expect.any(String), run: { id: started.workflowRunId } });

    const latestResponse = await GET(new Request("http://localhost/api/contents/content-id/processing"), { params: Promise.resolve({ contentId: created.content.id }) });
    expect(latestResponse.status).toBe(200);
    expect(await latestResponse.json()).toMatchObject({ contentItemId: created.content.id, taskId: started.taskId, run: { id: started.workflowRunId } });

    let detail = await getContent(new Request("http://localhost/api/contents/content-id"), { params: Promise.resolve({ contentId: created.content.id }) });
    for (let attempt = 0; attempt < 80 && (await detail.clone().json()).status === "AI_PROCESSING"; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      detail = await getContent(new Request("http://localhost/api/contents/content-id"), { params: Promise.resolve({ contentId: created.content.id }) });
    }
    expect((await detail.json()).status).toBe("WAITING_REVIEW");
  }, 60_000);

  it("rejects processing for an archived ContentItem", async () => {
    const created = await repository.createWithOriginalVersion({ userId, title: `Archived processing ${Date.now()}`, rawContent: "归档内容。", platform: "OTHER", tags: [] });
    contentIds.push(created.content.id);
    await repository.updateStatus(created.content.id, "ARCHIVED");

    const response = await POST(new Request("http://localhost/api/contents/content-id/processing"), { params: Promise.resolve({ contentId: created.content.id }) });
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("CONTENT_INVALID_STATE");
  });
});
