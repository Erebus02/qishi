"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { FALLBACK_FISHING_SPOTS } from "@/lib/geo/fishing-spots";
import { fetchSpotsPayloadClient } from "@/lib/geo/spots-api";
import {
  FAVORITES_CHANGED_EVENT,
  loadFavoriteSpotIds,
} from "@/lib/profile/favorite-spots-storage";
import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

export function ProfileFavoritesContent() {
  const [ids, setIds] = useState<string[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  const refresh = useCallback(() => {
    setIds(loadFavoriteSpotIds());
  }, []);

  useEffect(() => {
    refresh();
    void fetchSpotsPayloadClient().then((p) => {
      const m: Record<string, string> = {};
      for (const s of p.spots) m[s.id] = s.name;
      for (const s of FALLBACK_FISHING_SPOTS) if (!m[s.id]) m[s.id] = s.name;
      setNames(m);
    });
  }, [refresh]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener(FAVORITES_CHANGED_EVENT, refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
        收藏的钓点保存在本机。在「钓点」列表、「首页地图」附近列表或钓点详情页点击心形即可收藏 / 取消。
      </p>

      {ids.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center dark:border-white/15 dark:bg-zinc-900">
          <Heart className="mb-3 h-12 w-12 text-gray-300 dark:text-zinc-600" aria-hidden />
          <p className="mb-4 text-sm text-gray-500 dark:text-zinc-400">
            暂无收藏，快去钓点页逛逛吧。
          </p>
          <Link
            href="/spots"
            className={cn(
              "rounded-full bg-[#1E90FF] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1873CC]",
              loginFocusRing()
            )}
          >
            前往钓点
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {ids.map((id) => (
            <li key={id}>
              <Link
                href={`/spot/${encodeURIComponent(id)}?from=profile`}
                className={cn(
                  "flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-zinc-900",
                  loginFocusRing()
                )}
              >
                <span className="font-medium text-gray-900 dark:text-zinc-100">
                  {names[id] ?? `钓点 ${id}`}
                </span>
                <Heart className="h-4 w-4 shrink-0 fill-red-500 text-red-500" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
