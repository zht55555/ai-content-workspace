import { describe, expect, it, vi } from "vitest";

import type { WorkflowEvent } from "@/src/workflow/events/workflow-event.types";
import { InMemoryWorkflowEventBus } from "@/src/workflow/events/in-memory-workflow-event-bus";

const event = (workflowRunId: string, eventId = workflowRunId): WorkflowEvent => ({
  eventId,
  eventType: "workflow.started",
  workflowRunId,
  taskId: "task-1",
  timestamp: new Date().toISOString(),
  workflowType: "DEMO_CONTENT_WORKFLOW",
});

describe("InMemoryWorkflowEventBus", () => {
  it("publishes an event to subscribers for the same run", async () => {
    const bus = new InMemoryWorkflowEventBus();
    const listener = vi.fn();
    bus.subscribe("run-1", listener);

    await bus.publish(event("run-1"));

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ workflowRunId: "run-1" }));
  });

  it("does not publish after unsubscribe", async () => {
    const bus = new InMemoryWorkflowEventBus();
    const listener = vi.fn();
    const unsubscribe = bus.subscribe("run-1", listener);
    unsubscribe();

    await bus.publish(event("run-1"));

    expect(listener).not.toHaveBeenCalled();
  });

  it("isolates subscribers by workflowRunId", async () => {
    const bus = new InMemoryWorkflowEventBus();
    const first = vi.fn();
    const second = vi.fn();
    bus.subscribe("run-1", first);
    bus.subscribe("run-2", second);

    await bus.publish(event("run-1"));

    expect(first).toHaveBeenCalledOnce();
    expect(second).not.toHaveBeenCalled();
  });

  it("delivers to multiple subscribers", async () => {
    const bus = new InMemoryWorkflowEventBus();
    const first = vi.fn();
    const second = vi.fn();
    bus.subscribe("run-1", first);
    bus.subscribe("run-1", second);

    await bus.publish(event("run-1"));

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it("does not let one subscriber error block another subscriber", async () => {
    const bus = new InMemoryWorkflowEventBus();
    const failed = vi.fn(() => {
      throw new Error("listener failed");
    });
    const healthy = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    bus.subscribe("run-1", failed);
    bus.subscribe("run-1", healthy);

    await expect(bus.publish(event("run-1"))).resolves.toBeUndefined();

    expect(healthy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
