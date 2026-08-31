import { describe, expect, it } from "vitest";

import { assertContentStatusTransition, restoreStatusAfterProcessingFailure } from "@/src/modules/content/content.state";

describe("content business status", () => {
  it("allows processing to enter review after AI completion", () => {
    expect(() => assertContentStatusTransition("DRAFT", "AI_PROCESSING")).not.toThrow();
    expect(() => assertContentStatusTransition("AI_PROCESSING", "WAITING_REVIEW")).not.toThrow();
  });

  it("restores draft after first processing fails", () => {
    expect(restoreStatusAfterProcessingFailure("DRAFT", false)).toBe("DRAFT");
  });

  it("restores the prior review state after regeneration fails", () => {
    expect(restoreStatusAfterProcessingFailure("WAITING_REVIEW", true)).toBe("WAITING_REVIEW");
    expect(restoreStatusAfterProcessingFailure("NEEDS_REVISION", true)).toBe("NEEDS_REVISION");
  });

  it("rejects invalid business transitions", () => {
    expect(() => assertContentStatusTransition("DRAFT", "APPROVED")).toThrow();
  });
});
