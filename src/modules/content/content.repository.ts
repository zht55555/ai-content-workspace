import { and, desc, eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import * as schema from "@/src/db/schema";
import type { TaskDb } from "@/src/modules/task/task.repository";
import type { ContentPlatform } from "./content.types";

export class ContentRepository {
  constructor(private readonly database: TaskDb = db) {}

  async insertContent(input: { userId: string; title: string; rawContent: string; platform: ContentPlatform; source?: string; sourceUrl?: string; tags: string[] }) {
    const [content] = await this.database.insert(schema.contentItems).values(input).returning();
    if (!content) throw new Error("ContentItem creation failed.");
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

  async insert(input: { contentItemId: string; versionNumber: number; source: schema.ContentVersionSource; createdBy: string; baseVersionId?: string; workflowRunId?: string; analysisResultId?: string; contentJson: unknown }) {
    const [version] = await this.database.insert(schema.contentVersions).values(input).returning();
    if (!version) throw new Error("ContentVersion creation failed.");
    return version;
  }
}
