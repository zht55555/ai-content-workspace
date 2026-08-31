import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";

import { db, pool } from "@/src/db/client";
import * as schema from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { GET as listContents, POST as createContent } from "@/app/api/contents/route";
import { DELETE as deleteContent, GET as getContent, PATCH as patchContent } from "@/app/api/contents/[contentId]/route";

const runIntegrationTests = Boolean(process.env.DATABASE_URL);
const context = (contentId: string) => ({ params: Promise.resolve({ contentId }) });

describe.skipIf(!runIntegrationTests)("Content Library API", () => {
  const contentIds: string[] = [];

  afterAll(async () => {
    for (const contentId of contentIds) await db.delete(schema.contentItems).where(eq(schema.contentItems.id, contentId));
    await pool.end();
  });

  it("creates a ContentItem and returns its ORIGINAL version pointer", async () => {
    const response = await createContent(new Request("http://localhost/api/contents", { method: "POST", body: JSON.stringify({ title: `API create ${Date.now()}`, rawContent: "原始内容", platform: "DOUYIN", tags: ["API"] }) }));
    expect(response.status).toBe(201);
    const body = await response.json();
    contentIds.push(body.id);
    expect(body.status).toBe("DRAFT");
    expect(body.currentVersionId).toBeTruthy();
  }, 30_000);

  it("lists content with URL filters", async () => {
    const response = await listContents(new Request("http://localhost/api/contents?search=API&platform=DOUYIN&status=DRAFT&page=1&pageSize=20"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items.some((item: { title: string }) => item.title.startsWith("API create"))).toBe(true);
  }, 30_000);

  it("gets, updates and archives content", async () => {
    const response = await createContent(new Request("http://localhost/api/contents", { method: "POST", body: JSON.stringify({ title: `API update ${Date.now()}`, rawContent: "内容", platform: "OTHER" }) }));
    const created = await response.json();
    contentIds.push(created.id);

    const detail = await getContent(new Request(`http://localhost/api/contents/${created.id}`), context(created.id));
    expect(detail.status).toBe(200);
    expect((await detail.json()).currentVersion.source).toBe("ORIGINAL");

    const updated = await patchContent(new Request(`http://localhost/api/contents/${created.id}`, { method: "PATCH", body: JSON.stringify({ title: "API 已更新", tags: ["编辑"] }) }), context(created.id));
    expect(updated.status).toBe(200);
    expect((await updated.json()).title).toBe("API 已更新");

    const archived = await deleteContent(new Request(`http://localhost/api/contents/${created.id}`, { method: "DELETE" }), context(created.id));
    expect(archived.status).toBe(200);
    expect((await archived.json()).status).toBe("ARCHIVED");
  }, 30_000);

  it("returns 400 for invalid filters and 404 for missing content", async () => {
    const invalid = await listContents(new Request("http://localhost/api/contents?status=APPROVED_BUT_INVALID"));
    expect(invalid.status).toBe(400);
    const missing = await getContent(new Request("http://localhost/api/contents/00000000-0000-0000-0000-000000000000"), context("00000000-0000-0000-0000-000000000000"));
    expect(missing.status).toBe(404);
  }, 30_000);
});
