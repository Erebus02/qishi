"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

type ProfileSubPageShellProps = {
  title: string;
  children: React.ReactNode;
};

/**
 * 「我的」子页统一壳：顶栏返回 /profile，底部留白给 TabBar。
 */
export function ProfileSubPageShell({ title, children }: ProfileSubPageShellProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50 dark:bg-zinc-950">
      <header className="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-3 py-3 dark:border-white/10 dark:bg-zinc-900">
        <Link
          href="/profile"
          className={cn(
            "flex min-h-[44px] min-w-[44px] items-center gap-0.5 rounded-lg text-sm text-gray-700 dark:text-zinc-200",
            loginFocusRing()
          )}
          aria-label="返回我的"
        >
          <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden />
          返回
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-base font-semibold text-gray-900 dark:text-zinc-50">
          {title}
        </h1>
        <span className="w-[72px] shrink-0" aria-hidden />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4">
        {children}
      </div>
    </div>
  );
}
