import { describe, expect, it } from "vitest";

import { getWorkflowReconnectDelay } from "@/src/workflow/events/use-workflow-events";

describe("workflow SSE reconnect policy", () => {
  it("uses bounded exponential backoff", () => {
    expect(getWorkflowReconnectDelay(0)).toBe(500);
    expect(getWorkflowReconnectDelay(1)).toBe(1000);
    expect(getWorkflowReconnectDelay(2)).toBe(2000);
    expect(getWorkflowReconnectDelay(10)).toBe(4000);
  });
});
