"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * 起势 App 图标（对齐图二）：圆角方形蓝渐变底；黑鱼沿弧形跃动（头偏右上、向左下回旋）；
 * 右下方白色鱼钩形高光收笔。
 */
export function LoginBrandMark({ className }: { className?: string }) {
  const gid = useId().replace(/:/g, "");

  return (
    <div className={cn("flex shrink-0 flex-col items-center", className)} aria-hidden>
      <svg
        width={96}
        height={96}
        viewBox="0 0 80 80"
        className="h-24 w-24 drop-shadow-lg drop-shadow-black/15 dark:drop-shadow-black/40"
      >
        <defs>
          <linearGradient
            id={`qishiLogoFace-${gid}`}
            x1={40}
            y1={8}
            x2={40}
            y2={72}
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5eb8ff" />
            <stop offset="1" stopColor="#1566d6" />
          </linearGradient>
        </defs>

        <rect width={80} height={80} rx={17} fill={`url(#qishiLogoFace-${gid})`} />

        {/* 鱼身：自上方向左回旋的环形剪影 */}
        <path
          fill="#0a0a0a"
          d="
            M 58 18
            C 68 26 70 42 62 52
            C 54 62 38 64 26 56
            C 14 48 12 32 22 22
            C 30 14 46 12 58 18
            Z
          "
        />

        {/* 左下尾鳍 */}
        <path fill="#0a0a0a" d="M 22 38 L 12 44 L 18 52 Z" />

        {/* 眼（白点）— 头侧偏上 */}
        <circle cx={52} cy={28} r={2.8} fill="#ffffff" />
        <circle cx={52.7} cy={27.4} r={0.95} fill="#0a0a0a" />

        {/* 右下鱼钩 / 水花高光 */}
        <path
          fill="none"
          stroke="#ffffff"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="
            M 56 48
            C 62 52 64 58 60 64
            C 56 68 50 66 48 60
          "
        />
        <path
          fill="none"
          stroke="#ffffff"
          strokeWidth={2}
          strokeLinecap="round"
          d="M 60 64 L 62 70"
        />
      </svg>
    </div>
  );
}
