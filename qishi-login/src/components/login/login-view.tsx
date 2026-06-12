"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

import { saveAuthSession } from "@/lib/auth/client-session";
import { nextRouteApi } from "@/lib/api-base";

import { LoginBackground } from "./login-background";
import { LoginBrandMark } from "./login-brand-mark";
import { LoginThirdPartyRow } from "./login-third-party-row";
import { WeChatIcon } from "./login-third-party-icons";

export function LoginView() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const finishLogin = useCallback(() => {
    startTransition(() => {
      router.replace("/map");
    });
  }, [router]);

  const handleWechatLogin = useCallback(() => {
    if (isPending) return;
    if (!agreed) {
      setNotice("请先阅读并同意用户协议和隐私政策");
      return;
    }
    setNotice(null);
    setIsPending(true);
    void (async () => {
      try {
        const res = await fetch(nextRouteApi("/api/auth/wechat"), { method: "POST" });
        const data = (await res.json()) as {
          error?: string;
          token?: string;
          user?: { loginType: "wechat"; label?: string };
        };
        if (!res.ok || !data.token || !data.user) {
          setNotice(data.error ?? "微信登录失败，请稍后重试");
          return;
        }
        saveAuthSession({
          token: data.token,
          user: {
            loginType: "wechat",
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
  }, [agreed, isPending, finishLogin]);

  const handleUnavailable = useCallback(
    (label: string) => {
      if (!agreed) {
        setNotice("请先阅读并同意用户协议和隐私政策");
        return;
      }
      setNotice(`${label}登录尚未接入，请使用微信登录。`);
    },
    [agreed]
  );

  return (
    <div className="relative isolate min-h-dvh w-full overflow-x-hidden bg-white">
      <LoginBackground />

      <main className="relative z-30 mx-auto flex min-h-dvh w-full max-w-md flex-col items-center px-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(7.25rem,calc(env(safe-area-inset-top)+5.5rem))]">
        <section className="flex flex-col items-center text-center">
          <LoginBrandMark />
          <h1 className="mt-4 text-[46px] font-black italic leading-none text-[#10213d]">
            起势
          </h1>
          <p className="mt-3 text-[15px] leading-6 text-[#607391]">
            钓有所乐 · 分享每一次收获
          </p>
        </section>

        <section className="mt-auto w-full pt-12">
          <Button
            type="button"
            onClick={handleWechatLogin}
            disabled={isPending}
            className={cn(
              "h-14 w-full rounded-full border border-white/80 bg-white/92 text-lg font-semibold text-[#1E293B] shadow-[0_12px_30px_rgba(15,30,51,0.12)] backdrop-blur-md transition-transform hover:bg-white active:scale-[0.98] disabled:opacity-80",
              loginFocusRing()
            )}
            aria-busy={isPending}
          >
            {isPending ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <WeChatIcon className="size-7 text-[#22C55E]" aria-hidden />
            )}
            <span>{isPending ? "登录中…" : "微信登录"}</span>
          </Button>

          <div className="mt-7 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-400/35" />
            <span className="text-sm text-[#475569]">其他登录方式</span>
            <div className="h-px flex-1 bg-slate-400/35" />
          </div>

          <div className="mt-5">
            <LoginThirdPartyRow onUnavailable={handleUnavailable} />
          </div>

          {notice ? (
            <p className="mt-4 text-center text-xs text-amber-700" role="status">
              {notice}
            </p>
          ) : null}

          <div className="mt-7 flex items-start justify-center gap-2 text-xs leading-5 text-[#8290a5]">
            <button
              type="button"
              onClick={() => {
                setAgreed((value) => !value);
                setNotice(null);
              }}
              className={cn(
                "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors",
                agreed
                  ? "border-[#2F80FF] bg-[#2F80FF] text-white"
                  : "border-[#B8C4D4] bg-white/65 text-transparent",
                loginFocusRing("rounded-full")
              )}
              role="checkbox"
              aria-checked={agreed}
              aria-label="同意用户协议和隐私政策"
            >
              <Check className="size-3" strokeWidth={3} aria-hidden />
            </button>
            <p>
              我已阅读并同意
              <Link
                href="/legal/purchase"
                className={cn("mx-0.5 text-[#2F80FF]", loginFocusRing())}
              >
                《用户协议》
              </Link>
              和
              <Link
                href="/legal/privacy"
                className={cn("ml-0.5 text-[#2F80FF]", loginFocusRing())}
              >
                《隐私政策》
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
