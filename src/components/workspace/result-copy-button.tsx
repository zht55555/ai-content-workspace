"use client";

import React from "react";
import { useState } from "react";

export function ResultCopyButton({ value, label = "复制" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }
  return <button className="rounded-md border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50" onClick={copy} type="button">{copied ? "已复制" : label}</button>;
}
