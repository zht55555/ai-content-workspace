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

export async function POST(request: Request) {
  try {
    const task = await service.createTask(await request.json());
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const result = await service.listTasks(Object.fromEntries(url.searchParams.entries()));
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
