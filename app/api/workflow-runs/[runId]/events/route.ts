import { NextResponse } from "next/server";

import { TaskRepository } from "@/src/modules/task/task.repository";
import { encodeSseComment, encodeSseEvent } from "@/src/workflow/events/sse";
import { workflowRuntime } from "@/src/workflow/workflow-runtime";
import { WorkflowError } from "@/src/workflow/workflow-errors";
import type { WorkflowEvent } from "@/src/workflow/events/workflow-event.types";

const terminalStatuses = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

type RunRouteContext = { params: Promise<{ runId: string }> };

function errorResponse(error: unknown) {
  if (error instanceof WorkflowError) return NextResponse.json({ error: error.message, code: error.code }, { status: 404 });
  console.error(error);
  return NextResponse.json({ error: "SSE connection failed.", code: "SSE_CONNECTION_ERROR" }, { status: 500 });
}

export async function GET(request: Request, context: RunRouteContext) {
  try {
    const { runId } = await context.params;
    const demoUser = await new TaskRepository().findDemoUser();
    if (!demoUser) return NextResponse.json({ error: "Demo User is not seeded." }, { status: 500 });
    const snapshot = await workflowRuntime.engine.getRun(runId, demoUser.id);
    if (terminalStatuses.has(snapshot.status)) {
      return new Response(null, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
    }

    const encoder = new TextEncoder();
    let unsubscribe: () => void = () => undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let closed = false;
    const cleanup = () => {
      if (closed) return;
      closed = true;
      unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    };
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: WorkflowEvent) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(encodeSseEvent(event)));
            if (event.eventType === "workflow.completed" || event.eventType === "workflow.failed" || event.eventType === "workflow.cancelled") {
              cleanup();
              controller.close();
            }
          } catch (error) {
            cleanup();
            console.error("SSE stream failed.", error);
          }
        };
        unsubscribe = workflowRuntime.eventBus.subscribe(runId, send);
        heartbeat = setInterval(() => {
          if (!closed) controller.enqueue(encoder.encode(encodeSseComment("ping")));
        }, 20_000);
        request.signal.addEventListener("abort", () => {
          cleanup();
          try {
            controller.close();
          } catch {
            // The stream may already be closed by a terminal event.
          }
        }, { once: true });
      },
      cancel: cleanup,
    });

    return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
  } catch (error) {
    return errorResponse(error);
  }
}
