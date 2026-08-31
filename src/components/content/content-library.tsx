"use client";

import React from "react";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { listContents, type ContentListItem } from "@/src/lib/api/contents";
import { getApiErrorMessage } from "@/src/lib/api/client";
import { ContentFilters } from "./content-filters";
import { ContentList } from "./content-list";
import { ContentCreateForm } from "./content-create-form";

export function ContentLibrary() {
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams();
  const search = params.get("search") ?? ""; const platform = params.get("platform") ?? ""; const status = params.get("status") ?? "";
  const [items, setItems] = useState<ContentListItem[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [creating, setCreating] = useState(false);
  const load = useCallback(async () => { setLoading(true); setError(null); try { const query = new URLSearchParams({ page: "1", pageSize: "20" }); if (search) query.set("search", search); if (platform) query.set("platform", platform); if (status) query.set("status", status); setItems((await listContents(query)).items); } catch (reason) { setError(getApiErrorMessage(reason, "内容列表加载失败。")); } finally { setLoading(false); } }, [search, platform, status]);
  useEffect(() => { void load(); }, [load]);
  function update(key: string, value: string) { const next = new URLSearchParams(params.toString()); if (value) next.set(key, value); else next.delete(key); router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ""}` as never); }
  if (creating) return <main className="min-h-screen bg-[#f7f8fa] px-5 py-8 text-slate-900"><div className="mx-auto max-w-3xl"><ContentCreateForm onCancel={() => setCreating(false)} /></div></main>;
  return <main className="min-h-screen bg-[#f7f8fa] text-slate-900"><div className="mx-auto max-w-6xl px-5 py-8 lg:px-8"><header className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">AI Content Workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Content Library <span className="font-normal text-slate-400">/ 内容库</span></h1><p className="mt-2 text-sm text-slate-500">集中管理团队素材，记录每条内容从原始想法开始的生命周期。</p></div><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700" onClick={() => setCreating(true)} type="button">+ 创建内容</button></header><div className="mt-8"><ContentFilters search={search} platform={platform} status={status} onSearch={(value) => update("search", value)} onPlatform={(value) => update("platform", value)} onStatus={(value) => update("status", value)} /></div><div className="mt-6"><ContentList items={items} loading={loading} error={error} onRetry={() => void load()} onSelect={(id) => router.push(`/contents/${id}`)} /></div></div></main>;
}
