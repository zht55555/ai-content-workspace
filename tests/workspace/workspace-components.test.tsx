import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ResultTabs } from "@/src/components/workspace/result-tabs";
import { TaskSidebar } from "@/src/components/workspace/task-sidebar";

const task = { id: "task-1", title: "测试任务", type: "TRANSCRIPT_ANALYSIS" as const, status: "COMPLETED" as const, createdAt: "2026-08-30T00:00:00.000Z", updatedAt: "2026-08-30T00:00:00.000Z" };

describe("workspace components", () => {
  it("renders task history with readable status", () => {
    const html = renderToStaticMarkup(React.createElement(TaskSidebar, { tasks: [task], loading: false, error: null, onSelect: () => undefined, onCreate: () => undefined, onDelete: () => undefined }));
    expect(html).toContain("测试任务");
    expect(html).toContain("已完成");
    expect(html).toContain("视频逐字稿");
  });

  it("renders all result navigation tabs", () => {
    const result = { analysis: { topic: "主题", contentType: "故事", targetAudience: ["创作者"], coreMessage: "核心", summary: "摘要" }, hook: { type: "冲突", content: "开头", score: 80, reason: "理由", strengths: ["强"], problems: ["弱"] }, structure: [], emotion: { overallTone: "积极", emotionalArc: "上升", emotionPoints: [] }, optimization: { strengths: [], weaknesses: [], keep: [], change: [], rhythmSuggestions: [], structureSuggestions: [], contentSuggestions: [] }, generatedScript: { title: "脚本", coreDirection: "方向", script: "正文", notes: [] }, marketing: { titles: ["标题"], coverTexts: ["封面"], publishCopy: "发布", keywords: ["内容"] } };
    const html = renderToStaticMarkup(React.createElement(ResultTabs, { result }));
    for (const tab of ["概览", "钩子", "结构", "情绪", "优化", "脚本", "营销"]) expect(html).toContain(tab);
  });
});
