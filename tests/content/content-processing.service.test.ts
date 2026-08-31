import { describe, expect, it, vi } from "vitest";

import { ContentProcessingService, toContentDeliverable } from "@/src/modules/content/content-processing.service";

describe("ContentProcessingService", () => {
  it("maps analysis output to deliverables without copying analysis sections", () => {
    const result = toContentDeliverable({
      analysis: { topic: "关系", contentType: "短视频", targetAudience: ["创作者"], coreMessage: "核心信息", summary: "摘要" },
      hook: { type: "问题", content: "开头", score: 80, reason: "清晰", strengths: ["强"], problems: ["弱"] },
      structure: [],
      emotion: { overallTone: "积极", emotionalArc: "上扬", emotionPoints: [] },
      optimization: { strengths: ["优点"], weaknesses: [], keep: [], change: [], rhythmSuggestions: [], structureSuggestions: [], contentSuggestions: [] },
      generatedScript: { title: "脚本标题", coreDirection: "方向", script: "脚本正文", notes: ["备注"] },
      marketing: { titles: ["标题 1"], coverTexts: ["封面 1"], publishCopy: "发布文案", keywords: ["关键词"] },
    });

    expect(result).toEqual({ schemaVersion: "content-deliverable.v1", script: "脚本正文", titles: ["标题 1"], coverCopy: ["封面 1"], publishCopy: "发布文案", keywords: ["关键词"] });
    expect(result).not.toHaveProperty("analysis");
    expect(result).not.toHaveProperty("hook");
  });

  it("restores the captured business status and preserves the current version after failure", async () => {
    const current = { id: "content-1", status: "WAITING_REVIEW", currentVersionId: "version-1" };
    const repository = {
      findById: vi.fn().mockResolvedValue(current),
      restoreAfterProcessingFailure: vi.fn().mockResolvedValue({ ...current, lastError: "provider timeout" }),
    };
    const service = new ContentProcessingService({ contentRepository: repository as never, taskRepository: {} as never, workflowEngine: {} as never });

    await service.handleWorkflowFailure({ contentItemId: "content-1", taskId: "task-1", workflowRunId: "run-1", previousStatus: "WAITING_REVIEW", error: new Error("provider timeout") });

    expect(repository.restoreAfterProcessingFailure).toHaveBeenCalledWith("content-1", "WAITING_REVIEW", "provider timeout");
  });
});
