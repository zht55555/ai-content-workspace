"use client";

import { useEffect, useState } from "react";
import type { WorkflowEvent } from "./workflow-event.types";
import { reduceWorkflowRunEvent, type WorkflowRunSnapshot } from "./workflow-run.reducer";
import { subscribeToWorkflowEvents, type WorkflowEventSubscriptionHandlers } from "./workflow-events.client";

export type WorkflowConnectionState = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR";

export function useWorkflowEvents(runId: string, initialSnapshot: WorkflowRunSnapshot | null) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [connectionState, setConnectionState] = useState<WorkflowConnectionState>("CONNECTING");

  useEffect(() => {
    setSnapshot(initialSnapshot);
    if (!initialSnapshot || ["COMPLETED", "FAILED", "CANCELLED"].includes(initialSnapshot.status)) {
      setConnectionState("DISCONNECTED");
      return undefined;
    }

    const handlers: WorkflowEventSubscriptionHandlers = {
      onOpen: () => setConnectionState("CONNECTED"),
      onError: () => setConnectionState("ERROR"),
      onEvent: (event: WorkflowEvent) => {
        setSnapshot((current) => (current ? reduceWorkflowRunEvent(current, event) : current));
        if (["workflow.completed", "workflow.failed", "workflow.cancelled"].includes(event.eventType)) setConnectionState("DISCONNECTED");
      },
    };
    const unsubscribe = subscribeToWorkflowEvents(runId, handlers);
    return () => {
      unsubscribe();
      setConnectionState("DISCONNECTED");
    };
  }, [initialSnapshot, runId]);

  return { snapshot, connectionState };
}
