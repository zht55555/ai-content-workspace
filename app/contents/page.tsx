import { Suspense } from "react";
import { ContentLibrary } from "@/src/components/content/content-library";
import { ProductNav } from "@/src/components/product/product-nav";

export default function ContentsPage() { return <><ProductNav /><Suspense fallback={<main className="min-h-screen bg-[#f7f8fa]" />}><ContentLibrary /></Suspense></>; }
