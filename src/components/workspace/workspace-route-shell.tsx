"use client";

import { usePathname } from "next/navigation";
import { WorkspaceShell } from "./workspace-shell";

export function WorkspaceRouteShell() {
  const pathname = usePathname();
  return pathname === "/contents" || pathname.startsWith("/contents/") ? null : <WorkspaceShell />;
}
