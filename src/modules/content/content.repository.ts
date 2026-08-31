import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/src/db/client";
import * as schema from "@/src/db/schema";
import type { TaskDb } from "@/src/modules/task/task.repository";
import type { ContentPlatform } from "./content.types";

export class ContentRepository {
  constructor(private readonly database: TaskDb = db) {}

  async findDemoUser() {
    const [user] = await this.database.select().from(schema.users).where(eq(schema.users.email, "demo@ai-content-workflow.local"));
    return user;
  }

  async insertContent(input: { userId: string; title: string; rawContent: string; platform: ContentPlatform; source?: string; sourceUrl?: string; tags: string[] }) {
    const [content] = await this.database.insert(schema.contentItems).values(input).returning();
    if (!content) throw new Error("ContentItem creation failed.");
    return content;
  }

  async createWithOriginalVersion(input: { userId: string; title: string; rawContent: string; platform: ContentPlatform; source?: string; sourceUrl?: string; tags: string[] }) {
    return this.database.transaction(async (transaction) => {
      const [content] = await transaction.insert(schema.contentItems).values(input).returning();
      if (!content) throw new Error("ContentItem creation failed.");
      const [version] = await transaction.insert(schema.contentVersions).values({
        contentItemId: content.id,
        versionNumber: 1,
        source: "ORIGINAL",
        createdBy: input.userId,
        contentJson: { schemaVersion: "content-deliverable.v1", script: "", titles: [], coverCopy: [], publishCopy: "", keywords: [] },
      }).returning();
      if (!version) throw new Error("Original ContentVersion creation failed.");
      const [updatedContent] = await transaction.update(schema.contentItems).set({ currentVersionId: version.id, updatedAt: new Date() }).where(eq(schema.contentItems.id, content.id)).returning();
      if (!updatedContent) throw new Error("ContentItem version pointer update failed.");
      return { content: updatedContent, originalVersion: version };
    });
  }

  async list(input: { userId: string; search?: string; platform?: ContentPlatform; status?: schema.ContentStatus; offset: number; limit: number }) {
    const filters = [eq(schema.contentItems.userId, input.userId)];
    if (input.platform) filters.push(eq(schema.contentItems.platform, input.platform));
    if (input.status) filters.push(eq(schema.contentItems.status, input.status));
    if (input.search) {
      const search = `%${input.search}%`;
      filters.push(or(ilike(schema.contentItems.title, search), ilike(schema.contentItems.rawContent, search))!);
    }
    const where = and(...filters);
    const [items, totalResult] = await Promise.all([
      this.database.select().from(schema.contentItems).where(where).orderBy(desc(schema.contentItems.updatedAt)).limit(input.limit).offset(input.offset),
      this.database.select({ total: count() }).from(schema.contentItems).where(where),
    ]);
    return { items, total: Number(totalResult[0]?.total ?? 0) };
  }

  async updateBasicInfo(contentItemId: string, values: { title?: string; rawContent?: string; platform?: ContentPlatform; source?: string; sourceUrl?: string; tags?: string[] }) {
    const [content] = await this.database.update(schema.contentItems).set({ ...values, updatedAt: new Date() }).where(eq(schema.contentItems.id, contentItemId)).returning();
    return content;
  }

  async findById(contentItemId: string, userId?: string) {
    const filters = [eq(schema.contentItems.id, contentItemId)];
    if (userId) filters.push(eq(schema.contentItems.userId, userId));
    const [content] = await this.database.select().from(schema.contentItems).where(and(...filters));
    return content;
  }

  async updateCurrentVersion(contentItemId: string, currentVersionId: string) {
    const [content] = await this.database.update(schema.contentItems).set({ currentVersionId, updatedAt: new Date() }).where(eq(schema.contentItems.id, contentItemId)).returning();
    return content;
  }

  async updateStatus(contentItemId: string, status: schema.ContentStatus) {
    const [content] = await this.database.update(schema.contentItems).set({ status, lastError: null, updatedAt: new Date() }).where(eq(schema.contentItems.id, contentItemId)).returning();
    return content;
  }
}

export class ContentVersionRepository {
  constructor(private readonly database: TaskDb = db) {}

  async findLatestForContent(contentItemId: string) {
    const [version] = await this.database.select().from(schema.contentVersions).where(eq(schema.contentVersions.contentItemId, contentItemId)).orderBy(desc(schema.contentVersions.versionNumber)).limit(1);
    return version;
  }

  async findById(versionId: string) {
    const [version] = await this.database.select().from(schema.contentVersions).where(eq(schema.contentVersions.id, versionId));
    return version;
  }

  async findByIdForContent(contentItemId: string, versionId: string) {
    const [version] = await this.database.select().from(schema.contentVersions).where(and(eq(schema.contentVersions.id, versionId), eq(schema.contentVersions.contentItemId, contentItemId)));
    return version;
  }

  async findCurrentForContent(contentItemId: string, versionId: string | null) {
    if (!versionId) return undefined;
    return this.findByIdForContent(contentItemId, versionId);
  }

  async insert(input: { contentItemId: string; versionNumber: number; source: schema.ContentVersionSource; createdBy: string; baseVersionId?: string; workflowRunId?: string; analysisResultId?: string; contentJson: unknown }) {
    const [version] = await this.database.insert(schema.contentVersions).values(input).returning();
    if (!version) throw new Error("ContentVersion creation failed.");
    return version;
  }
}
