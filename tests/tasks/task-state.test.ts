import { describe, expect, it } from "vitest";

import { canTransitionTaskStatus, assertTaskStatusTransition } from "@/src/modules/task/task.state";

describe("task status transitions", () => {
  it("allows draft to queued but not draft to running", () => {
    expect(canTransitionTaskStatus("DRAFT", "QUEUED")).toBe(true);
    expect(canTransitionTaskStatus("DRAFT", "RUNNING")).toBe(false);
  });

  it("allows terminal statuses to remain terminal", () => {
    expect(() => assertTaskStatusTransition("FAILED", "FAILED")).not.toThrow();
    expect(() => assertTaskStatusTransition("COMPLETED", "RUNNING")).toThrow();
  });
});
