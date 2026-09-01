import { Suspense } from "react";
import { ReviewCenter } from "@/src/components/product/review-center";
export default function ReviewsPage() { return <Suspense fallback={<main className="min-h-screen bg-[#f7f8fa]" />}><ReviewCenter /></Suspense>; }
