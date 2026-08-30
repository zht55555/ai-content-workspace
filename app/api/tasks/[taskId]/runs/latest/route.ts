import { NextResponse } from "next/server";

import { TaskRepository } from "@/src/modules/task/task.repository";
import { WorkflowError } from "@/src/workflow/workflow-errors";
import { workflowRuntime } from "@/src/workflow/workflow-runtime";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { taskId } = await context.params;
    const demoUser = await new TaskRepository().findDemoUser();
    if (!demoUser) return NextResponse.json({ error: "Demo User is not seeded." }, { status: 500 });
    const run = await workflowRuntime.engine.getLatestRunForTask(taskId, demoUser.id);
    return NextResponse.json(run);
  } catch (error) {
    if (error instanceof WorkflowError) return NextResponse.json({ error: error.message, code: error.code }, { status: 404 });
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
