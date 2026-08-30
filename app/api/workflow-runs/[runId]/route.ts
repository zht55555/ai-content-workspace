import { NextResponse } from "next/server";

import { TaskRepository } from "@/src/modules/task/task.repository";
import { WorkflowError } from "@/src/workflow/workflow-errors";
import { workflowRuntime } from "@/src/workflow/workflow-runtime";

type RunRouteContext = { params: Promise<{ runId: string }> };

export async function GET(_request: Request, context: RunRouteContext) {
  try {
    const { runId } = await context.params;
    const demoUser = await new TaskRepository().findDemoUser();
    if (!demoUser) return NextResponse.json({ error: "Demo User is not seeded." }, { status: 500 });
    return NextResponse.json(await workflowRuntime.engine.getRun(runId, demoUser.id));
  } catch (error) {
    if (error instanceof WorkflowError) return NextResponse.json({ error: error.message, code: error.code }, { status: 404 });
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
