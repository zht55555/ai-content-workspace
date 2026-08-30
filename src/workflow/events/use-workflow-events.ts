"use client";

import { useEffect, useState } from "react";
import type { WorkflowEvent } from "./workflow-event.types";
import { reduceWorkflowRunEvent, type WorkflowRunSnapshot } from "./workflow-run.reducer";
import { subscribeToWorkflowEvents, type WorkflowEventSubscriptionHandlers } from "./workflow-events.client";
import { getWorkflowSnapshot } from "@/src/lib/api/workflow-runs";

export type WorkflowConnectionState = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR";

const MAX_RECONNECT_ATTEMPTS = 4;

export function getWorkflowReconnectDelay(attempt: number) {
  return Math.min(500 * 2 ** Math.max(0, attempt), 4000);
}

export function useWorkflowEvents(runId: string, initialSnapshot: WorkflowRunSnapshot | null) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [connectionState, setConnectionState] = useState<WorkflowConnectionState>("CONNECTING");

  useEffect(() => {
    setSnapshot(initialSnapshot);
    if (!initialSnapshot || ["COMPLETED", "FAILED", "CANCELLED"].includes(initialSnapshot.status)) {
      setConnectionState("DISCONNECTED");
      return undefined;
    }

    let cancelled = false;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;

    const connect = async (resync: boolean) => {
      if (cancelled) return;
      setConnectionState(resync ? "CONNECTING" : "CONNECTING");
      if (resync) {
        try {
          const latest = await getWorkflowSnapshot(runId);
          if (cancelled) return;
          setSnapshot(latest);
          if (["COMPLETED", "FAILED", "CANCELLED"].includes(latest.status)) {
            setConnectionState("DISCONNECTED");
            return;
          }
        } catch {
          if (cancelled) return;
        }
      }

      const handlers: WorkflowEventSubscriptionHandlers = {
        onOpen: () => setConnectionState("CONNECTED"),
        onError: () => {
          unsubscribe?.();
          unsubscribe = undefined;
          setConnectionState("ERROR");
          if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS || cancelled) return;
          const attempt = reconnectAttempt;
          reconnectAttempt += 1;
          reconnectTimer = setTimeout(() => { void connect(true); }, getWorkflowReconnectDelay(attempt));
        },
        onEvent: (event: WorkflowEvent) => {
          setSnapshot((current) => (current ? reduceWorkflowRunEvent(current, event) : current));
          if (["workflow.completed", "workflow.failed", "workflow.cancelled"].includes(event.eventType)) {
            unsubscribe?.();
            unsubscribe = undefined;
            setConnectionState("DISCONNECTED");
          }
        },
      };
      unsubscribe = subscribeToWorkflowEvents(runId, handlers);
    };

    void connect(false);
    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      unsubscribe?.();
      setConnectionState("DISCONNECTED");
    };
  }, [initialSnapshot, runId]);

  return { snapshot, connectionState };
}
