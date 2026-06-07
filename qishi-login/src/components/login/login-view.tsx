"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

import { saveAuthSession } from "@/lib/auth/client-session";
import { nextRouteApi } from "@/lib/api-base";

import { LoginBackground } from "./login-background";
import { LoginBrandMark } from "./login-brand-mark";
import { LoginPasswordForm } from "./login-password-form";
import { LoginSmsForm } from "./login-sms-form";
import { LoginThirdPartyRow } from "./login-third-party-row";

type SecondaryMode = "none" | "sms" | "password";

export function LoginView() {
  const router = useRouter();
  const [secondary, setSecondary] = useState<SecondaryMode>("none");
  /** 不用 useTransition 包 async：否则 isPending 与 await 后的导航容易不同步（React 不推荐 async startTransition）。 */
  const [isPending, setIsPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const finishLogin = useCallback(() => {
    startTransition(() => {
      router.replace("/map");
    });
  }, [router]);

  const handlePrimaryLogin = useCallback(() => {
    if (isPending) return;
    setNotice(null);
    setIsPending(true);
    void (async () => {
      try {
        const res = await fetch(nextRouteApi("/api/auth/device"), { method: "POST" });
        const data = (await res.json()) as {
          error?: string;
          token?: string;
          user?: { loginType: "device"; label?: string };
        };
        if (!res.ok || !data.token || !data.user) {
          setNotice(data.error ?? "一键登录失败，请稍后重试");
          return;
        }
        saveAuthSession({
          token: data.token,
          user: {
            loginType: "device",
            label: data.user.label,
          },
        });
        finishLogin();
      } catch {
        setNotice("网络异常，请稍后重试");
      } finally {
        setIsPending(false);
      }
    })();
  }, [isPending, finishLogin]);

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-[#F2F4F7] dark:bg-gray-900">
      <LoginBackground />

      <div className="relative z-10 w-full px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link
          href="/map"
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-lg text-2xl leading-none text-slate-800 hover:bg-black/5 dark:text-white dark:hover:bg-white/10",
            loginFocusRing()
          )}
          aria-label="进入首页（跳过登录）"
        >
          ‹
        </Link>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-12 pt-2 sm:px-8 sm:pb-16">
        <div className="mb-10 flex flex-col items-center text-center sm:mb-12">
          <LoginBrandMark />
          <h1 className="mt-7 text-[2rem] font-bold italic leading-none tracking-tight text-[#2d4a6f] dark:text-[#8ea8cc] sm:text-4xl">
            起势
          </h1>
          <p className="mt-3 max-w-[18rem] text-[11px] font-normal leading-relaxed tracking-[0.02em] text-[#3d5a80]/88 dark:text-[#64748b] sm:text-xs">
            钓有所乐 · 分享每一次收获
          </p>
        </div>

        <Button
          type="button"
          onClick={handlePrimaryLogin}
          disabled={isPending}
          className={cn(
            "mb-6 h-auto w-full max-w-[300px] rounded-full border-0 bg-[#1E90FF] px-6 py-3.5 text-base font-medium text-white shadow-lg shadow-black/15 transition-colors hover:bg-[#1873CC] disabled:opacity-90 dark:shadow-black/40",
            loginFocusRing()
          )}
          aria-busy={isPending}
        >
          <span className="inline-flex items-center justify-center gap-2">
            {isPending ? (
              <>
                <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
                <span>登录中…</span>
              </>
            ) : (
              "本机登录一键登录"
            )}
          </span>
        </Button>

        <div className="mb-6 flex items-center gap-3 text-sm text-slate-600 dark:text-white/80">
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setSecondary((s) => (s === "sms" ? "none" : "sms"));
            }}
            className={cn(
              "rounded-md transition-colors hover:text-slate-900 dark:hover:text-white",
              secondary === "sms" && "font-medium text-[#1E90FF] dark:text-white",
              loginFocusRing()
            )}
          >
            验证码登录
          </button>
          <span className="text-slate-400 dark:text-white/50" aria-hidden>
            |
          </span>
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setSecondary((s) => (s === "password" ? "none" : "password"));
            }}
            className={cn(
              "rounded-md transition-colors hover:text-slate-900 dark:hover:text-white",
              secondary === "password" && "font-medium text-[#1E90FF] dark:text-white",
              loginFocusRing()
            )}
          >
            密码登录
          </button>
        </div>

        {secondary === "sms" ? (
          <LoginSmsForm
            onDone={finishLogin}
            onError={(msg) => setNotice(msg || null)}
          />
        ) : null}
        {secondary === "password" ? (
          <LoginPasswordForm
            onDone={finishLogin}
            onError={(msg) => setNotice(msg || null)}
          />
        ) : null}

        <div className="mb-6 text-sm text-slate-500 dark:text-white/60">第三方登录</div>

        {notice ? (
          <p className="mb-4 max-w-[300px] text-center text-xs text-amber-700 dark:text-amber-200/90" role="status">
            {notice}
          </p>
        ) : null}

        <LoginThirdPartyRow
          onUnavailable={(label) => {
            setNotice(`${label}登录尚未接入，请使用「本机一键登录」或左上角进入地图。`);
          }}
        />

        <div className="max-w-sm px-1 text-center text-xs leading-relaxed text-slate-500 dark:text-white/60">
          <span className="text-[#1E90FF] dark:text-[#4da3ff]">同意</span>
          <Link
            href="/legal/privacy"
            className={cn(
              "mx-1 text-[#1E90FF] underline underline-offset-2 dark:text-[#4da3ff]",
              loginFocusRing()
            )}
          >
            《隐私政策》
          </Link>
          和
          <Link
            href="/legal/purchase"
            className={cn(
              "ml-1 text-[#1E90FF] underline underline-offset-2 dark:text-[#4da3ff]",
              loginFocusRing()
            )}
          >
            《购买协议》
          </Link>
        </div>
      </div>
    </div>
  );
}
