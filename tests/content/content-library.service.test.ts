import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";

import { db, pool } from "@/src/db/client";
import * as schema from "@/src/db/schema";
import { ContentRepository } from "@/src/modules/content/content.repository";
import { ContentService } from "@/src/modules/content/content.service";
import { eq } from "drizzle-orm";

const runIntegrationTests = Boolean(process.env.DATABASE_URL);

describe.skipIf(!runIntegrationTests)("Content Library service", () => {
  const repository = new ContentRepository();
  const service = new ContentService(repository);
  const contentIds: string[] = [];

  afterAll(async () => {
    for (const contentId of contentIds) await db.delete(schema.contentItems).where(eq(schema.contentItems.id, contentId));
    await pool.end();
  });

  it("creates a DRAFT ContentItem with an ORIGINAL deliverable version atomically", async () => {
    const content = await service.createContent({ title: `Library create ${Date.now()}`, rawContent: "原始内容", platform: "DOUYIN", source: "手动粘贴", tags: ["测试"] });
    contentIds.push(content.id);

    expect(content.status).toBe("DRAFT");
    expect(content.currentVersionId).not.toBeNull();

    const [version] = await db.select().from(schema.contentVersions).where(eq(schema.contentVersions.id, content.currentVersionId!));
    expect(version?.source).toBe("ORIGINAL");
    expect(version?.contentJson).toEqual({ schemaVersion: "content-deliverable.v1", script: "", titles: [], coverCopy: [], publishCopy: "", keywords: [] });
  }, 30_000);

  it("lists by search, platform, status and updatedAt descending", async () => {
    const unique = `Library list ${Date.now()}`;
    const first = await service.createContent({ title: `${unique} first`, rawContent: "需要搜索的原始文本", platform: "XIAOHONGSHU" });
    const second = await service.createContent({ title: `${unique} second`, rawContent: "另一段内容", platform: "DOUYIN" });
    contentIds.push(first.id, second.id);

    const result = await service.listContents({ search: "需要搜索", platform: "XIAOHONGSHU", status: "DRAFT", page: 1, pageSize: 20 });
    expect(result.items.map((item) => item.id)).toEqual([first.id]);
    expect(result.items[0]?.updatedAt.getTime()).toBeGreaterThanOrEqual(result.items[0]?.createdAt.getTime() ?? 0);
  }, 30_000);

  it("gets, updates and archives a ContentItem", async () => {
    const created = await service.createContent({ title: `Library update ${Date.now()}`, rawContent: "原始内容", platform: "OTHER" });
    contentIds.push(created.id);

    const updated = await service.updateContent(created.id, { title: "已更新内容", source: "人工录入", tags: ["已更新"] });
    expect(updated.title).toBe("已更新内容");
    expect((await service.getContent(created.id)).source).toBe("人工录入");

    const archived = await service.archiveContent(created.id);
    expect(archived.status).toBe("ARCHIVED");
    await expect(service.updateContent(created.id, { title: "不能编辑" })).rejects.toMatchObject({ code: "CONTENT_INVALID_STATE" });
  }, 30_000);
});
