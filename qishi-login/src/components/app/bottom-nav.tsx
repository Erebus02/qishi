"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, FileText, Map, User, Wrench } from "lucide-react";

import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/map", label: "首页", icon: Map, match: (p: string) => p === "/map" },
  {
    href: "/spots",
    label: "钓点",
    icon: Compass,
    match: (p: string) => p.startsWith("/spots"),
  },
  {
    href: "/records",
    label: "记录",
    icon: FileText,
    match: (p: string) => p.startsWith("/records"),
  },
  {
    href: "/tools",
    label: "工具箱",
    icon: Wrench,
    match: (p: string) => p.startsWith("/tools"),
  },
  {
    href: "/profile",
    label: "我的",
    icon: User,
    match: (p: string) => p.startsWith("/profile"),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[6500] border-t border-gray-100 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/95"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="主导航"
    >
      {/* 触屏 Tab：最小点击高度 ≥44px（Apple HIG），h-16 + py 留白 */}
      <div className="mx-auto flex min-h-16 max-w-lg items-stretch justify-around gap-0.5 px-1 py-1 sm:px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[3rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[11px] transition-colors active:bg-gray-100/80 dark:active:bg-white/10 sm:gap-1 sm:text-xs",
                loginFocusRing("rounded-xl"),
                active
                  ? "font-semibold text-[#1E90FF] dark:text-[#4da3ff]"
                  : "text-gray-400 dark:text-zinc-500"
              )}
            >
              <Icon
                className="size-[22px] shrink-0 sm:size-6"
                strokeWidth={active ? 2.5 : 2}
                aria-hidden
              />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
