import { eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import * as schema from "@/src/db/schema";
import type { TaskDb } from "@/src/modules/task/task.repository";

export class ReviewRepository {
  constructor(private readonly database: TaskDb = db) {}

  async findVersion(contentVersionId: string) {
    const [version] = await this.database.select().from(schema.contentVersions).where(eq(schema.contentVersions.id, contentVersionId));
    return version;
  }

  async findCurrentVersionId(contentItemId: string) {
    const [content] = await this.database.select({ currentVersionId: schema.contentItems.currentVersionId }).from(schema.contentItems).where(eq(schema.contentItems.id, contentItemId));
    return content?.currentVersionId ?? null;
  }

  async insert(input: { contentItemId: string; contentVersionId: string; reviewerId: string; decision: schema.ReviewDecision; note?: string }) {
    const [review] = await this.database.insert(schema.reviews).values(input).returning();
    if (!review) throw new Error("Review creation failed.");
    return review;
  }
}
