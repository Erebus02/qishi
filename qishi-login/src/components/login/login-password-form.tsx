"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { saveAuthSession } from "@/lib/auth/client-session";
import { loginFocusRing } from "@/lib/login-styles";
import { nextRouteApi } from "@/lib/api-base";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none ring-[#1E90FF]/30 placeholder:text-gray-400 focus:ring-2 dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100";

type Props = {
  onDone: () => void;
  onError: (msg: string) => void;
};

export function LoginPasswordForm({ onDone, onError }: Props) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async () => {
    const a = account.trim();
    if (!a || password.length < 6) {
      onError("请输入账号与至少 6 位密码");
      return;
    }
    setLoading(true);
    onError("");
    try {
      const res = await fetch(nextRouteApi("/api/auth/password/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: a, password }),
      });
      const data = (await res.json()) as {
        error?: string;
        token?: string;
        user?: {
          loginType: string;
          accountMasked?: string;
        };
      };
      if (!res.ok || !data.token || !data.user) {
        onError(data.error ?? "登录失败");
        return;
      }
      saveAuthSession({
        token: data.token,
        user: {
          loginType: "password",
          accountMasked: data.user.accountMasked,
        },
      });
      onDone();
    } catch {
      onError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [account, password, onDone, onError]);

  return (
    <div className="mb-8 w-full max-w-[300px]">
      <label className="mb-1 block text-left text-xs font-medium text-slate-600 dark:text-zinc-400">
        账号
      </label>
      <input
        type="text"
        autoComplete="username"
        value={account}
        onChange={(e) => setAccount(e.target.value)}
        placeholder="手机号或邮箱"
        className={cn(inputCls, "mb-3")}
      />
      <label className="mb-1 block text-left text-xs font-medium text-slate-600 dark:text-zinc-400">
        密码
      </label>
      <div className="relative mb-3">
        <input
          type={showPwd ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="至少 6 位"
          className={cn(inputCls, "pr-11")}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={showPwd ? "隐藏密码" : "显示密码"}
          onClick={() => setShowPwd((v) => !v)}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-black/5 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-zinc-200",
            loginFocusRing()
          )}
        >
          {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <Button
        type="button"
        disabled={loading}
        onClick={() => void submit()}
        className={cn(
          "h-auto w-full rounded-full border-0 bg-[#1E90FF] py-2.5 text-sm font-medium text-white hover:bg-[#1873CC] disabled:opacity-90",
          loginFocusRing()
        )}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            登录中…
          </span>
        ) : (
          "登录"
        )}
      </Button>
      <p className="mt-2 text-left text-[10px] leading-relaxed text-slate-400 dark:text-zinc-500">
        演示账号默认：<span className="tabular-nums">13800138000</span> /{" "}
        <span className="font-mono text-[11px]">qishi123456</span>
        （可通过环境变量 AUTH_DEMO_ACCOUNT、AUTH_DEMO_PASSWORD 修改）
      </p>
    </div>
  );
}
