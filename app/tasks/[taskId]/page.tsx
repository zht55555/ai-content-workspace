import { WorkspaceShell } from "@/src/components/workspace/workspace-shell";

type TaskPageProps = { params: Promise<{ taskId: string }> };

export default async function TaskPage({ params }: TaskPageProps) {
  const { taskId } = await params;
  return <WorkspaceShell taskId={taskId} />;
}
