import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/src/db/client";
import * as schema from "@/src/db/schema";
import type { TaskDb } from "@/src/modules/task/task.repository";

const trackedStatuses = ["DRAFT", "AI_PROCESSING", "WAITING_REVIEW", "NEEDS_REVISION", "APPROVED"] as const;

export class ProductRepository {
  constructor(private readonly database: TaskDb = db) {}

  async getDashboard(userId: string) {
    const counts = await this.database.select({ status: schema.contentItems.status, total: count() }).from(schema.contentItems).where(and(eq(schema.contentItems.userId, userId), inArray(schema.contentItems.status, trackedStatuses))).groupBy(schema.contentItems.status);
    const byStatus = Object.fromEntries(counts.map((row) => [row.status, Number(row.total)]));
    const recent = await this.database.select().from(schema.contentItems).where(and(eq(schema.contentItems.userId, userId), inArray(schema.contentItems.status, trackedStatuses))).orderBy(desc(schema.contentItems.updatedAt)).limit(6);
    const waitingReview = await this.database.select().from(schema.contentItems).where(and(eq(schema.contentItems.userId, userId), inArray(schema.contentItems.status, ["WAITING_REVIEW", "NEEDS_REVISION"]))).orderBy(desc(schema.contentItems.updatedAt)).limit(6);
    const recentlyCompleted = await this.database.select().from(schema.contentItems).where(and(eq(schema.contentItems.userId, userId), inArray(schema.contentItems.status, ["APPROVED", "PUBLISHED"]))).orderBy(desc(schema.contentItems.updatedAt)).limit(6);
    return { counts: Object.fromEntries(trackedStatuses.map((status) => [status, byStatus[status] ?? 0])), recent, waitingReview, recentlyCompleted };
  }

  async listReviewCenter(userId: string, status?: "WAITING_REVIEW" | "NEEDS_REVISION" | "APPROVED" | "REJECTED") {
    const statuses = status ? [status] : ["WAITING_REVIEW", "NEEDS_REVISION", "APPROVED", "REJECTED"] as const;
    return this.database.select({ content: schema.contentItems, currentVersion: schema.contentVersions }).from(schema.contentItems).leftJoin(schema.contentVersions, eq(schema.contentItems.currentVersionId, schema.contentVersions.id)).where(and(eq(schema.contentItems.userId, userId), inArray(schema.contentItems.status, statuses))).orderBy(desc(schema.contentItems.updatedAt)).limit(100);
  }
}
