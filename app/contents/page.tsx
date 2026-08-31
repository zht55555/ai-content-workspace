import { Suspense } from "react";
import { ContentLibrary } from "@/src/components/content/content-library";

export default function ContentsPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f7f8fa]" />}><ContentLibrary /></Suspense>;
}
