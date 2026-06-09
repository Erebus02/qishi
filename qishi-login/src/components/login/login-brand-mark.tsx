"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

export function LoginBrandMark({ className }: { className?: string }) {
  const gid = useId().replace(/:/g, "");

  return (
    <div className={cn("flex shrink-0 flex-col items-center", className)} aria-hidden>
      <svg
        width={104}
        height={104}
        viewBox="0 0 80 80"
        className="h-[104px] w-[104px] drop-shadow-[0_18px_28px_rgba(30,105,230,0.28)]"
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

        <path
          fill="#ffffff"
          d="
            M 58 18
            C 68 26 70 42 62 52
            C 54 62 38 64 26 56
            C 14 48 12 32 22 22
            C 30 14 46 12 58 18
            Z
          "
        />

        <path fill="#ffffff" d="M 22 38 L 12 44 L 18 52 Z" />

        <circle cx={52} cy={28} r={2.8} fill="#246fe5" />
        <circle cx={52.7} cy={27.4} r={0.95} fill="#ffffff" />

        <path
          fill="none"
          stroke="#dff2ff"
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
