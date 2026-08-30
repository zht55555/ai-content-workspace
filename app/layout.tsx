import type { Metadata } from "next";
import { WorkspaceShell } from "@/src/components/workspace/workspace-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Content Workflow",
  description: "AI 内容生产与运营自动化工作台",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body><WorkspaceShell />{children}</body>
    </html>
  );
}
