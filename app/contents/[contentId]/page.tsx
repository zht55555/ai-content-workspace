"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ContentDetail as ContentDetailType } from "@/src/lib/api/contents";
import { getContent } from "@/src/lib/api/contents";
import { ContentDetail } from "@/src/components/content/content-detail";
import { ProductNav } from "@/src/components/product/product-nav";

export default function ContentDetailPage() {
  const params = useParams<{ contentId: string }>(); const contentId = params.contentId; const [content, setContent] = useState<ContentDetailType>(); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { setContent(await getContent(contentId)); } catch (reason) { setError(reason instanceof Error ? reason.message : "内容加载失败。"); } finally { setLoading(false); } }, [contentId]);
  useEffect(() => { void load(); }, [load]);
  return <><ProductNav /><ContentDetail content={content} contentId={contentId} loading={loading} error={error} onRetry={() => void load()} onUpdated={setContent} /></>;
}
