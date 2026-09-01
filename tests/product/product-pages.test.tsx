import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/", useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

import { Dashboard } from "@/src/components/product/dashboard";
import { ReviewCenter } from "@/src/components/product/review-center";

describe("product pages", () => {
  it("renders product navigation and dashboard loading state", () => {
    const html = renderToStaticMarkup(React.createElement(Dashboard));
    expect(html).toContain("Dashboard");
    expect(html).toContain("Content Library");
    expect(html).toContain("Review Center");
  });

  it("renders Review Center entry point", () => {
    expect(renderToStaticMarkup(React.createElement(ReviewCenter))).toContain("Review Center");
  });
});
