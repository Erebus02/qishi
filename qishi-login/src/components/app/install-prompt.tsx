"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "qishi-pwa-install-dismissed-at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 「添加到主屏幕」提示：
 * - Android Chrome：拦截 beforeinstallprompt，弹出原生安装对话框
 * - iOS Safari：显示操作说明（系统不允许程序化安装）
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [showIosHint, setShowIosHint] = useState(false);
  /** null = 尚未读取 localStorage，避免首帧误显/误藏 */
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      const at = raw ? Number(raw) : 0;
      setDismissed(Boolean(at && Date.now() - at < DISMISS_TTL_MS));
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalonePwa()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    /* iOS：无 beforeinstallprompt，延迟展示说明避免遮挡首屏 */
    let t: ReturnType<typeof setTimeout> | undefined;
    if (isIos() && !sessionStorage.getItem("qishi-ios-install-shown")) {
      t = setTimeout(() => {
        setShowIosHint(true);
        sessionStorage.setItem("qishi-ios-install-shown", "1");
      }, 4000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      if (t) clearTimeout(t);
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setShowIosHint(false);
    setDeferred(null);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, []);

  const runInstall = useCallback(async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* 用户取消或环境不支持 */
    } finally {
      setDeferred(null);
    }
  }, [deferred]);

  if (dismissed === null || dismissed || isStandalonePwa()) return null;

  if (deferred) {
    return (
      <div
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[7000] max-w-lg mx-auto rounded-2xl border border-white/20 bg-zinc-900/95 p-3 text-sm text-white shadow-2xl backdrop-blur-md sm:left-auto sm:right-4 sm:w-[min(100%-2rem,22rem)]"
        role="status"
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white">将「起势」添加到主屏幕</p>
            <p className="mt-1 text-xs text-zinc-300">
              像 App 一样全屏打开，地图与工具更快直达。
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => void runInstall()}
                className={cn(
                  "flex-1 rounded-xl bg-[#1E90FF] py-2.5 text-xs font-semibold text-white",
                  loginFocusRing()
                )}
              >
                安装
              </button>
              <button
                type="button"
                onClick={dismiss}
                className={cn(
                  "rounded-xl border border-white/20 px-3 py-2.5 text-xs text-zinc-200",
                  loginFocusRing()
                )}
              >
                稍后
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className={cn("shrink-0 rounded-lg p-1 text-zinc-400", loginFocusRing())}
            aria-label="关闭"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>
    );
  }

  if (showIosHint && isIos()) {
    return (
      <div
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[7000] max-w-lg mx-auto rounded-2xl border border-white/20 bg-zinc-900/95 p-3 text-sm text-white shadow-2xl backdrop-blur-md"
        role="status"
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">添加到主屏幕（iOS）</p>
            <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
              点 Safari 底栏「分享」按钮 → 向下找到「添加到主屏幕」。安装后从桌面打开体验更佳。
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className={cn("shrink-0 rounded-lg p-1 text-zinc-400", loginFocusRing())}
            aria-label="关闭"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
