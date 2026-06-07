"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  ChevronLeft,
  Clock,
  Heart,
  MapPin,
  MessageCircle,
  Mountain,
  Navigation as NavigationIcon,
  QrCode,
  Share2,
  TrendingUp,
  Users,
} from "lucide-react";

import type { ReturnTab } from "@/lib/navigation/return-tab";
import { returnHref } from "@/lib/navigation/return-tab";
import { FavoriteSpotButton } from "@/components/spots/favorite-spot-button";
import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

const fishTypes = [
  { name: "鲤鱼", icon: "🐟" },
  { name: "草鱼", icon: "🐟" },
  { name: "鲫鱼", icon: "🐟" },
];

const tags = ["钓竿", "钓椅", "鱼竿", "休闲"];

const infoCards = [
  { label: "月总时长", value: "21:35", unit: "小时", icon: Clock },
  { label: "最高海拔", value: "445", unit: "米", icon: Mountain },
  { label: "累计距离", value: "775", unit: "米", icon: TrendingUp },
  { label: "累计时间", value: "04:35", unit: "小时", icon: Clock },
];

export function SpotDetailView({
  spotId,
  spotName,
  returnTab,
}: {
  spotId: string;
  spotName: string;
  returnTab: ReturnTab;
}) {
  const backHref = returnHref(returnTab);
  const navQuery = `?from=${returnTab}`;

  return (
    <div className="flex h-dvh flex-col bg-white dark:bg-zinc-950">
      <div className="relative h-64 shrink-0 overflow-hidden bg-gradient-to-b from-gray-800 to-gray-600">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop"
            alt=""
            fill
            className="object-cover opacity-80"
            priority
            sizes="100vw"
          />
        </div>

        <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link
            href={backHref}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm",
              loginFocusRing()
            )}
            aria-label={returnTab === "map" ? "返回首页地图" : "返回上一页"}
          >
            <ChevronLeft size={24} className="text-white" />
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm",
                loginFocusRing()
              )}
              aria-label="分享"
            >
              <Share2 size={20} className="text-white" />
            </button>
            <FavoriteSpotButton
              spotId={spotId}
              variant="light"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
            />
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white/95 p-3 backdrop-blur-sm dark:bg-zinc-900/95">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-200">
              <Image
                src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=100&h=100&fit=crop"
                alt=""
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold">小建道</span>
                <span className="rounded bg-[#1E90FF] px-2 py-0.5 text-xs text-white">
                  Lv.8
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-zinc-400">
                粉丝 2.1k · 路书 15 · 动态 26
              </div>
            </div>
            <button
              type="button"
              className={cn(
                "shrink-0 rounded-full bg-[#1E90FF] px-4 py-1.5 text-sm text-white hover:bg-[#1873CC]",
                loginFocusRing()
              )}
            >
              + 关注
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-36">
        <div className="border-b border-gray-100 px-4 py-4 dark:border-white/10">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">{spotName}</h1>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-[#1E90FF] dark:bg-blue-950/50 dark:text-[#4da3ff]">
                  官网
                </span>
                <span className="text-xs text-gray-400">ID:{spotId}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-zinc-400">
                <div className="flex items-center gap-1">
                  <MapPin size={14} />
                  <span>0.5千米</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>1-12月</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp size={14} />
                  <span>月305次</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>77人</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-zinc-900",
                loginFocusRing()
              )}
              aria-label="二维码"
            >
              <QrCode size={20} className="text-gray-700 dark:text-zinc-200" />
            </button>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs text-[#1E90FF] dark:bg-blue-950/50 dark:text-[#4da3ff]"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4 text-gray-500 dark:text-zinc-400">
            <button
              type="button"
              className={cn("flex items-center gap-1 text-sm", loginFocusRing())}
            >
              <Heart size={16} />
              <span>12</span>
            </button>
            <button
              type="button"
              className={cn("flex items-center gap-1 text-sm", loginFocusRing())}
            >
              <MessageCircle size={16} />
              <span>3</span>
            </button>
          </div>
        </div>

        <div className="border-b border-gray-100 px-4 py-4 dark:border-white/10">
          <div className="rounded-2xl bg-gradient-to-br from-[#1E90FF] to-[#00BFFF] p-4 text-white">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">今日鱼情</h3>
              <div className="text-2xl font-bold">80%</div>
            </div>
            <div className="mb-3 h-2 rounded-full bg-white/20">
              <div className="h-2 w-[80%] rounded-full bg-white" />
            </div>
            <div className="text-xs opacity-90">鱼获</div>
          </div>
        </div>

        <div className="border-b border-gray-100 px-4 py-4 dark:border-white/10">
          <h3 className="mb-3 font-semibold">常见鱼种</h3>
          <div className="flex flex-wrap gap-3">
            {fishTypes.map((fish) => (
              <div
                key={fish.name}
                className="flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2 dark:bg-zinc-900"
              >
                <span className="text-2xl">{fish.icon}</span>
                <span className="text-sm">{fish.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-b border-gray-100 px-4 py-4 dark:border-white/10">
          <h3 className="mb-3 font-semibold">最佳时段</h3>
          <div className="rounded-2xl bg-orange-50 p-4 dark:bg-orange-950/30">
            <div className="flex items-center gap-2 text-orange-600">
              <Clock size={18} />
              <span className="text-sm font-medium">06:00-10:00</span>
            </div>
            <div className="mt-2 text-xs text-gray-600 dark:text-zinc-400">
              日出前后鱼口最好
            </div>
          </div>
        </div>

        <div className="border-b border-gray-100 px-4 py-4 dark:border-white/10">
          <div className="mb-3 flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200">
              <Image
                src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=100&h=100&fit=crop"
                alt=""
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">小建道</span>
                <span className="rounded bg-[#1E90FF] px-1.5 py-0.5 text-xs text-white">
                  Lv.8
                </span>
                <span className="text-xs text-[#1E90FF] dark:text-[#4da3ff]">推荐理由</span>
              </div>
              <div className="text-xs text-gray-400">来自 2025-04-20 10:30</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#1E90FF] dark:text-[#4da3ff]">🐟 鱼情</span>
              <span className="text-sm text-gray-600 dark:text-zinc-400">鱼获较多。</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#1E90FF] dark:text-[#4da3ff]">💺 钓位</span>
              <span className="text-sm text-gray-600 dark:text-zinc-400">位置优良。</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#1E90FF] dark:text-[#4da3ff]">
                📖 攻略点评 (23)
              </span>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-100 px-4 py-4 dark:border-white/10">
          <h3 className="mb-3 font-semibold">钓点信息</h3>
          <div className="grid grid-cols-2 gap-3">
            {infoCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-xl bg-gray-50 p-3 dark:bg-zinc-900">
                  <div className="mb-2 flex items-center gap-2 text-gray-500 dark:text-zinc-400">
                    <Icon size={16} />
                    <span className="text-xs">{card.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold">{card.value}</span>
                    <span className="text-xs text-gray-500">{card.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-4 py-4">
          <h3 className="mb-3 font-semibold">路线地图</h3>
          <div className="relative h-48 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 200">
              <path
                d="M 50 150 Q 100 100, 150 120 T 250 80"
                fill="none"
                stroke="#1E90FF"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="50" cy="150" r="6" fill="#00C853" />
              <circle cx="250" cy="80" r="6" fill="#FF4444" />
            </svg>
            <Link
              href={`/nav/${spotId}${navQuery}`}
              className={cn(
                "absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow-lg dark:bg-zinc-900",
                loginFocusRing()
              )}
            >
              <MapPin size={16} className="text-[#1E90FF]" />
              <span>路线导航</span>
            </Link>
          </div>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex gap-3 border-t border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-full bg-gray-100 py-3 font-medium text-gray-700 dark:bg-zinc-800 dark:text-zinc-200",
            loginFocusRing()
          )}
        >
          <MessageCircle size={20} />
          <span>找攻略</span>
        </button>
        <Link
          href={`/nav/${spotId}${navQuery}`}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-full bg-[#1E90FF] py-3 font-medium text-white hover:bg-[#1873CC]",
            loginFocusRing()
          )}
        >
          <NavigationIcon size={20} />
          <span>开始导航</span>
        </Link>
      </div>
    </div>
  );
}
