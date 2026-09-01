"use client";

import { usePathname } from "next/navigation";
import { WorkspaceShell } from "./workspace-shell";

export function WorkspaceRouteShell() {
  const pathname = usePathname();
  return pathname === "/" || pathname === "/reviews" || pathname === "/contents" || pathname.startsWith("/contents/") ? null : <WorkspaceShell />;
}
