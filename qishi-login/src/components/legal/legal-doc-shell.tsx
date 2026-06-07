"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

type LegalDocShellProps = {
  title: string;
  children: React.ReactNode;
  /** 默认从登录页进入时返回登录 */
  backHref?: string;
  backLabel?: string;
};

/**
 * 协议类文档统一壳：顶栏返回、正文区可滚动，无主导航底栏。
 */
export function LegalDocShell({
  title,
  children,
  backHref = "/login",
  backLabel = "返回",
}: LegalDocShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 dark:bg-zinc-950">
      <header className="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-white/10 dark:bg-zinc-900">
        <Link
          href={backHref}
          className={cn(
            "flex min-h-[44px] min-w-[44px] items-center gap-0.5 rounded-lg text-sm text-gray-700 dark:text-zinc-200",
            loginFocusRing()
          )}
        >
          <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden />
          {backLabel}
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-base font-semibold text-gray-900 dark:text-zinc-50">
          {title}
        </h1>
        <span className="w-[72px] shrink-0" aria-hidden />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        {children}
      </div>
    </div>
  );
}
