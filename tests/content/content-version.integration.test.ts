import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

import { db, pool } from "@/src/db/client";
import * as schema from "@/src/db/schema";
import { ContentRepository } from "@/src/modules/content/content.repository";
import { ContentVersionService } from "@/src/modules/content/content-version.service";

const runIntegrationTests = Boolean(process.env.DATABASE_URL);

describe.skipIf(!runIntegrationTests)("ContentVersionService integration", () => {
  const contentRepository = new ContentRepository();
  const versionService = new ContentVersionService();
  const contentIds: string[] = [];
  let demoUserId: string;

  beforeAll(async () => {
    const user = await contentRepository.findDemoUser();
    if (!user) throw new Error("Demo User is not seeded.");
    demoUserId = user.id;
  });

  afterAll(async () => {
    if (contentIds.length > 0) {
      await db.delete(schema.contentItems).where(inArray(schema.contentItems.id, contentIds));
    }
    await pool.end();
  });

  it("creates a transactional human edit, preserves the previous version, and compares the five deliverable fields", async () => {
    const created = await contentRepository.createWithOriginalVersion({
      userId: demoUserId,
      title: `Version history ${Date.now()}`,
      rawContent: "原始内容",
      platform: "WECHAT",
      tags: [],
    });
    contentIds.push(created.content.id);

    const humanEdit = await versionService.createHumanEdit({
      contentItemId: created.content.id,
      baseVersionId: created.originalVersion.id,
      createdBy: demoUserId,
      payload: {
        schemaVersion: "content-deliverable.v1",
        script: "人工修改后的脚本",
        titles: ["人工标题"],
        coverCopy: ["人工封面"],
        publishCopy: "人工发布文案",
        keywords: ["人工关键词"],
      },
    });

    expect(humanEdit).toMatchObject({
      contentItemId: created.content.id,
      versionNumber: 2,
      source: "HUMAN_EDIT",
      createdBy: demoUserId,
      baseVersionId: created.originalVersion.id,
    });

    const currentContent = await contentRepository.findById(created.content.id);
    expect(currentContent?.currentVersionId).toBe(humanEdit.id);

    const originalVersion = await versionService.getVersion(created.content.id, created.originalVersion.id);
    expect(originalVersion).toMatchObject({
      id: created.originalVersion.id,
      versionNumber: 1,
      source: "ORIGINAL",
      contentJson: {
        schemaVersion: "content-deliverable.v1",
        script: "",
        titles: [],
        coverCopy: [],
        publishCopy: "",
        keywords: [],
      },
    });

    const versions = await versionService.listVersions(created.content.id);
    expect(versions.map((version) => ({ id: version.id, versionNumber: version.versionNumber, source: version.source }))).toEqual([
      { id: humanEdit.id, versionNumber: 2, source: "HUMAN_EDIT" },
      { id: created.originalVersion.id, versionNumber: 1, source: "ORIGINAL" },
    ]);

    const comparison = await versionService.compareVersions(created.content.id, created.originalVersion.id, humanEdit.id);
    expect(comparison).toEqual({
      fields: {
        script: { before: "", after: "人工修改后的脚本", changed: true },
        titles: { before: [], after: ["人工标题"], changed: true },
        coverCopy: { before: [], after: ["人工封面"], changed: true },
        publishCopy: { before: "", after: "人工发布文案", changed: true },
        keywords: { before: [], after: ["人工关键词"], changed: true },
      },
    });
  }, 30_000);

  it("rejects a second human edit from a stale base version and leaves the current version unchanged", async () => {
    const created = await contentRepository.createWithOriginalVersion({
      userId: demoUserId,
      title: `Version conflict ${Date.now()}`,
      rawContent: "需要冲突检测的内容",
      platform: "OTHER",
      tags: [],
    });
    contentIds.push(created.content.id);

    const firstEdit = await versionService.createHumanEdit({
      contentItemId: created.content.id,
      baseVersionId: created.originalVersion.id,
      createdBy: demoUserId,
      payload: {
        schemaVersion: "content-deliverable.v1",
        script: "第一次修改",
        titles: ["第一次标题"],
        coverCopy: ["第一次封面"],
        publishCopy: "第一次发布文案",
        keywords: ["第一次关键词"],
      },
    });

    await expect(versionService.createHumanEdit({
      contentItemId: created.content.id,
      baseVersionId: created.originalVersion.id,
      createdBy: demoUserId,
      payload: {
        schemaVersion: "content-deliverable.v1",
        script: "第二次修改",
        titles: ["第二次标题"],
        coverCopy: ["第二次封面"],
        publishCopy: "第二次发布文案",
        keywords: ["第二次关键词"],
      },
    })).rejects.toMatchObject({ name: "StaleVersionError", code: "VERSION_CONFLICT" });

    const currentContent = await contentRepository.findById(created.content.id);
    expect(currentContent?.currentVersionId).toBe(firstEdit.id);

    const versions = await db.select().from(schema.contentVersions).where(eq(schema.contentVersions.contentItemId, created.content.id));
    expect(versions).toHaveLength(2);
  }, 30_000);
});
