import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ContentError } from "@/src/modules/content/content.errors";
import { ContentService } from "@/src/modules/content/content.service";

const service = new ContentService();

function errorResponse(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: "Invalid request.", details: error.flatten() }, { status: 400 });
  if (error instanceof ContentError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "CONTENT_NOT_FOUND" ? 404 : 409 });
  console.error(error);
  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return NextResponse.json(await service.listContents(Object.fromEntries(url.searchParams.entries())));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const content = await service.createContent(await request.json());
    return NextResponse.json(content, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
