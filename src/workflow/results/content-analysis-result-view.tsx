"use client";

import { useEffect, useState } from "react";

type Result = {
  analysis: { topic: string; contentType: string; coreMessage: string };
  hook: { type: string; score: number; reason: string };
  structure: Array<{ stage: string; content: string; purpose: string }>;
  emotion: { overallTone: string; emotionPoints: Array<{ type: string; content: string }> };
  optimization: { strengths: string[]; change: string[]; rhythmSuggestions: string[] };
  generatedScript: { title: string; script: string; notes: string[] };
  marketing: { titles: string[]; coverTexts: string[]; publishCopy: string; keywords: string[] };
};

export function ContentAnalysisResultView({ taskId, enabled }: { taskId: string; enabled: boolean }) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    fetch(`/api/tasks/${encodeURIComponent(taskId)}/results/latest`)
      .then(async (response) => {
        if (!response.ok) throw new Error("分析结果暂不可用。");
        return (await response.json()).result as Result;
      })
      .then(setResult)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "分析结果加载失败。"));
  }, [enabled, taskId]);

  if (!enabled) return null;
  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!result) return <p className="text-sm text-slate-600">正在加载分析结果…</p>;

  return <section className="space-y-4 rounded-lg border bg-white p-5 shadow-sm">
    <h2 className="font-medium">Content Analysis Result</h2>
    <div><h3 className="font-medium">内容摘要</h3><p>{result.analysis.topic} · {result.analysis.contentType}</p><p>{result.analysis.coreMessage}</p></div>
    <div><h3 className="font-medium">Hook</h3><p>{result.hook.type} · {result.hook.score}</p><p>{result.hook.reason}</p></div>
    <div><h3 className="font-medium">Structure</h3><ul className="list-disc pl-5">{result.structure.map((item) => <li key={`${item.stage}-${item.content}`}>{item.stage}：{item.content}（{item.purpose}）</li>)}</ul></div>
    <div><h3 className="font-medium">Emotion</h3><p>{result.emotion.overallTone}</p><ul className="list-disc pl-5">{result.emotion.emotionPoints.map((item) => <li key={`${item.type}-${item.content}`}>{item.type}：{item.content}</li>)}</ul></div>
    <div><h3 className="font-medium">Optimization</h3><p>保留：{result.optimization.strengths.join("、")}</p><p>调整：{result.optimization.change.join("、")}</p><p>节奏：{result.optimization.rhythmSuggestions.join("、")}</p></div>
    <div><h3 className="font-medium">Generated Script：{result.generatedScript.title}</h3><p className="whitespace-pre-wrap">{result.generatedScript.script}</p></div>
    <div><h3 className="font-medium">Marketing</h3><p>标题：{result.marketing.titles.join("、")}</p><p>封面：{result.marketing.coverTexts.join("、")}</p><p>{result.marketing.publishCopy}</p><p>关键词：{result.marketing.keywords.join("、")}</p></div>
  </section>;
}
