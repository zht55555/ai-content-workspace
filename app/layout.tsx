import type { Metadata } from "next";
import { WorkspaceRouteShell } from "@/src/components/workspace/workspace-route-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Content Workflow",
  description: "AI 内容生产与运营自动化工作台",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body><WorkspaceRouteShell />{children}</body>
    </html>
  );
}
