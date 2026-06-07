"use client";

import Link from "next/link";
import { Calendar, ChevronRight, Fish } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  aggregateStats,
  formatCatchSpeciesDisplay,
  loadFishingRecords,
  type FishingRecord,
} from "@/lib/records/fishing-record-storage";
import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

export function ProfileJournalContent() {
  const [records, setRecords] = useState<FishingRecord[]>([]);

  useEffect(() => {
    setRecords(loadFishingRecords());
  }, []);

  const stats = useMemo(() => aggregateStats(records), [records]);
  const recent = useMemo(() => records.slice(0, 8), [records]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
        <p className="mb-3 text-xs font-medium text-gray-500 dark:text-zinc-400">
          基于本机保存的作钓记录（与「记录」Tab 同源）
        </p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold tabular-nums text-[#1E90FF] dark:text-[#4da3ff]">
              {stats.trips}
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-400">出钓次数</div>
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-zinc-100">
              {stats.totalQty}
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-400">累计尾数</div>
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-zinc-100">
              {stats.totalKg < 10 ? stats.totalKg.toFixed(1) : Math.round(stats.totalKg)}
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-400">总重 (kg)</div>
          </div>
        </div>
      </div>

      <Link
        href="/records"
        className={cn(
          "flex items-center justify-between rounded-2xl bg-[#1E90FF] px-4 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-[#1873CC]",
          loginFocusRing()
        )}
      >
        <span>打开「记录」查看 / 新增</span>
        <ChevronRight className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
      </Link>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-zinc-300">
          最近记录
        </h2>
        {recent.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-400">
            暂无作钓记录，请到「记录」Tab 新增一条。
          </p>
        ) : (
          <ul className="space-y-2">
            {recent.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-gray-100 bg-white px-3 py-3 shadow-sm dark:border-white/10 dark:bg-zinc-900"
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
                  <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {formatDate(r.createdAt)}
                  {r.waterCategory ? (
                    <span className="rounded-full bg-[#1E90FF]/12 px-1.5 py-0 text-[10px] text-[#1E90FF] dark:bg-[#1E90FF]/20 dark:text-[#4da3ff]">
                      {r.waterCategory}
                    </span>
                  ) : null}
                </div>
                <p className="mb-2 line-clamp-2 text-sm font-medium text-gray-900 dark:text-zinc-100">
                  {r.location}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-zinc-400">
                  {r.catches.slice(0, 4).map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1">
                      <Fish className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      {formatCatchSpeciesDisplay(c)} ×{c.quantity}
                    </span>
                  ))}
                  {r.catches.length > 4 ? (
                    <span className="text-gray-400">…</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
