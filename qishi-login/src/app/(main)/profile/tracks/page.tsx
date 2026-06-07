import type { Metadata } from "next";
import Link from "next/link";

import { ProfileSubPageShell } from "@/components/profile/profile-sub-page-shell";
import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "我的轨迹 · 起势",
};

export default function ProfileTracksPage() {
  return (
    <ProfileSubPageShell title="我的轨迹">
      <div className="space-y-4 text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
        <p>
          连续 GPS 轨迹记录与回放正在规划中。当前您可以通过「记录」Tab
          保存每次作钓的位置文字说明与关联钓点。
        </p>
        <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          野外作业请注意安全，恶劣天气勿强行出钓。
        </div>
        <Link
          href="/records"
          className={cn(
            "inline-flex rounded-xl bg-[#1E90FF] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1873CC]",
            loginFocusRing()
          )}
        >
          去作钓记录
        </Link>
      </div>
    </ProfileSubPageShell>
  );
}
