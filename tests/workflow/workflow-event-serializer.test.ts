import { describe, expect, it } from "vitest";

import { encodeSseComment, encodeSseEvent } from "@/src/workflow/events/sse";
import { serializeWorkflowEvent } from "@/src/workflow/events/workflow-event-serializer";
import type { WorkflowEvent } from "@/src/workflow/events/workflow-event.types";

const completedEvent: WorkflowEvent = {
  eventId: "event-1",
  eventType: "workflow.step.completed",
  workflowRunId: "run-1",
  taskId: "task-1",
  timestamp: "2026-08-30T00:00:00.000Z",
  step: { id: "step-1", key: "content-analysis", sequence: 1, title: "内容分析" },
  retryCount: 0,
  output: { safe: true },
};

describe("Workflow event serialization", () => {
  it("serializes only public event fields and does not expose step output", () => {
    const serialized = serializeWorkflowEvent(completedEvent);
    const data = JSON.parse(serialized) as Record<string, unknown>;

    expect(data).toMatchObject({ eventId: "event-1", eventType: "workflow.step.completed", workflowRunId: "run-1" });
    expect(data).not.toHaveProperty("output");
  });

  it("serializes workflow errors as code and message only", () => {
    const event: WorkflowEvent = {
      eventId: "event-2",
      eventType: "workflow.failed",
      workflowRunId: "run-1",
      taskId: "task-1",
      timestamp: "2026-08-30T00:00:00.000Z",
      error: { code: "WORKFLOW_STEP_FAILED", message: "失败" },
    };

    expect(JSON.parse(serializeWorkflowEvent(event))).toEqual(expect.objectContaining({ error: { code: "WORKFLOW_STEP_FAILED", message: "失败" } }));
  });

  it("encodes standard SSE id, event, and data fields", () => {
    const frame = encodeSseEvent(completedEvent);

    expect(frame).toContain("id: event-1\n");
    expect(frame).toContain("event: workflow.step.completed\n");
    expect(frame).toContain("data: {");
    expect(frame.endsWith("\n\n")).toBe(true);
  });

  it("encodes heartbeat as an SSE comment", () => {
    expect(encodeSseComment("ping")).toBe(": ping\n\n");
  });
});
