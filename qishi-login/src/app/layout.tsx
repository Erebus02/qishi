import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { InstallPrompt } from "@/components/app/install-prompt";
import { PwaRegister } from "@/components/app/pwa-register";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * 移动端视口（等同传统 index.html 里的 viewport meta）。
 * maximumScale / userScalable 按产品要求固定缩放，避免表单聚焦时页面跳动；
 * 地图缩放由 Leaflet 手势处理，不依赖整页 pinch。
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1E90FF",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  applicationName: "起势",
  title: { default: "起势", template: "%s · 起势" },
  description: "钓有所乐 · 分享每一次收获 — 钓点、记录、海报与工具箱",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "起势",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/icons/pwa-icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
    apple: [{ url: "/icons/pwa-icon-512.svg", sizes: "180x180" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh touch-manipulation antialiased`}
      >
        <PwaRegister />
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
