import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { TaskError } from "@/src/modules/task/task.errors";
import { TaskService } from "@/src/modules/task/task.service";

const service = new TaskService();

function errorResponse(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: "Invalid request.", details: error.flatten() }, { status: 400 });
  if (error instanceof TaskError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "TASK_NOT_FOUND" ? 404 : 409 });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}

type TaskRouteContext = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, context: TaskRouteContext) {
  try {
    const { taskId } = await context.params;
    return NextResponse.json(await service.getTask(taskId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: TaskRouteContext) {
  try {
    const { taskId } = await context.params;
    const body = await request.json();
    const task = Object.prototype.hasOwnProperty.call(body, "status")
      ? await service.updateTaskStatus(taskId, body)
      : await service.updateTask(taskId, body);
    return NextResponse.json(task);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: TaskRouteContext) {
  try {
    const { taskId } = await context.params;
    await service.deleteTask(taskId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
