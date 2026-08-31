import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { ContentList } from "@/src/components/content/content-list";
import { ContentDetail } from "@/src/components/content/content-detail";

const item = {
  id: "content-1",
  title: "春季新品短视频",
  rawContent: "今天分享一个春季新品内容。",
  platform: "DOUYIN" as const,
  status: "DRAFT" as const,
  source: "手动粘贴",
  sourceUrl: "https://example.com/source",
  tags: ["新品", "短视频"],
  updatedAt: "2026-08-31T08:00:00.000Z",
  createdAt: "2026-08-30T08:00:00.000Z",
};

describe("content library pages", () => {
  it("renders the library list fields and empty guidance", () => {
    const html = renderToStaticMarkup(React.createElement(ContentList, { items: [item], loading: false, error: null, onSelect: () => undefined, onRetry: () => undefined }));
    expect(html).toContain("春季新品短视频");
    expect(html).toContain("抖音");
    expect(html).toContain("草稿");
    expect(html).toContain("手动粘贴");
    expect(html).toContain("新品");

    const empty = renderToStaticMarkup(React.createElement(ContentList, { items: [], loading: false, error: null, onSelect: () => undefined, onRetry: () => undefined }));
    expect(empty).toContain("创建第一条内容");
  });

  it("renders content detail, original material and enabled AI processing action", () => {
    const html = renderToStaticMarkup(React.createElement(ContentDetail, { content: { ...item, currentVersionId: "version-1", currentVersion: { id: "version-1", versionNumber: 1, source: "ORIGINAL", contentJson: { schemaVersion: "content-deliverable.v1", script: "", titles: [], coverCopy: [], publishCopy: "", keywords: [] } } }, loading: false, error: null, onRetry: () => undefined, onUpdated: () => undefined }));
    expect(html).toContain("春季新品短视频");
    expect(html).toContain("今天分享一个春季新品内容。");
    expect(html).toContain("Current Version");
    expect(html).toContain("ORIGINAL");
    expect(html).toContain("AI Analysis 尚未开始");
    expect(html).toContain("Start AI Processing");
    expect(html).not.toContain("disabled=\"\"");
  });
});
