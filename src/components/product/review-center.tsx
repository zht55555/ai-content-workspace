"use client";

import React from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getApiErrorMessage } from "@/src/lib/api/client";
import { listReviewCenter, type ReviewCenterItem } from "@/src/lib/api/product";
import { ProductNav } from "./product-nav";
import { ContentStatusBadge } from "@/src/components/content/content-status-badge";

export function ReviewCenter() {
  const router = useRouter(); const params = useSearchParams(); const status = params.get("status") ?? ""; const [items, setItems] = useState<ReviewCenterItem[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { setItems(await listReviewCenter(status)); } catch (reason) { setError(getApiErrorMessage(reason, "Review Center 加载失败。")); } finally { setLoading(false); } }, [status]);
  useEffect(() => { void load(); }, [load]);
  function update(value: string) { const next = new URLSearchParams(params.toString()); if (value) next.set("status", value); else next.delete("status"); router.replace(`/reviews${next.toString() ? `?${next}` : ""}` as never); }
  return <main className="min-h-screen bg-[#f7f8fa] text-slate-900"><ProductNav /><div className="mx-auto max-w-6xl px-5 py-8 lg:px-8"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">Human-in-the-loop</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Review Center</h1><p className="mt-2 text-sm text-slate-500">集中找到需要审核和跟进的内容，具体操作仍在 Content Detail 完成。</p></div><div className="mt-7 flex flex-wrap gap-2">{[["", "全部"], ["WAITING_REVIEW", "待审核"], ["NEEDS_REVISION", "需修改"], ["APPROVED", "已批准"], ["REJECTED", "已拒绝"]].map(([value, label]) => <button className={`rounded-xl px-3 py-2 text-sm ${status === value ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"}`} key={value} onClick={() => update(value)} type="button">{label}</button>)}</div>{loading ? <div className="mt-6 h-48 animate-pulse rounded-2xl bg-white" /> : error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}<button className="ml-3 underline" onClick={() => void load()} type="button">重试</button></div> : <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">{items.length ? <div className="divide-y divide-slate-100">{items.map(({ content, currentVersion }) => <button className="grid w-full gap-3 px-5 py-4 text-left hover:bg-slate-50 md:grid-cols-[1fr_150px_150px_180px] md:items-center" key={content.id} onClick={() => router.push(`/contents/${content.id}`)} type="button"><div><p className="font-medium">{content.title}</p><p className="mt-1 truncate text-xs text-slate-400">{content.source ?? "未填写来源"}</p></div><ContentStatusBadge status={content.status} /><span className="text-sm text-slate-600">V{currentVersion?.versionNumber ?? "—"} · {currentVersion?.source ?? "—"}</span><span className="text-xs text-slate-400">{new Date(content.updatedAt).toLocaleString("zh-CN")}</span></button>)}</div> : <div className="p-12 text-center"><p className="font-medium">暂无需要处理的内容</p><p className="mt-2 text-sm text-slate-400">新的 AI 结果进入审核队列后会显示在这里。</p></div>}</div>}</div></main>;
}
