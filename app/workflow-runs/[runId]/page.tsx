import { WorkflowRunLiveView } from "./workflow-run-live-view";

type WorkflowRunPageProps = { params: Promise<{ runId: string }> };

export default async function WorkflowRunPage({ params }: WorkflowRunPageProps) {
  const { runId } = await params;
  return <WorkflowRunLiveView runId={runId} />;
}
