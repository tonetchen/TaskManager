import type { Metadata, Viewport } from "next";
import { SessionProvider } from "@/components/auth/session-provider";
import "./taskflow.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaskManager",
  description: "任务管理系统",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
