"use client";

import React from "react";
import { useEffect, useState } from "react";
import type { ContentAnalysisResult } from "@/src/ai/schemas/content-analysis.schema";
import { getLatestAnalysisResult } from "@/src/lib/api/analysis-results";
import { ResultTabs } from "./result-tabs";

export function AnalysisResultPanel({ taskId, enabled }: { taskId: string; enabled: boolean }) {
  const [result, setResult] = useState<ContentAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => { if (!enabled) { setResult(null); return; } setResult(null); setError(null); getLatestAnalysisResult(taskId).then((response) => setResult(response.result)).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "分析结果加载失败。")); }, [enabled, taskId, reloadKey]);
  if (!enabled) return <div className="p-5"><p className="text-sm text-slate-500">Workflow 完成后，这里会显示正式分析结果。</p></div>;
  if (error) return <div className="p-5"><p className="text-sm text-red-700">{error}</p><button className="mt-3 rounded-md border px-3 py-1.5 text-xs" onClick={() => setReloadKey((value) => value + 1)} type="button">重新加载</button></div>;
  if (!result) return <div className="p-5"><p className="animate-pulse text-sm text-slate-500">正在加载 AnalysisResult…</p></div>;
  return <section><div className="border-b px-5 pt-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Analysis Result</p><h2 className="mt-1 text-lg font-semibold text-slate-900">结构化内容分析</h2></div><ResultTabs result={result} /></section>;
}
