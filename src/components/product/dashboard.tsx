"use client";

import React from "react";
import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/src/lib/api/client";
import { getDashboard, type DashboardData } from "@/src/lib/api/product";
import { ProductNav } from "./product-nav";
import { ContentStatusBadge } from "@/src/components/content/content-status-badge";
import { useRouter } from "next/navigation";

const labels: Record<string, string> = { DRAFT: "Draft", AI_PROCESSING: "AI Processing", WAITING_REVIEW: "Waiting Review", NEEDS_REVISION: "Needs Revision", APPROVED: "Approved" };
export function Dashboard() {
  const router = useRouter(); const [data, setData] = useState<DashboardData | null>(null); const [error, setError] = useState<string | null>(null);
  async function load() { setError(null); try { setData(await getDashboard()); } catch (reason) { setError(getApiErrorMessage(reason, "Dashboard 加载失败。")); } }
  useEffect(() => { void load(); }, []);
  return <main className="min-h-screen bg-[#f7f8fa] text-slate-900"><ProductNav /><div className="mx-auto max-w-6xl px-5 py-8 lg:px-8"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">AI Content Workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Dashboard</h1><p className="mt-2 text-sm text-slate-500">掌握内容资产的生产进度与审核队列。</p></div><button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600" onClick={() => void load()} type="button">刷新</button></div>{error ? <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}<button className="ml-3 underline" onClick={() => void load()} type="button">重试</button></div> : !data ? <div className="mt-8 h-44 animate-pulse rounded-2xl bg-white" /> : <><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{Object.entries(labels).map(([key, label]) => <div className="rounded-2xl border border-slate-200 bg-white p-5" key={key}><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold">{data.counts[key] ?? 0}</p></div>)}</div><div className="mt-8 grid gap-5 lg:grid-cols-3">{[["最近内容", data.recent], ["待审核", data.waitingReview], ["最近完成", data.recentlyCompleted]].map(([title, items]) => <section className="rounded-2xl border border-slate-200 bg-white p-5" key={title as string}><div className="flex items-center justify-between"><h2 className="font-semibold">{title as string}</h2><button className="text-xs text-blue-600" onClick={() => router.push(title === "待审核" ? "/reviews" : "/contents")} type="button">查看全部</button></div><div className="mt-4 space-y-3">{(items as DashboardData["recent"]).length ? (items as DashboardData["recent"]).map((item) => <button className="block w-full rounded-xl border border-slate-100 p-3 text-left hover:border-slate-300" key={item.id} onClick={() => router.push(`/contents/${item.id}`)} type="button"><p className="truncate text-sm font-medium">{item.title}</p><div className="mt-2 flex items-center justify-between"><ContentStatusBadge status={item.status} /><span className="text-xs text-slate-400">{new Date(item.updatedAt).toLocaleDateString("zh-CN")}</span></div></button>) : <p className="py-6 text-center text-sm text-slate-400">暂无内容</p>}</div></section>)}</div></>}</div></main>;
}
