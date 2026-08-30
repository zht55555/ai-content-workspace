"use client";

import React from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { TaskView } from "@/src/modules/task/task.types";
import type { WorkflowRunSnapshot } from "@/src/workflow/events/workflow-run.reducer";
import { getTask, listTasks, type TaskListItem, deleteTask } from "@/src/lib/api/tasks";
import { getLatestWorkflowRun, runFullContentAnalysis } from "@/src/lib/api/workflow-runs";
import { useWorkflowEvents } from "@/src/workflow/events/use-workflow-events";
import { AnalysisResultPanel } from "./analysis-result-panel";
import { NewTaskForm } from "./new-task-form";
import { TaskDetailHeader } from "./task-detail-header";
import { TaskSidebar } from "./task-sidebar";
import { WorkflowTimeline } from "./workflow-timeline";

export function WorkspaceShell({ taskId }: { taskId?: string }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [task, setTask] = useState<TaskView | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskLoading, setTaskLoading] = useState(Boolean(taskId));
  const [initialSnapshot, setInitialSnapshot] = useState<WorkflowRunSnapshot | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const previousStatus = useRef<string | undefined>(undefined);
  const runId = initialSnapshot?.id ?? "";
  const { snapshot, connectionState } = useWorkflowEvents(runId, initialSnapshot);

  async function refreshTasks() { setTasksLoading(true); try { setTasksError(null); setTasks((await listTasks()).items); } catch (reason: unknown) { setTasksError(reason instanceof Error ? reason.message : "任务列表加载失败。"); } finally { setTasksLoading(false); } }
  useEffect(() => { void refreshTasks(); }, []);
  useEffect(() => {
    if (!taskId) { setTask(null); setInitialSnapshot(null); setTaskLoading(false); return; }
    setTaskLoading(true); setTaskError(null); setInitialSnapshot(null);
    Promise.all([getTask(taskId), getLatestWorkflowRun(taskId)]).then(([nextTask, nextRun]) => { setTask(nextTask); setInitialSnapshot(nextRun); }).catch((reason: unknown) => setTaskError(reason instanceof Error ? reason.message : "任务加载失败。")).finally(() => setTaskLoading(false));
  }, [taskId]);
  useEffect(() => { if (!snapshot || snapshot.status === previousStatus.current) return; previousStatus.current = snapshot.status; if (["COMPLETED", "FAILED", "CANCELLED"].includes(snapshot.status)) void refreshTasks(); }, [snapshot]);
  useEffect(() => { if (!snapshot) return; const status = snapshot.status === "COMPLETED" || snapshot.status === "FAILED" || snapshot.status === "CANCELLED" ? snapshot.status : null; if (status) setTask((current) => current ? { ...current, status } : current); }, [snapshot]);

  async function startRun() { if (!task) return; setRunLoading(true); setRunError(null); try { setInitialSnapshot(await runFullContentAnalysis(task.id)); } catch (reason: unknown) { setRunError(reason instanceof Error ? reason.message : "Workflow 启动失败。"); } finally { setRunLoading(false); } }
  async function removeTask(selected: TaskListItem) { if (!window.confirm(`确定删除任务“${selected.title}”吗？`)) return; try { await deleteTask(selected.id); setTasks((current) => current.filter((item) => item.id !== selected.id)); if (selected.id === taskId) router.push("/"); } catch (reason: unknown) { setTasksError(reason instanceof Error ? reason.message : "删除失败，请重试。"); } }
  function selectTask(selectedId: string) { router.push(`/tasks/${encodeURIComponent(selectedId)}`); }

  return <main className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900"><header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-5"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">A</div><div><p className="text-sm font-semibold">AI Content Workspace</p><p className="text-[11px] text-slate-400">内容生产与运营工作台</p></div></div><div className="flex items-center gap-3 text-xs text-slate-500"><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">Demo Provider</span><span>Demo User</span></div></header><div className="flex min-h-0 flex-1 flex-col lg:flex-row"><TaskSidebar tasks={tasks} selectedTaskId={taskId} loading={tasksLoading} error={tasksError} onSelect={selectTask} onCreate={() => router.push("/")} onDelete={(selected) => void removeTask(selected)} /><section className="min-h-0 flex-1 overflow-y-auto border-b lg:border-b-0 lg:border-r"><div className="mx-auto max-w-3xl">{!taskId ? <div className="p-5"><div className="mb-5 rounded-xl border bg-white p-5"><p className="text-sm font-semibold text-blue-700">欢迎使用 AI Content Workspace</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">把内容变成可执行的创作方案</h2><p className="mt-2 text-sm leading-6 text-slate-500">粘贴短视频内容，让 AI 自动完成内容分析、钩子识别、结构分析、优化建议、脚本生成和发布内容生成。</p></div><NewTaskForm onCreated={(createdId) => router.push(`/tasks/${encodeURIComponent(createdId)}`)} /></div> : taskLoading ? <div className="p-5"><div className="h-36 animate-pulse rounded-xl bg-white" /></div> : taskError || !task ? <div className="p-5 text-sm text-red-700">{taskError ?? "任务不存在。"}</div> : <><TaskDetailHeader disabled={runLoading || snapshot?.status === "RUNNING"} onRun={() => void startRun()} task={task} />{runError && <p className="mx-5 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{runError}</p>}<WorkflowTimeline connectionState={connectionState} snapshot={snapshot} /></>}</div></section><section className="min-h-0 flex-1 overflow-y-auto bg-white">{taskId ? <AnalysisResultPanel enabled={snapshot?.resultAvailable === true} taskId={taskId} /> : <div className="flex h-full items-center justify-center p-8 text-center"><div><p className="text-sm font-medium text-slate-700">Analysis Result</p><p className="mt-2 text-sm text-slate-400">选择一个任务，查看结构化分析结果。</p></div></div>}</section></div></main>;
}
