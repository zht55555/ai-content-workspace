import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { TaskError } from "@/src/modules/task/task.errors";
import { structuredContentWorkflow } from "@/src/workflow/definitions/structured-content-workflow";
import { demoContentWorkflow } from "@/src/workflow/definitions/demo-content-workflow";
import { WorkflowError } from "@/src/workflow/workflow-errors";
import { workflowRuntime } from "@/src/workflow/workflow-runtime";

const runRequestSchema = z.object({
  workflowType: z.enum(["DEMO_CONTENT_WORKFLOW", "STRUCTURED_CONTENT_DEMO"]).default("DEMO_CONTENT_WORKFLOW"),
  async: z.boolean().default(false),
});

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

export async function POST(request: Request, context: RunRouteContext) {
  try {
    const { taskId } = await context.params;
    const body = request.headers.get("content-type")?.includes("application/json") ? await request.json() : {};
    const options = runRequestSchema.parse(body);
    const definition = options.workflowType === "STRUCTURED_CONTENT_DEMO" ? structuredContentWorkflow : demoContentWorkflow;
    const result = options.async ? await workflowRuntime.engine.startWorkflow(taskId, definition) : await workflowRuntime.engine.runWorkflow(taskId, definition);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
