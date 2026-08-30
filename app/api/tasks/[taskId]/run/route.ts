import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { TaskError } from "@/src/modules/task/task.errors";
import { WorkflowEngine } from "@/src/workflow/workflow-engine";
import { WorkflowError } from "@/src/workflow/workflow-errors";

const engine = new WorkflowEngine();

function errorResponse(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: "Invalid request.", details: error.flatten() }, { status: 400 });
  if (error instanceof TaskError) return NextResponse.json({ error: error.message, code: error.code }, { status: 404 });
  if (error instanceof WorkflowError) {
    const status = error.code === "WORKFLOW_NOT_FOUND" ? 404 : ["TASK_ALREADY_RUNNING", "WORKFLOW_INVALID_STATE"].includes(error.code) ? 409 : 500;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}

type RunRouteContext = { params: Promise<{ taskId: string }> };

export async function POST(_request: Request, context: RunRouteContext) {
  try {
    const { taskId } = await context.params;
    return NextResponse.json(await engine.runWorkflow(taskId));
  } catch (error) {
    return errorResponse(error);
  }
}
