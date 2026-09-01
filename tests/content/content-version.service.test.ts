import { describe, expect, it } from "vitest";

import { ContentError } from "@/src/modules/content/content.errors";
import { ContentVersionService } from "@/src/modules/content/content-version.service";
import type { ContentVersionDTO } from "@/src/modules/content/content.types";

const payload = { schemaVersion: "content-deliverable.v1" as const, script: "脚本", titles: ["标题"], coverCopy: ["封面"], publishCopy: "发布文案", keywords: ["关键词"] };
const contentItemId = "11111111-1111-4111-8111-111111111111";
const baseVersionId = "22222222-2222-4222-8222-222222222222";
const editedVersionId = "33333333-3333-4333-8333-333333333333";
const userId = "44444444-4444-4444-8444-444444444444";
const versionOne: ContentVersionDTO = { id: baseVersionId, contentItemId, versionNumber: 1, source: "ORIGINAL", createdBy: userId, baseVersionId: null, workflowRunId: null, analysisResultId: null, contentJson: payload, isFinal: false, createdAt: "2026-08-31T00:00:00.000Z" };
const versionTwo: ContentVersionDTO = {
  id: editedVersionId,
  contentItemId,
  versionNumber: 2,
  source: "HUMAN_EDIT",
  createdBy: userId,
  baseVersionId,
  workflowRunId: null,
  analysisResultId: null,
  contentJson: { ...payload, script: "修改后脚本", titles: ["新标题"], coverCopy: ["新封面"], publishCopy: "新的发布文案", keywords: ["新关键词"] },
  isFinal: false,
  createdAt: "2026-08-31T00:05:00.000Z",
};

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

    const dto: ContentVersionDTO = { id: "version-2", contentItemId: "content-1", versionNumber: 2, source: "HUMAN_EDIT", createdBy: "user-1", baseVersionId: "version-1", workflowRunId: null, analysisResultId: null, contentJson: payload, isFinal: false, createdAt: "2026-08-31T00:00:00.000Z" };

    expect(dto.contentJson).toEqual(payload);
    await expect(service.createVersion({ contentItemId: "content-1", createdBy: "user-1", source: "HUMAN_EDIT", baseVersionId: "version-1", payload })).rejects.toMatchObject({ name: "StaleVersionError", code: "VERSION_CONFLICT" });
  });

  it("creates a human edit with only deliverable fields", async () => {
    let capturedInput: Record<string, unknown> | undefined;
    const repository = {
      createHumanEdit: async (input: Record<string, unknown>) => {
        capturedInput = input;
        return { ...versionTwo, contentJson: input.payload };
      },
    };
    const service = new ContentVersionService(repository as never);

    const result = await service.createHumanEdit({
      contentItemId,
      baseVersionId,
      createdBy: userId,
      payload,
    });

    expect(capturedInput).toEqual({
      contentItemId,
      baseVersionId,
      createdBy: userId,
      payload,
    });
    expect(result).toMatchObject({
      id: editedVersionId,
      versionNumber: 2,
      source: "HUMAN_EDIT",
      baseVersionId,
      contentJson: payload,
    });
  });

  it("rejects a human edit payload with non-deliverable fields", async () => {
    const repository = { createHumanEdit: async () => versionTwo };
    const service = new ContentVersionService(repository as never);

    await expect(service.createHumanEdit({
      contentItemId,
      baseVersionId,
      createdBy: userId,
      payload: { ...payload, analysis: { score: 1 } },
    })).rejects.toMatchObject({ name: "ZodError" });
  });

  it("lists version history for a content item", async () => {
    const repository = { listVersions: async () => [versionTwo, versionOne] };
    const service = new ContentVersionService(repository as never);

    await expect(service.listVersions("content-1")).resolves.toEqual([versionTwo, versionOne]);
  });

  it("returns content not found when a requested version is missing for the content item", async () => {
    const repository = { findByIdForContent: async () => null };
    const service = new ContentVersionService(repository as never);

    await expect(service.getVersion("content-1", "version-2")).rejects.toMatchObject({
      name: "ContentError",
      code: "CONTENT_NOT_FOUND",
    } satisfies Partial<ContentError>);
  });

  it("compares the five deliverable fields between two versions", async () => {
    const repository = {
      findByIdForContent: async (_contentItemId: string, versionId: string) => {
        if (versionId === "version-1") return versionOne;
        if (versionId === "version-2") return versionTwo;
        return null;
      },
    };
    const service = new ContentVersionService(repository as never);

    await expect(service.compareVersions("content-1", "version-1", "version-2")).resolves.toEqual({
      fields: {
        script: { before: "脚本", after: "修改后脚本", changed: true },
        titles: { before: ["标题"], after: ["新标题"], changed: true },
        coverCopy: { before: ["封面"], after: ["新封面"], changed: true },
        publishCopy: { before: "发布文案", after: "新的发布文案", changed: true },
        keywords: { before: ["关键词"], after: ["新关键词"], changed: true },
      },
    });
  });
});
