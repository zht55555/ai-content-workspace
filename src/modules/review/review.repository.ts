import { and, desc, eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import * as schema from "@/src/db/schema";
import type { TaskDb } from "@/src/modules/task/task.repository";
import { ContentError, NonCurrentReviewTargetError } from "@/src/modules/content/content.errors";

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

  async applyDecision(input: { contentItemId: string; contentVersionId: string; reviewerId: string; decision: schema.ReviewDecision; note?: string }) {
    return this.database.transaction(async (transaction) => {
      const [content] = await transaction.select().from(schema.contentItems).where(eq(schema.contentItems.id, input.contentItemId)).for("update");
      if (!content) throw new ContentError("CONTENT_NOT_FOUND", "ContentItem was not found.");
      if (content.status !== "WAITING_REVIEW" && content.status !== "NEEDS_REVISION") throw new ContentError("INVALID_REVIEW_STATE", "ContentItem is not in a reviewable state.");
      if (content.currentVersionId !== input.contentVersionId) throw new NonCurrentReviewTargetError();

      const [review] = await transaction.insert(schema.reviews).values(input).returning();
      if (!review) throw new Error("Review creation failed.");
      if (input.decision === "APPROVED") {
        await transaction.update(schema.contentVersions).set({ isFinal: false }).where(eq(schema.contentVersions.contentItemId, input.contentItemId));
        await transaction.update(schema.contentVersions).set({ isFinal: true }).where(and(eq(schema.contentVersions.id, input.contentVersionId), eq(schema.contentVersions.contentItemId, input.contentItemId)));
      }
      const nextStatus = input.decision === "APPROVED" ? "APPROVED" : input.decision;
      await transaction.update(schema.contentItems).set({ status: nextStatus, updatedAt: new Date() }).where(eq(schema.contentItems.id, input.contentItemId));
      return review;
    });
  }

  async listForContent(contentItemId: string) {
    return this.database.select().from(schema.reviews).where(eq(schema.reviews.contentItemId, contentItemId)).orderBy(desc(schema.reviews.createdAt));
  }
}
