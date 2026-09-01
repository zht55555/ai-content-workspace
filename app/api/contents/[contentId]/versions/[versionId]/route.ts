import { NextResponse } from "next/server";
import { ContentError } from "@/src/modules/content/content.errors";
import { ContentVersionService } from "@/src/modules/content/content-version.service";

type Context = { params: Promise<{ contentId: string; versionId: string }> };
const versions = new ContentVersionService();

export async function GET(_request: Request, context: Context) {
  try { const { contentId, versionId } = await context.params; return NextResponse.json(await versions.getVersion(contentId, versionId)); }
  catch (error) { if (error instanceof ContentError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "CONTENT_NOT_FOUND" ? 404 : 409 }); return NextResponse.json({ error: "Internal server error." }, { status: 500 }); }
}
