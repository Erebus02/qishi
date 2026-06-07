import type { Metadata } from "next";

import { ProfileSubPageShell } from "@/components/profile/profile-sub-page-shell";

export const metadata: Metadata = {
  title: "关于起势 · 起势",
};

export default function ProfileAboutPage() {
  return (
    <ProfileSubPageShell title="关于起势">
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1E90FF] text-2xl font-bold text-white shadow-lg">
          起
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-50">起势</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">极简钓鱼助手，无网也能钓</p>
          <p className="mt-2 text-xs tabular-nums text-gray-400 dark:text-zinc-500">版本 1.0.0</p>
        </div>
        <p className="text-left text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
          起势面向钓友提供钓点浏览、作钓记录、工具箱与离线友好体验。地图与第三方服务仅用于导航与展示，请遵守当地渔业法规与水域管理规定。
        </p>
        <p className="text-xs text-gray-400 dark:text-zinc-600">
          © {new Date().getFullYear()} 起势 · 本项目为演示 / 开发版本
        </p>
      </div>
    </ProfileSubPageShell>
  );
}
