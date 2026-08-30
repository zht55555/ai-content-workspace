import { describe, expect, it } from "vitest";

import { getTaskIdFromPathname, getTaskPath, shouldRefreshTasksOnWorkflowStatusChange } from "@/src/components/workspace/workspace-utils";

describe("workspace route selection", () => {
  it("extracts the task id from the persistent task URL", () => {
    expect(getTaskIdFromPathname("/tasks/task-123")).toBe("task-123");
  });

  it("builds a persistent task URL without query state", () => {
    expect(getTaskPath("task-123")).toBe("/tasks/task-123");
  });

  it("keeps the workspace empty state for the root URL", () => {
    expect(getTaskIdFromPathname("/")).toBeUndefined();
  });

  it("does not treat unrelated routes as task selection", () => {
    expect(getTaskIdFromPathname("/settings")).toBeUndefined();
  });

  it("does not refresh the sidebar for an existing terminal snapshot", () => {
    expect(shouldRefreshTasksOnWorkflowStatusChange(undefined, "COMPLETED")).toBe(false);
  });

  it("refreshes the sidebar when a running workflow reaches a terminal state", () => {
    expect(shouldRefreshTasksOnWorkflowStatusChange("RUNNING", "COMPLETED")).toBe(true);
  });
});
