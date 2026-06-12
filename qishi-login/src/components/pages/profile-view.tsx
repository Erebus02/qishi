"use client";

import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ChevronRight,
  FileText,
  Heart,
  HelpCircle,
  Info,
  MapPin,
  Settings,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { aggregateStats, loadFishingRecords } from "@/lib/records/fishing-record-storage";
import { loadAuthSession, type AuthSession } from "@/lib/auth/client-session";
import {
  FAVORITES_CHANGED_EVENT,
  loadFavoriteSpotIds,
} from "@/lib/profile/favorite-spots-storage";
import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

export function ProfileView() {
  const [tripCount, setTripCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const records = loadFishingRecords();
    setTripCount(aggregateStats(records).trips);
    setFavoriteCount(loadFavoriteSpotIds().length);
    setSession(loadAuthSession());
  }, []);

  useEffect(() => {
    const syncFav = () => setFavoriteCount(loadFavoriteSpotIds().length);
    window.addEventListener(FAVORITES_CHANGED_EVENT, syncFav);
    return () => window.removeEventListener(FAVORITES_CHANGED_EVENT, syncFav);
  }, []);

  const userStats: { label: string; value: string; hint?: string }[] = useMemo(
    () => [
      { label: "出钓次数", value: String(tripCount) },
      { label: "记录轨迹", value: "—", hint: "轨迹回放开发中" },
      { label: "收藏钓点", value: String(favoriteCount) },
    ],
    [tripCount, favoriteCount]
  );

  const displayName =
    session?.user.nickname ??
    session?.user.label ??
    session?.user.phoneMasked ??
    session?.user.accountMasked ??
    "钓鱼爱好者";
  const displayId =
    session?.user.loginType === "wechat"
      ? "微信登录"
      : session?.user.phoneMasked ?? session?.user.accountMasked ?? "ID: 1234567";
  const avatarUrl =
    session?.user.avatarUrl ??
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=200&h=200&fit=crop";

  const sections: {
    title: string;
    items: {
      icon: LucideIcon;
      label: string;
      href: string;
      count: number | null;
      color: string;
    }[];
  }[] = [
    {
      title: "我的内容",
      items: [
        {
          icon: FileText,
          label: "我的作钓日志",
          href: "/profile/journal",
          count: tripCount,
          color: "text-blue-500",
        },
        {
          icon: MapPin,
          label: "我的轨迹",
          href: "/profile/tracks",
          count: null,
          color: "text-green-500",
        },
        {
          icon: Heart,
          label: "收藏的钓点",
          href: "/profile/favorites",
          count: favoriteCount,
          color: "text-red-500",
        },
      ],
    },
    {
      title: "设置与帮助",
      items: [
        {
          icon: AlertCircle,
          label: "SOS紧急求助",
          href: "/profile/sos",
          count: null,
          color: "text-orange-500",
        },
        {
          icon: Settings,
          label: "设置",
          href: "/profile/settings",
          count: null,
          color: "text-gray-500",
        },
        {
          icon: HelpCircle,
          label: "帮助与反馈",
          href: "/profile/help",
          count: null,
          color: "text-purple-500",
        },
        {
          icon: Info,
          label: "关于起势",
          href: "/profile/about",
          count: null,
          color: "text-cyan-500",
        },
      ],
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50 dark:bg-zinc-950">
      <div className="min-h-0 flex-1 overflow-y-auto pb-24">
        <div className="bg-gradient-to-br from-[#1E90FF] to-[#00BFFF] px-6 pb-8 pt-12 text-white">
          <div className="mb-6 flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-white bg-white/20 backdrop-blur-sm">
              <Image
                src={avatarUrl}
                alt={displayName}
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
            <div>
              <h2 className="mb-1 text-2xl font-bold">{displayName}</h2>
              <p className="text-sm opacity-90">{displayId}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
            {userStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="mb-1 text-2xl font-bold tabular-nums">{stat.value}</div>
                <div className="text-xs opacity-90">{stat.label}</div>
                {stat.hint ? (
                  <div className="mt-0.5 text-[10px] opacity-75">{stat.hint}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 px-4 pt-4">
          {sections.map((section) => (
            <div
              key={section.title}
              className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-zinc-900"
            >
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-zinc-950/80">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
                  {section.title}
                </h3>
              </div>
              <div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex w-full items-center justify-between border-b border-gray-50 px-4 py-4 transition-colors last:border-b-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-zinc-800/80",
                        loginFocusRing()
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={22} className={item.color} aria-hidden />
                        <span className="text-base">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {item.count !== null ? (
                          <span className="text-sm tabular-nums text-gray-400">{item.count}</span>
                        ) : null}
                        <ChevronRight size={20} className="text-gray-300" aria-hidden />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 px-4 py-6">
          <p className="text-xs text-gray-400">起势 v1.0.0</p>
          <p className="text-xs text-gray-400">极简钓鱼助手，无网也能钓</p>
          <Link
            href="/login"
            className={cn(
              "text-sm text-[#1E90FF] underline-offset-4 hover:underline dark:text-[#4da3ff]",
              loginFocusRing("rounded-md px-2 py-1")
            )}
          >
            切换账号 / 退出
          </Link>
        </div>
      </div>
    </div>
  );
}
