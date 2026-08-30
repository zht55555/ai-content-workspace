"use client";

import React from "react";
import { useState } from "react";

import type { TaskType } from "@/src/modules/task/task.types";
import { createTask } from "@/src/lib/api/tasks";
import { runFullContentAnalysis } from "@/src/lib/api/workflow-runs";
import { validateNewTask } from "./workspace-utils";

const inputOptions: Array<{ type: TaskType; label: string; inputType: "TRANSCRIPT" | "COPY" | "TOPIC" }> = [
  { type: "TRANSCRIPT_ANALYSIS", label: "视频逐字稿", inputType: "TRANSCRIPT" },
  { type: "COPY_ANALYSIS", label: "文案", inputType: "COPY" },
  { type: "TOPIC_ANALYSIS", label: "选题", inputType: "TOPIC" },
];

export function NewTaskForm({ onCreated }: { onCreated: (taskId: string) => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<TaskType>("TRANSCRIPT_ANALYSIS");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const selected = inputOptions.find((item) => item.type === type)!;

  async function submit() {
    const errors = validateNewTask({ title, content });
    if (errors.title || errors.content) { setError(errors.title ?? errors.content ?? null); return; }
    setSubmitting(true); setError(null);
    try {
      const task = await createTask({ title: title.trim(), type, input: { inputType: selected.inputType, content: content.trim() } });
      await runFullContentAnalysis(task.id);
      onCreated(task.id);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "任务创建失败，请重试。");
    } finally { setSubmitting(false); }
  }

  return <section className="mx-auto max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
    <div className="border-b pb-5"><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">New Task</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">开始一次内容分析</h1><p className="mt-2 text-sm text-slate-500">粘贴短视频内容，AI 将依次完成分析、优化、脚本和营销内容生成。</p></div>
    <div className="space-y-5 pt-5">
      <div><label className="text-sm font-medium text-slate-800" htmlFor="task-title">任务标题</label><input className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" id="task-title" onChange={(event) => setTitle(event.target.value)} placeholder="例如：分析这条短视频逐字稿" value={title} /></div>
      <fieldset><legend className="text-sm font-medium text-slate-800">内容类型</legend><div className="mt-2 grid grid-cols-3 gap-2">{inputOptions.map((item) => <label className={`cursor-pointer rounded-lg border px-3 py-3 text-center text-sm ${type === item.type ? "border-blue-500 bg-blue-50 text-blue-700" : "hover:border-slate-300"}`} key={item.type}><input checked={type === item.type} className="sr-only" name="input-type" onChange={() => setType(item.type)} type="radio" />{item.label}</label>)}</div></fieldset>
      <div><div className="flex items-center justify-between"><label className="text-sm font-medium text-slate-800" htmlFor="task-content">内容</label><span className="text-xs text-slate-400">{content.length.toLocaleString()} 字</span></div><textarea className="mt-2 min-h-56 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" id="task-content" onChange={(event) => setContent(event.target.value)} placeholder="粘贴视频逐字稿、文案或输入选题…" value={content} /></div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      <button className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={submitting} onClick={submit} type="button">{submitting ? "正在创建并启动…" : "开始 AI 分析"}</button>
    </div>
  </section>;
}
