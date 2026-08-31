"use client";

import React from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkflowEvents } from "@/src/workflow/events/use-workflow-events";
import { WorkflowTimeline } from "@/src/components/workspace/workflow-timeline";
import type { ContentDetail as ContentDetailType, ContentProcessingState } from "@/src/lib/api/contents";
import { archiveContent, getContent, getContentProcessing, startContentProcessing, updateContent } from "@/src/lib/api/contents";
import { getApiErrorMessage } from "@/src/lib/api/client";
import { ContentStatusBadge } from "./content-status-badge";

const platforms: Record<ContentDetailType["platform"], string> = { DOUYIN: "抖音", XIAOHONGSHU: "小红书", BILIBILI: "B 站", WECHAT: "微信", OTHER: "其他" };
const formatDate = (value: string) => new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const canProcess = new Set(["DRAFT", "WAITING_REVIEW", "NEEDS_REVISION"]);

type Props = { content?: ContentDetailType; contentId?: string; loading: boolean; error: string | null; onRetry: () => void; onUpdated: (content: ContentDetailType) => void };

export function ContentDetail({ content: initialContent, contentId, loading, error, onRetry, onUpdated }: Props) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [processing, setProcessing] = useState<ContentProcessingState | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const handledTerminalRun = useRef<string | null>(null);
  const [form, setForm] = useState({ title: initialContent?.title ?? "", rawContent: initialContent?.rawContent ?? "", platform: initialContent?.platform ?? "OTHER", source: initialContent?.source ?? "", sourceUrl: initialContent?.sourceUrl ?? "", tags: initialContent?.tags.join(", ") ?? "" });
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!contentId) return;
    void getContentProcessing(contentId).then(setProcessing).catch(() => setProcessing(null));
  }, [contentId]);

  useEffect(() => {
    if (!initialContent) return;
    setContent(initialContent);
    setForm({ title: initialContent.title, rawContent: initialContent.rawContent, platform: initialContent.platform, source: initialContent.source ?? "", sourceUrl: initialContent.sourceUrl ?? "", tags: initialContent.tags.join(", ") });
  }, [initialContent]);

  const snapshot = processing?.run ?? null;
  const live = useWorkflowEvents(snapshot?.id ?? "", snapshot);

  useEffect(() => {
    if (!contentId || content?.status !== "AI_PROCESSING" || !live.snapshot || !["COMPLETED", "FAILED", "CANCELLED"].includes(live.snapshot.status) || handledTerminalRun.current === live.snapshot.id) return;
    handledTerminalRun.current = live.snapshot.id;
    void getContent(contentId).then((next) => { setContent(next); onUpdated(next); }).catch(() => undefined);
  }, [content, contentId, live.snapshot, onUpdated]);

  if (loading) return <main className="min-h-screen bg-[#f7f8fa] p-8"><div className="mx-auto h-64 max-w-4xl animate-pulse rounded-2xl bg-white" /></main>;
  if (error || !content) return <main className="min-h-screen bg-[#f7f8fa] p-8"><div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error ?? "内容不存在。"}<button className="ml-3 underline" onClick={onRetry} type="button">重新加载</button></div></main>;

  const contentValue = content;
  async function save() { setSaving(true); setActionError(null); try { const next = await updateContent(contentValue.id, { title: form.title, rawContent: form.rawContent, platform: form.platform, source: form.source || undefined, sourceUrl: form.sourceUrl || undefined, tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean) }); setContent(next); onUpdated(next); setEditing(false); } catch (reason) { setActionError(getApiErrorMessage(reason, "保存失败，请重试。")); } finally { setSaving(false); } }
  async function archive() { if (!window.confirm("确定归档这条内容吗？")) return; try { const next = await archiveContent(contentValue.id); setContent(next); onUpdated(next); } catch (reason) { setActionError(getApiErrorMessage(reason, "归档失败，请重试。")); } }
  async function startProcessing() { setStarting(true); setActionError(null); try { const next = await startContentProcessing(contentValue.id); setProcessing(next); const refreshed = await getContent(contentValue.id); setContent(refreshed); onUpdated(refreshed); } catch (reason) { setActionError(getApiErrorMessage(reason, "AI Processing 启动失败，请重试。")); } finally { setStarting(false); } }

  const isProcessing = content.status === "AI_PROCESSING" || live.snapshot?.status === "RUNNING" || live.snapshot?.status === "QUEUED";
  return <main className="min-h-screen bg-[#f7f8fa] text-slate-900"><div className="mx-auto max-w-5xl px-5 py-8 lg:px-8"><button className="mb-6 text-sm text-slate-500 hover:text-slate-900" onClick={() => router.push("/contents")} type="button">← 返回内容库</button><header className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-7 md:flex-row md:items-start"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{platforms[content.platform]}</span><ContentStatusBadge status={content.status} /></div><h1 className="mt-3 text-3xl font-semibold tracking-tight">{content.title}</h1><p className="mt-2 text-sm text-slate-500">最近更新于 {formatDate(content.updatedAt)}</p><div className="mt-3 flex flex-wrap gap-2">{content.tags.map((tag) => <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700" key={tag}>#{tag}</span>)}</div></div><div className="flex gap-2"><button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:border-slate-400" onClick={() => setEditing(!editing)} type="button">{editing ? "取消编辑" : "编辑基础信息"}</button>{content.status !== "ARCHIVED" && <button className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50" onClick={() => void archive()} type="button">归档</button>}</div></header>{editing ? <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6"><div className="space-y-4"><label className="block text-sm font-medium">标题<input className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm" onChange={(e) => setForm({ ...form, title: e.target.value })} value={form.title} /></label><label className="block text-sm font-medium">原始内容<textarea className="mt-2 min-h-48 w-full rounded-xl border px-3 py-3 text-sm leading-6" onChange={(e) => setForm({ ...form, rawContent: e.target.value })} value={form.rawContent} /></label><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={saving} onClick={() => void save()} type="button">{saving ? "保存中…" : "保存更改"}</button></div></section> : <><section className="mt-7 grid gap-5 lg:grid-cols-[1.4fr_0.8fr]"><div className="rounded-2xl border border-slate-200 bg-white p-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Original Content</p><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{content.rawContent}</p><div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500"><p>来源：{content.source ?? "未填写"}</p>{content.sourceUrl && <a className="mt-1 block truncate text-blue-600 hover:underline" href={content.sourceUrl} rel="noreferrer" target="_blank">{content.sourceUrl}</a>}</div></div><div className="space-y-5"><div className="rounded-2xl border border-slate-200 bg-white p-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Current Version</p><p className="mt-3 text-2xl font-semibold">V{content.currentVersion?.versionNumber ?? "—"}</p><p className="mt-1 text-sm text-slate-500">{content.currentVersion?.source ?? "暂无版本"}</p></div><div className="rounded-2xl border border-slate-300 bg-white p-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Processing Area</p><p className="mt-3 font-medium text-slate-800">{isProcessing ? "AI Analysis 进行中" : content.status === "WAITING_REVIEW" ? "AI Analysis 已完成，等待审核" : content.lastError ? "AI Processing 失败" : "AI Analysis 尚未开始"}</p><p className="mt-2 text-sm leading-6 text-slate-500">{content.lastError ?? (isProcessing ? "正在运行现有 FULL_CONTENT_ANALYSIS Workflow。" : content.status === "WAITING_REVIEW" ? "已生成 AI Version，等待后续审核阶段。" : "将使用现有 Workflow Engine 执行内容分析。")}</p><button className="mt-4 w-full rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500" disabled={starting || isProcessing || !canProcess.has(content.status)} onClick={() => void startProcessing()} type="button">{starting ? "正在启动…" : isProcessing ? "AI Processing 进行中" : "Start AI Processing"}</button></div></div></section>{(live.snapshot || processing?.run) && <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Execution Detail</p><p className="mt-1 text-sm text-slate-600">Workflow technical timeline</p></div><WorkflowTimeline connectionState={live.connectionState} snapshot={live.snapshot} /></section>}{actionError && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>}</>}</div></main>;
}
