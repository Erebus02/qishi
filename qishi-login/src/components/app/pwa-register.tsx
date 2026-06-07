"use client";

import { useEffect } from "react";

/**
 * 生产环境注册 `/public/sw.js`。
 * 开发环境不注册，避免 Service Worker 缓存干扰 HMR。
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              /* 新版本已下载，下次打开生效；如需立刻刷新可在此 dispatch 事件给 UI */
            }
          });
        });
      } catch {
        /* 注册失败不影响正常浏览 */
      }
    };

    void register();
  }, []);

  return null;
}
