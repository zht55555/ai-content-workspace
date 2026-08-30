"use client";

import React from "react";
import type { TaskListItem } from "@/src/lib/api/tasks";
import { formatDate, getTaskTypeLabel } from "./workspace-utils";
import { TaskStatusBadge } from "./task-status-badge";

type Props = {
  tasks: TaskListItem[];
  selectedTaskId?: string;
  loading: boolean;
  error: string | null;
  onSelect: (taskId: string) => void;
  onCreate: () => void;
  onDelete: (task: TaskListItem) => void;
};

export function TaskSidebar({ tasks, selectedTaskId, loading, error, onSelect, onCreate, onDelete }: Props) {
  return <aside className="flex min-h-0 w-full flex-col border-b bg-white lg:w-[260px] lg:border-b-0 lg:border-r">
    <div className="border-b p-4">
      <button className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700" onClick={onCreate} type="button">+ 新建任务</button>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <div className="mb-3 flex items-center justify-between px-1"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Task History</p><span className="text-xs text-slate-400">{tasks.length}</span></div>
      {loading && <div className="space-y-2" aria-label="任务列表加载中">{[1, 2, 3].map((item) => <div className="h-16 animate-pulse rounded-lg bg-slate-100" key={item} />)}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}<button className="mt-2 block underline" onClick={onCreate} type="button">创建新任务</button></div>}
      {!loading && !error && tasks.length === 0 && <p className="px-1 text-sm leading-6 text-slate-500">还没有任务。创建第一个任务开始分析。</p>}
      <div className="space-y-1">
        {tasks.map((task) => <div className={`group rounded-lg border p-3 transition ${selectedTaskId === task.id ? "border-blue-300 bg-blue-50/60" : "border-transparent hover:border-slate-200 hover:bg-slate-50"}`} key={task.id}>
          <button className="w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-400" onClick={() => onSelect(task.id)} type="button">
            <div className="truncate text-sm font-medium text-slate-900">{task.title}</div>
            <div className="mt-2 flex items-center justify-between gap-2"><span className="truncate text-xs text-slate-500">{getTaskTypeLabel(task.type)}</span><TaskStatusBadge status={task.status} /></div>
            <div className="mt-2 text-[11px] text-slate-400">{formatDate(task.createdAt)}</div>
          </button>
          <button aria-label={`删除任务 ${task.title}`} className="mt-2 text-[11px] text-slate-400 opacity-0 transition hover:text-red-600 group-hover:opacity-100 focus:opacity-100" onClick={() => onDelete(task)} type="button">删除</button>
        </div>)}
      </div>
    </div>
  </aside>;
}
