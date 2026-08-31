import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ContentError } from "@/src/modules/content/content.errors";
import { ContentService } from "@/src/modules/content/content.service";

const service = new ContentService();
type Context = { params: Promise<{ contentId: string }> };

function errorResponse(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: "Invalid request.", details: error.flatten() }, { status: 400 });
  if (error instanceof ContentError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "CONTENT_NOT_FOUND" ? 404 : 409 });
  console.error(error);
  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}

export async function GET(_request: Request, context: Context) {
  try {
    return NextResponse.json(await service.getContent((await context.params).contentId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    return NextResponse.json(await service.updateContent((await context.params).contentId, await request.json()));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    return NextResponse.json(await service.archiveContent((await context.params).contentId));
  } catch (error) {
    return errorResponse(error);
  }
}
