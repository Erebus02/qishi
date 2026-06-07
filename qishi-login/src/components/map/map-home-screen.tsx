"use client";

import { MapPin, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_MAP_CENTER,
  FALLBACK_FISHING_SPOTS,
  type FishingSpot,
} from "@/lib/geo/fishing-spots";
import { formatDistanceKm } from "@/lib/geo/haversine";
import {
  filterSpotsByQuery,
  sortSpotsByDistanceFrom,
} from "@/lib/geo/spot-search";
import { fetchSpotsPayloadClient } from "@/lib/geo/spots-api";
import { useUserLocation } from "@/lib/geo/use-user-location";
import { FavoriteSpotButton } from "@/components/spots/favorite-spot-button";
import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

import { HomeMap } from "./home-map";

const NEARBY_LIST_LIMIT = 8;

/**
 * 首页地图（mobile-first）
 * - 底层：Leaflet + OSM 栅格，已在 LeafletViewport 开启 touchZoom/dragging，手机双指缩放与拖动与原生地图一致。
 * - 导航「走高德/百度」由外链唤起（见 nav 页）；此处地图瓦片未接高德 JS（可按 PRD 替换为 AMap）。
 * - 浮层 bottom 统一使用 var(--qishi-bottom-safe)，避免被固定底栏挡住。
 */
export function MapHomeScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [showSpotCard, setShowSpotCard] = useState(true);
  const [draftQuery, setDraftQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  /** 先展示兜底列表，再在客户端替换为 API 数据 */
  const [spots, setSpots] = useState<FishingSpot[]>(FALLBACK_FISHING_SPOTS);
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);

  useEffect(() => {
    void fetchSpotsPayloadClient().then((p) => {
      setSpots(p.spots);
      setMapCenter(p.defaultCenter);
    });
  }, []);

  const geo = useUserLocation({ autoRequest: true });

  const origin = geo.position ?? mapCenter;

  const filteredSpots = useMemo(
    () => filterSpotsByQuery(spots, activeQuery),
    [activeQuery, spots]
  );

  const visibleSpotIds = useMemo(() => {
    const q = activeQuery.trim();
    if (!q) return null;
    return filteredSpots.map((s) => s.id);
  }, [activeQuery, filteredSpots]);

  const listRows = useMemo(() => {
    const sorted = sortSpotsByDistanceFrom(filteredSpots, origin).slice(
      0,
      NEARBY_LIST_LIMIT
    );
    return sorted.map(({ spot, distanceKm }) => ({
      id: spot.id,
      name: spot.name,
      distance: formatDistanceKm(distanceKm),
      fish: spot.fish ?? "",
      rating: spot.rating,
    }));
  }, [filteredSpots, origin]);

  const runSearch = useCallback(() => {
    setActiveQuery(draftQuery.trim());
  }, [draftQuery]);

  const sheetTitle = activeQuery.trim() ? "搜索结果" : "附近钓点";

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col bg-gray-100 dark:bg-zinc-900">
      <div className="absolute inset-0 z-0 min-h-0 [&_.leaflet-control-zoom]:mb-[calc(var(--qishi-bottom-safe)+4rem)] max-[428px]:[&_.leaflet-control-zoom]:mb-[calc(var(--qishi-bottom-safe)+5.5rem)]">
        <HomeMap
          spots={spots}
          userPosition={geo.position}
          geoStatus={geo.status}
          geoMessage={geo.message}
          visibleSpotIds={visibleSpotIds}
        />
      </div>

      <div className="absolute left-0 right-0 top-0 z-[600] px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 sm:pb-0 sm:pt-4">
        <form
          className="flex min-h-[48px] items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-lg dark:bg-zinc-900 dark:shadow-black/40 sm:px-4 sm:py-3"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch();
          }}
        >
          <Search size={20} className="shrink-0 text-gray-400" />
          <input
            type="search"
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder="搜索钓点、鱼种、地区"
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-gray-400 sm:text-sm"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
          />
          <button
            type="submit"
            className={cn(
              "min-h-[44px] shrink-0 px-2 text-sm font-medium text-[#1E90FF] dark:text-[#4da3ff]",
              loginFocusRing()
            )}
          >
            搜索
          </button>
        </form>
      </div>

      <div className="absolute right-3 z-[600] top-[calc(env(safe-area-inset-top)+4.25rem)] sm:right-4 sm:top-20">
        <button
          type="button"
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg active:scale-95 dark:bg-zinc-900 dark:active:bg-zinc-800",
            loginFocusRing()
          )}
          aria-label="钓点"
        >
          <MapPin size={20} className="text-[#1E90FF]" />
        </button>
      </div>

      {/* 主操作钮：窄屏略缩小，整体上移避开底栏与钓点卡片 */}
      <div className="absolute left-1/2 z-[600] -translate-x-1/2 bottom-[calc(var(--qishi-bottom-safe)+7.5rem)] max-[428px]:bottom-[calc(var(--qishi-bottom-safe)+6.25rem)]">
        <button
          type="button"
          onClick={() => setIsRecording(!isRecording)}
          className={cn(
            "flex flex-col items-center justify-center rounded-full text-white shadow-2xl transition-all active:scale-[0.98]",
            "h-[7.5rem] w-[7.5rem] max-[428px]:h-28 max-[428px]:w-28 sm:h-32 sm:w-32",
            isRecording ? "bg-[#FF4444]" : "bg-[#1E90FF]",
            loginFocusRing()
          )}
        >
          {isRecording ? (
            <>
              <div className="mb-1.5 h-9 w-9 rounded-sm border-[3px] border-white sm:mb-2 sm:h-10 sm:w-10 sm:border-4" />
              <span className="text-[11px] font-medium sm:text-xs">停止记录</span>
            </>
          ) : (
            <>
              <Plus className="size-10 stroke-[3] sm:size-12" />
              <span className="mt-1 text-[11px] font-medium sm:text-xs">开始作钓</span>
            </>
          )}
        </button>
      </div>

      {isRecording && (
        <div className="absolute left-3 right-3 z-[600] top-[calc(env(safe-area-inset-top)+4.25rem)] rounded-2xl bg-[#FF4444] p-3 text-white shadow-lg sm:left-4 sm:right-4 sm:top-20 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-xs opacity-90">正在记录作钓轨迹</p>
              <p className="text-2xl font-bold">00:15:32</p>
            </div>
            <div className="text-right">
              <p className="mb-1 text-xs opacity-90">已行驶</p>
              <p className="text-2xl font-bold">1.2km</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className={cn(
                "min-h-[44px] flex-1 rounded-lg bg-white/20 py-2 text-sm backdrop-blur-sm",
                loginFocusRing()
              )}
            >
              标记点位
            </button>
            <button
              type="button"
              className={cn(
                "min-h-[44px] flex-1 rounded-lg bg-white/20 py-2 text-sm backdrop-blur-sm",
                loginFocusRing()
              )}
            >
              添加照片
            </button>
          </div>
        </div>
      )}

      {showSpotCard && !isRecording && (
        <div className="absolute left-3 right-3 z-[600] bottom-[calc(var(--qishi-bottom-safe)+0.35rem)] max-[428px]:left-2 max-[428px]:right-2 sm:left-4 sm:right-4">
          <div className="overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-900 dark:shadow-black/40">
            <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-white/10">
              <h3 className="text-base font-bold">{sheetTitle}</h3>
              <button
                type="button"
                onClick={() => setShowSpotCard(false)}
                className={cn(loginFocusRing("rounded-md"))}
                aria-label="关闭"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="max-h-[min(14rem,40dvh)] overflow-y-auto overscroll-y-contain sm:max-h-56">
              {listRows.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-500">
                  没有匹配的钓点，试试其他关键词
                </p>
              ) : (
                listRows.map((spot) => (
                  <div
                    key={spot.id}
                    className="flex items-center justify-between border-b border-gray-50 p-4 last:border-b-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-zinc-800/80"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1 text-sm font-medium">{spot.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <MapPin size={12} />
                        <span>{spot.distance}</span>
                        <span>·</span>
                        <span>{spot.fish}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        {spot.rating != null ? (
                          <div className="flex items-center text-yellow-500">
                            <span className="mr-0.5 text-xs">★</span>
                            <span className="text-xs font-medium">{spot.rating}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                        <FavoriteSpotButton spotId={spot.id} size="sm" />
                      </div>
                      <Link
                        href={`/nav/${spot.id}?from=map`}
                        className={cn(
                          "inline-flex min-h-[36px] min-w-[3rem] items-center justify-center rounded-full bg-[#1E90FF] px-3 py-1.5 text-xs font-medium text-white active:bg-[#1873CC]",
                          loginFocusRing()
                        )}
                      >
                        导航
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Link
              href="/spots"
              className="block w-full border-t border-gray-100 py-3 text-center text-sm font-medium text-[#1E90FF] hover:bg-gray-50 dark:border-white/10 dark:hover:bg-zinc-800"
            >
              查看更多钓点
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
