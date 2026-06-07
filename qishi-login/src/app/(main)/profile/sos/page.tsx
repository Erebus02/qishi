import type { Metadata } from "next";

import { ProfileSubPageShell } from "@/components/profile/profile-sub-page-shell";
import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "SOS 紧急求助 · 起势",
};

const HOTLINES = [
  { label: "报警 / 治安", tel: "110", note: "人身安全、刑事案件" },
  { label: "急救", tel: "120", note: "伤病急救" },
  { label: "火警", tel: "119", note: "火灾、抢险" },
  { label: "交通事故", tel: "122", note: "道路交通事故报警服务台" },
];

export default function ProfileSosPage() {
  return (
    <ProfileSubPageShell title="SOS 紧急求助">
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
          遇险时请优先拨打当地紧急号码；若手机无信号，可向他人求助或使用卫星通信设备。
        </p>
        <ul className="space-y-2">
          {HOTLINES.map((h) => (
            <li key={h.tel}>
              <a
                href={`tel:${h.tel}`}
                className={cn(
                  "flex flex-col rounded-xl border border-red-100 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/40",
                  loginFocusRing()
                )}
              >
                <span className="text-lg font-bold tabular-nums text-red-700 dark:text-red-300">
                  {h.tel}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                  {h.label}
                </span>
                <span className="mt-1 text-xs text-gray-600 dark:text-zinc-400">{h.note}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500 dark:text-zinc-500">
          水上遇险还可拨打全国统一水上搜救电话 <strong>12395</strong>（沿岸 / 海事管辖水域以当地公告为准）。
        </p>
      </div>
    </ProfileSubPageShell>
  );
}
