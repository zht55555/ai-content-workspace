import { describe, expect, it } from "vitest";

import { ContentVersionService } from "@/src/modules/content/content-version.service";

const payload = { schemaVersion: "content-deliverable.v1" as const, script: "脚本", titles: ["标题"], coverCopy: ["封面"], publishCopy: "发布文案", keywords: ["关键词"] };

describe("ContentVersionService", () => {
  it("creates the next deliverable version from the current base version", async () => {
    const repository = {
      findLatestForContent: async () => ({ id: "version-1", contentItemId: "content-1", versionNumber: 1 }),
      insert: async (input: Record<string, unknown>) => ({ id: "version-2", ...input }),
    };
    const service = new ContentVersionService(repository as never);

    const result = await service.createVersion({ contentItemId: "content-1", createdBy: "user-1", source: "HUMAN_EDIT", baseVersionId: "version-1", payload });

    expect(result.versionNumber).toBe(2);
    expect(result.contentJson).toEqual(payload);
  });

  it("rejects a version created from a stale base version", async () => {
    const repository = { findLatestForContent: async () => ({ id: "version-2", contentItemId: "content-1", versionNumber: 2 }) };
    const service = new ContentVersionService(repository as never);

    await expect(service.createVersion({ contentItemId: "content-1", createdBy: "user-1", source: "HUMAN_EDIT", baseVersionId: "version-1", payload })).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  });
});
