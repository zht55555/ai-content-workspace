"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProductNav() {
  const pathname = usePathname();
  const links = [["/", "Dashboard"], ["/contents", "Content Library"], ["/reviews", "Review Center"]] as const;
  return <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-4 lg:px-8"><Link href="/" className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">A</span><span><span className="block text-sm font-semibold text-slate-900">AI Content Workspace</span><span className="block text-[11px] text-slate-400">内容生产与运营工作台</span></span></Link><nav className="flex items-center gap-1 rounded-xl bg-slate-50 p-1">{links.map(([href, label]) => <Link className={`rounded-lg px-3 py-2 text-sm ${pathname === href || (href !== "/" && pathname.startsWith(href)) ? "bg-white font-semibold text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`} href={href} key={href}>{label}</Link>)}</nav><span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 md:inline">Demo Provider</span></div></header>;
}
