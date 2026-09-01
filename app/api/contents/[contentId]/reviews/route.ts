import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ContentError } from "@/src/modules/content/content.errors";
import { ReviewService } from "@/src/modules/review/review.service";
import { ContentRepository } from "@/src/modules/content/content.repository";

type Context = { params: Promise<{ contentId: string }> };
const reviews = new ReviewService();
function errorResponse(error: unknown) { if (error instanceof ZodError) return NextResponse.json({ error: "Invalid request.", details: error.flatten() }, { status: 400 }); if (error instanceof ContentError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "CONTENT_NOT_FOUND" ? 404 : 409 }); console.error(error); return NextResponse.json({ error: "Internal server error." }, { status: 500 }); }

export async function GET(_request: Request, context: Context) { try { return NextResponse.json(await reviews.listReviews((await context.params).contentId)); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request, context: Context) {
  try { const { contentId } = await context.params; const user = await new ContentRepository().findDemoUser(); if (!user) throw new ContentError("CONTENT_NOT_FOUND", "Demo User was not found."); const body = await request.json() as Record<string, unknown>; return NextResponse.json(await reviews.createReview({ ...body, contentItemId: contentId, reviewerId: user.id }), { status: 201 }); } catch (error) { return errorResponse(error); }
}
