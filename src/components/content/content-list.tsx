import React from "react";
import type { ContentListItem } from "@/src/lib/api/contents";
import { ContentStatusBadge } from "./content-status-badge";

const platforms: Record<ContentListItem["platform"], string> = { DOUYIN: "抖音", XIAOHONGSHU: "小红书", BILIBILI: "B 站", WECHAT: "微信", OTHER: "其他" };
const formatDate = (value: string) => new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

type Props = { items: ContentListItem[]; loading: boolean; error: string | null; onSelect: (id: string) => void; onRetry: () => void };

export function ContentList({ items, loading, error, onSelect, onRetry }: Props) {
  if (loading) return <div className="space-y-3" aria-label="内容列表加载中">{[1, 2, 3].map((item) => <div className="h-28 animate-pulse rounded-2xl bg-white" key={item} />)}</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"><p>{error}</p><button className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium" onClick={onRetry} type="button">重新加载</button></div>;
  if (items.length === 0) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center"><p className="text-lg font-semibold text-slate-900">还没有内容</p><p className="mt-2 text-sm text-slate-500">创建第一条内容，开始建立你的内容资产库。</p><span className="mt-5 inline-flex rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">创建第一条内容</span></div>;
  return <div className="space-y-3">{items.map((item) => <button className="group block w-full rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]" key={item.id} onClick={() => onSelect(item.id)} type="button"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-base font-semibold text-slate-900">{item.title}</h2><p className="mt-1 line-clamp-1 text-sm text-slate-500">{item.rawContent}</p></div><ContentStatusBadge status={item.status} /></div><div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700">{platforms[item.platform]}</span>{item.source && <span>来源：{item.source}</span>}{item.tags.map((tag) => <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700" key={tag}>#{tag}</span>)}<span className="ml-auto text-slate-400">更新于 {formatDate(item.updatedAt)}</span></div></button>)}</div>;
}
