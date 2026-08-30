import { describe, expect, it } from "vitest";

import { getTaskTypeLabel, getTaskStatusLabel, getWorkflowProgress, validateNewTask } from "@/src/components/workspace/workspace-utils";

describe("workspace-utils", () => {
  it("returns readable Chinese labels for task types and statuses", () => {
    expect(getTaskTypeLabel("TRANSCRIPT_ANALYSIS")).toBe("视频逐字稿");
    expect(getTaskStatusLabel("RUNNING")).toBe("分析中");
  });

  it("calculates real workflow progress from successful steps", () => {
    expect(getWorkflowProgress([{ status: "SUCCESS" }, { status: "RUNNING" }, { status: "PENDING" }])).toEqual({ completed: 1, total: 3, percentage: 33 });
  });

  it("validates a new task title and content", () => {
    expect(validateNewTask({ title: "", content: "内容" })).toEqual({ title: "请输入任务标题" });
    expect(validateNewTask({ title: "标题", content: "" })).toEqual({ content: "请输入需要分析的内容" });
    expect(validateNewTask({ title: "标题", content: "内容" })).toEqual({});
  });
});
