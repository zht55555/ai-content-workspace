"use client";

import React from "react";
import type { ContentPlatform, ContentStatus } from "@/src/modules/content/content.types";

const platforms: Array<[ContentPlatform, string]> = [["DOUYIN", "抖音"], ["XIAOHONGSHU", "小红书"], ["BILIBILI", "B 站"], ["WECHAT", "微信"], ["OTHER", "其他"]];
const statuses: Array<[ContentStatus, string]> = [["DRAFT", "草稿"], ["AI_PROCESSING", "AI 处理中"], ["WAITING_REVIEW", "待审核"], ["NEEDS_REVISION", "需修改"], ["APPROVED", "已批准"], ["REJECTED", "已拒绝"], ["PUBLISHED", "已发布"], ["ARCHIVED", "已归档"]];

export function ContentFilters({ search, platform, status, onSearch, onPlatform, onStatus }: { search: string; platform: string; status: string; onSearch: (value: string) => void; onPlatform: (value: string) => void; onStatus: (value: string) => void }) {
  return <div className="flex flex-col gap-3 md:flex-row"><div className="relative min-w-0 flex-1"><span className="pointer-events-none absolute left-3 top-2.5 text-slate-400">⌕</span><input aria-label="搜索内容" className="w-full rounded-xl border border-slate-200 bg-white px-9 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100" onChange={(event) => onSearch(event.target.value)} placeholder="搜索标题或原始内容" value={search} /></div><select aria-label="Platform Filter" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400" onChange={(event) => onPlatform(event.target.value)} value={platform}><option value="">全部平台</option>{platforms.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Status Filter" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400" onChange={(event) => onStatus(event.target.value)} value={status}><option value="">全部状态</option>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>;
}
