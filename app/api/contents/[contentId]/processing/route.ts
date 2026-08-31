import { NextResponse } from "next/server";

import { ContentError } from "@/src/modules/content/content.errors";
import { ContentProcessingService } from "@/src/modules/content/content-processing.service";
import { WorkflowError } from "@/src/workflow/workflow-errors";

type Context = { params: Promise<{ contentId: string }> };

function errorResponse(error: unknown) {
  if (error instanceof ContentError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "CONTENT_NOT_FOUND" ? 404 : 409 });
  if (error instanceof WorkflowError) return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
  console.error(error);
  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}

export async function GET(_request: Request, context: Context) {
  try {
    return NextResponse.json(await new ContentProcessingService().latest((await context.params).contentId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(_request: Request, context: Context) {
  try {
    return NextResponse.json(await new ContentProcessingService().start((await context.params).contentId), { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
