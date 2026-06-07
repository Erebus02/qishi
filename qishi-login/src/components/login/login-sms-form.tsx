"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { saveAuthSession } from "@/lib/auth/client-session";
import { loginFocusRing } from "@/lib/login-styles";
import { nextRouteApi } from "@/lib/api-base";
import { cn } from "@/lib/utils";

const inputCls =
  "mb-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none ring-[#1E90FF]/30 placeholder:text-gray-400 focus:ring-2 dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100";

type Props = {
  onDone: () => void;
  onError: (msg: string) => void;
};

export function LoginSmsForm({ onDone, onError }: Props) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devHint, setDevHint] = useState<string | null>(null);
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cooldown <= 0) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    tickRef.current = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [cooldown]);

  const sendCode = useCallback(async () => {
    const p = phone.trim();
    if (!/^1[3-9]\d{9}$/.test(p)) {
      onError("请输入正确的 11 位手机号");
      return;
    }
    setLoadingSend(true);
    onError("");
    setDevHint(null);
    try {
      const res = await fetch(nextRouteApi("/api/auth/sms/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p }),
      });
      const data = (await res.json()) as {
        error?: string;
        cooldownSeconds?: number;
        debugCode?: string;
      };
      if (!res.ok) {
        onError(data.error ?? "发送失败");
        if (data.cooldownSeconds && data.cooldownSeconds > 0) {
          setCooldown(data.cooldownSeconds);
        }
        return;
      }
      setCooldown(data.cooldownSeconds ?? 60);
      if (data.debugCode) {
        setDevHint(`开发环境验证码：${data.debugCode}`);
      }
    } catch {
      onError("网络异常，请稍后重试");
    } finally {
      setLoadingSend(false);
    }
  }, [phone, onError]);

  const submit = useCallback(async () => {
    const p = phone.trim();
    if (!/^1[3-9]\d{9}$/.test(p)) {
      onError("请输入正确的手机号");
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      onError("请输入 6 位验证码");
      return;
    }
    setLoadingLogin(true);
    onError("");
    try {
      const res = await fetch(nextRouteApi("/api/auth/sms/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p, code: code.trim() }),
      });
      const data = (await res.json()) as {
        error?: string;
        token?: string;
        user?: { loginType: string; phoneMasked?: string };
      };
      if (!res.ok || !data.token || !data.user) {
        onError(data.error ?? "登录失败");
        return;
      }
      saveAuthSession({
        token: data.token,
        user: {
          loginType: "sms",
          phoneMasked: data.user.phoneMasked,
        },
      });
      onDone();
    } catch {
      onError("网络异常，请稍后重试");
    } finally {
      setLoadingLogin(false);
    }
  }, [phone, code, onDone, onError]);

  return (
    <div className="mb-8 w-full max-w-[300px]">
      <label className="mb-1 block text-left text-xs font-medium text-slate-600 dark:text-zinc-400">
        手机号
      </label>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        maxLength={11}
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
        placeholder="11 位手机号"
        className={inputCls}
      />
      <div className="mb-1 flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="6 位验证码"
          className={cn(inputCls, "mb-0 flex-1")}
        />
        <Button
          type="button"
          variant="outline"
          disabled={loadingSend || cooldown > 0}
          onClick={() => void sendCode()}
          className={cn(
            "h-[42px] shrink-0 rounded-xl border-gray-200 px-3 text-xs dark:border-white/15",
            loginFocusRing()
          )}
        >
          {loadingSend ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : cooldown > 0 ? (
            `${cooldown}s`
          ) : (
            "获取验证码"
          )}
        </Button>
      </div>
      <Button
        type="button"
        disabled={loadingLogin}
        onClick={() => void submit()}
        className={cn(
          "h-auto w-full rounded-full border-0 bg-[#1E90FF] py-2.5 text-sm font-medium text-white hover:bg-[#1873CC] disabled:opacity-90",
          loginFocusRing()
        )}
      >
        {loadingLogin ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            登录中…
          </span>
        ) : (
          "验证并登录"
        )}
      </Button>
      {devHint ? (
        <p className="mt-2 text-left text-[11px] text-sky-600 dark:text-sky-400">{devHint}</p>
      ) : null}
      <p className="mt-2 text-left text-[10px] leading-relaxed text-slate-400 dark:text-zinc-500">
        验证码由服务端生成（内存存储，重启失效）。生产环境请接入短信服务商。
      </p>
    </div>
  );
}
