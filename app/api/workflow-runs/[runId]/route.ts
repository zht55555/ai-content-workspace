import { NextResponse } from "next/server";

import { WorkflowEngine } from "@/src/workflow/workflow-engine";
import { WorkflowError } from "@/src/workflow/workflow-errors";

const engine = new WorkflowEngine();

type RunRouteContext = { params: Promise<{ runId: string }> };

export async function GET(_request: Request, context: RunRouteContext) {
  try {
    const { runId } = await context.params;
    return NextResponse.json(await engine.getRun(runId));
  } catch (error) {
    if (error instanceof WorkflowError) return NextResponse.json({ error: error.message, code: error.code }, { status: 404 });
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
