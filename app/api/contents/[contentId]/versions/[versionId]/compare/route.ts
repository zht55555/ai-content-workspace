import { NextResponse } from "next/server";
import { ContentError } from "@/src/modules/content/content.errors";
import { ContentVersionService } from "@/src/modules/content/content-version.service";

type Context = { params: Promise<{ contentId: string; versionId: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { contentId, versionId } = await context.params;
    const withVersionId = new URL(request.url).searchParams.get("withVersionId");
    if (!withVersionId) return NextResponse.json({ error: "withVersionId is required." }, { status: 400 });
    return NextResponse.json(await new ContentVersionService().compareVersions(contentId, versionId, withVersionId));
  } catch (error) { if (error instanceof ContentError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "CONTENT_NOT_FOUND" ? 404 : 409 }); return NextResponse.json({ error: "Internal server error." }, { status: 500 }); }
}
