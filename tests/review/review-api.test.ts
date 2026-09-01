import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db, pool } from "@/src/db/client";
import * as schema from "@/src/db/schema";
import { ContentRepository, ContentVersionRepository } from "@/src/modules/content/content.repository";
import { GET, POST } from "@/app/api/contents/[contentId]/reviews/route";

const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "1" && Boolean(process.env.DATABASE_URL);
const context = (contentId: string) => ({ params: Promise.resolve({ contentId }) });
const payload = { schemaVersion: "content-deliverable.v1" as const, script: "脚本", titles: ["标题"], coverCopy: ["封面"], publishCopy: "发布文案", keywords: ["关键词"] };

describe.skipIf(!runIntegrationTests)("Review API", () => {
  const contentIds: string[] = [];
  const repository = new ContentRepository();
  const versions = new ContentVersionRepository();
  let userId: string;

  beforeAll(async () => {
    const user = await repository.findDemoUser();
    if (!user) throw new Error("Demo User is not seeded.");
    userId = user.id;
  });

  afterAll(async () => {
    for (const id of contentIds) await db.delete(schema.contentItems).where(eq(schema.contentItems.id, id));
    await pool.end();
  });

  async function createReviewable() {
    const created = await repository.createWithOriginalVersion({ userId, title: `Review API ${Date.now()}-${contentIds.length}`, rawContent: "审核测试内容", platform: "DOUYIN", tags: [] });
    contentIds.push(created.content.id);
    await repository.updateStatus(created.content.id, "WAITING_REVIEW");
    return created;
  }

  it("supports Request Revision, history, Human Edit, and Approve with one final version", async () => {
    const created = await createReviewable();
    const revision = await POST(new Request("http://localhost/api/contents/id/reviews", { method: "POST", body: JSON.stringify({ contentVersionId: created.originalVersion.id, decision: "NEEDS_REVISION", note: "请优化开头" }) }), context(created.content.id));
    expect(revision.status).toBe(201);
    const edited = await versions.createHumanEdit({ contentItemId: created.content.id, baseVersionId: created.originalVersion.id, createdBy: userId, payload });
    await repository.updateStatus(created.content.id, "WAITING_REVIEW");
    const approval = await POST(new Request("http://localhost/api/contents/id/reviews", { method: "POST", body: JSON.stringify({ contentVersionId: edited.id, decision: "APPROVED" }) }), context(created.content.id));
    expect(approval.status).toBe(201);
    const history = await GET(new Request("http://localhost/api/contents/id/reviews"), context(created.content.id));
    expect(history.status).toBe(200);
    expect(await history.json()).toHaveLength(2);
    const finals = await db.select({ id: schema.contentVersions.id }).from(schema.contentVersions).where(eq(schema.contentVersions.isFinal, true));
    expect(finals.some((version) => version.id === edited.id)).toBe(true);
    const duplicate = await POST(new Request("http://localhost/api/contents/id/reviews", { method: "POST", body: JSON.stringify({ contentVersionId: edited.id, decision: "APPROVED" }) }), context(created.content.id));
    expect(duplicate.status).toBe(409);
  }, 30_000);

  it("protects old version targets and invalid review states", async () => {
    const created = await createReviewable();
    const edited = await versions.createHumanEdit({ contentItemId: created.content.id, baseVersionId: created.originalVersion.id, createdBy: userId, payload });
    await repository.updateStatus(created.content.id, "WAITING_REVIEW");
    const oldVersion = await POST(new Request("http://localhost/api/contents/id/reviews", { method: "POST", body: JSON.stringify({ contentVersionId: created.originalVersion.id, decision: "REJECTED" }) }), context(created.content.id));
    expect(oldVersion.status).toBe(409);
    const invalid = await POST(new Request("http://localhost/api/contents/id/reviews", { method: "POST", body: JSON.stringify({ contentVersionId: edited.id, decision: "APPROVED" }) }), context(created.content.id));
    expect(invalid.status).toBe(201);
    const draft = await repository.createWithOriginalVersion({ userId, title: `Review invalid ${Date.now()}`, rawContent: "草稿", platform: "OTHER", tags: [] });
    contentIds.push(draft.content.id);
    const rejected = await POST(new Request("http://localhost/api/contents/id/reviews", { method: "POST", body: JSON.stringify({ contentVersionId: draft.originalVersion.id, decision: "REJECTED" }) }), context(draft.content.id));
    expect(rejected.status).toBe(409);
  }, 30_000);
});
