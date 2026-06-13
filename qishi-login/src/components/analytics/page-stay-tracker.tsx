"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { loadAuthSession } from "@/lib/auth/client-session";
import { recordPageStay } from "@/lib/analytics/page-stay-storage";

type ActivePage = {
  path: string;
  title: string;
  start: number;
};

const PAGE_TITLES: Record<string, string> = {
  "/map": "地图首页",
  "/spots": "钓点",
  "/records": "作钓记录",
  "/tools": "工具箱",
  "/profile": "我的",
};

function pageTitle(path: string): string {
  if (PAGE_TITLES[path]) return PAGE_TITLES[path];
  if (path.startsWith("/nav/")) return "导航";
  if (path.startsWith("/spot/")) return "钓点详情";
  if (path.startsWith("/profile/")) return "我的";
  return path || "未知页面";
}

function currentUserLabel(): string | undefined {
  const session = loadAuthSession();
  const user = session?.user;
  return user?.nickname || user?.label || user?.phoneMasked || user?.accountMasked;
}

export function PageStayTracker() {
  const pathname = usePathname();
  const activeRef = useRef<ActivePage | null>(null);

  useEffect(() => {
    const now = Date.now();

    const flush = () => {
      const active = activeRef.current;
      if (!active) return;
      const end = Date.now();
      recordPageStay({
        path: active.path,
        title: active.title,
        startAt: new Date(active.start).toISOString(),
        endAt: new Date(end).toISOString(),
        durationMs: end - active.start,
        userLabel: currentUserLabel(),
      });
    };

    flush();
    activeRef.current = {
      path: pathname,
      title: pageTitle(pathname),
      start: now,
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
        activeRef.current = null;
      } else if (!activeRef.current) {
        activeRef.current = {
          path: pathname,
          title: pageTitle(pathname),
          start: Date.now(),
        };
      }
    };

    const onPageHide = () => flush();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      flush();
      activeRef.current = null;
    };
  }, [pathname]);

  return null;
}
