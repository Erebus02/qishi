"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  MapPin,
  Search,
  Share2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CHINA_PROVINCE_CITIES, type ProvinceRegion } from "@/lib/geo/china-regions";
import {
  FALLBACK_FISHING_SPOTS,
  type FishingSpot,
} from "@/lib/geo/fishing-spots";
import { fetchSpotsPayloadClient } from "@/lib/geo/spots-api";
import {
  buildAmapNavigationUrl,
  buildAppleMapsNavigateUrl,
  buildBaiduMapMarkerUrl,
  buildTencentMapsRouteUrl,
} from "@/lib/geo/external-map-nav-links";
import { openExternalMapUrl } from "@/lib/geo/open-external-map-url";
import { FavoriteSpotButton } from "@/components/spots/favorite-spot-button";
import { loginFocusRing } from "@/lib/login-styles";
import {
  aggregateSpotRatingsFromRecords,
  linkageCountsBySpotId,
  loadFishingRecords,
  type FishingRecord,
} from "@/lib/records/fishing-record-storage";
import {
  loadUserMarkedSpots,
  type UserMarkedSpot,
} from "@/lib/spots/user-marked-spots";
import { cn } from "@/lib/utils";

const tabs = ["附近钓点", "水库", "湖泊", "江河", "黑坑"] as const;
const LIST_RENDER_LIMIT = 120;

type RegionChoice =
  | { scope: "nation" }
  | { scope: "province"; province: string }
  | { scope: "city"; province: string; city: string };

function regionTriggerLabel(r: RegionChoice): string {
  if (r.scope === "nation") return "全国";
  if (r.scope === "province") return r.province;
  return `${r.province} ${r.city}`;
}

function spotMatchesRegion(
  province: string,
  city: string,
  r: RegionChoice
): boolean {
  if (r.scope === "nation") return true;
  if (r.scope === "province") return province === r.province;
  return province === r.province && city === r.city;
}

/** 钓点列表行（平台 + 钓友标记）；水域分类与作钓记录、后台一致 */
type SpotListItem = {
  id: string;
  name: string;
  type: string;
  waterCategory?: string;
  distance: string;
  rating: number | null;
  price: string | null;
  tags: string[];
  image: string;
  province: string;
  city: string;
  isUserMarked?: boolean;
  linkRecordCount?: number;
  ratingSampleCount?: number;
};

const spots: SpotListItem[] = [
  {
    id: "1",
    name: "老歌水库",
    type: "水库",
    waterCategory: "水库",
    distance: "15.6km",
    rating: null as number | null,
    price: "免费",
    tags: [] as string[],
    image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=200&h=150&fit=crop",
    province: "湖北省",
    city: "武汉市",
  },
  {
    id: "2",
    name: "野河湾",
    type: "江河",
    waterCategory: "江河",
    distance: "6.3km",
    rating: 3.93,
    price: null as string | null,
    tags: ["难度", "收费", "停车"],
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=150&fit=crop",
    province: "湖北省",
    city: "宜昌市",
  },
  {
    id: "3",
    name: "渔乐钓场",
    type: "水库",
    waterCategory: "黑坑",
    distance: "12.1km",
    rating: null,
    price: "¥80/天",
    tags: ["难度", "收费"],
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=200&h=150&fit=crop",
    province: "湖北省",
    city: "武汉市",
  },
  {
    id: "4",
    name: "青龙湖",
    type: "湖泊",
    waterCategory: "湖泊",
    distance: "16.7km",
    rating: 4.13,
    price: null,
    tags: ["难度", "收费", "停车", "服务"],
    image: "https://images.unsplash.com/photo-1534188753412-5702d0f3eff9?w=200&h=150&fit=crop",
    province: "江苏省",
    city: "南京市",
  },
];

const USER_SPOT_LIST_IMAGE =
  "https://images.unsplash.com/photo-149378703840-e5412fc24978?w=200&h=150&fit=crop";
const PLATFORM_SPOT_LIST_IMAGE =
  "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=200&h=150&fit=crop";

function inferProvinceCity(region?: string): { province: string; city: string } {
  const text = region ?? "";
  for (const province of CHINA_PROVINCE_CITIES) {
    if (text.includes(province.name)) {
      const city = province.cities.find((item) => text.includes(item));
      return { province: province.name, city: city ?? province.cities[0] ?? "" };
    }
    const city = province.cities.find((item) => text.includes(item));
    if (city) return { province: province.name, city };
  }
  return { province: "湖北省", city: "武汉市" };
}

function platformSpotToListItem(spot: FishingSpot): SpotListItem {
  const inferred = inferProvinceCity(spot.region);
  return {
    id: spot.id,
    name: spot.name,
    type: spot.waterCategory ?? "钓点",
    waterCategory: spot.waterCategory,
    distance: spot.distanceLabel ?? "—",
    rating: spot.rating ?? null,
    price: null,
    tags: spot.fish
      ? spot.fish
          .split(/[、,，\s]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
    image: PLATFORM_SPOT_LIST_IMAGE,
    province: inferred.province,
    city: inferred.city,
  };
}

function buildSpotPageUrl(spotId: string): string {
  if (typeof window === "undefined") {
    return spotId.startsWith("u-") ? "/spots" : `/spot/${spotId}?from=spots`;
  }
  const origin = window.location.origin;
  if (spotId.startsWith("u-")) {
    return `${origin}/spots`;
  }
  return `${origin}/spot/${spotId}?from=spots`;
}

function resolveSpotNavCoords(
  spot: SpotListItem,
  userSpots: UserMarkedSpot[],
  platformCoords: Map<string, { lat: number; lng: number }>
): { lat: number; lng: number } | null {
  if (spot.isUserMarked) {
    const u = userSpots.find((s) => s.id === spot.id);
    if (!u) return null;
    return { lat: u.lat, lng: u.lng };
  }
  const c = platformCoords.get(spot.id);
  if (!c) return null;
  return c;
}

export function SpotsView() {
  const [activeTab, setActiveTab] = useState<string>(tabs[0]);
  const [region, setRegion] = useState<RegionChoice>({ scope: "nation" });
  const [regionOpen, setRegionOpen] = useState(false);
  const [pickerProvince, setPickerProvince] = useState<string | null>(null);
  const [sharingSpot, setSharingSpot] = useState<SpotListItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  /** 避免 SSR 与客户端对 navigator 判断不一致导致 hydration 警告 */
  const [isIosClient, setIsIosClient] = useState(false);

  const [userSpots, setUserSpots] = useState<UserMarkedSpot[]>([]);
  const [fishingRecords, setFishingRecords] = useState<FishingRecord[]>([]);
  const [platformSpots, setPlatformSpots] = useState<FishingSpot[]>(
    FALLBACK_FISHING_SPOTS
  );

  const platformCoords = useMemo(
    () =>
      new Map(
        platformSpots.map((s) => [s.id, { lat: s.lat, lng: s.lng }] as const)
      ),
    [platformSpots]
  );

  const showToast = useCallback((msg: string) => setToast(msg), []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const refreshUserSpots = useCallback(() => {
    setUserSpots(loadUserMarkedSpots());
  }, []);

  useEffect(() => {
    refreshUserSpots();
    setFishingRecords(loadFishingRecords());
  }, [refreshUserSpots]);

  useEffect(() => {
    setIsIosClient(/iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    void fetchSpotsPayloadClient().then((p) => setPlatformSpots(p.spots));
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        refreshUserSpots();
        setFishingRecords(loadFishingRecords());
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refreshUserSpots]);

  const shareToWeChatFriend = useCallback(
    async (spot: SpotListItem) => {
      const url = buildSpotPageUrl(spot.id);
      const text = `推荐钓点：${spot.name}`;
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: spot.name,
            text,
            url,
          });
          setSharingSpot(null);
          return;
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        showToast("已复制到剪贴板，打开微信粘贴发送给好友");
        setSharingSpot(null);
      } catch {
        showToast("无法访问剪贴板，请长按链接手动复制");
      }
    },
    [showToast]
  );

  const shareToWeChatMoments = useCallback(
    async (spot: SpotListItem) => {
      const url = buildSpotPageUrl(spot.id);
      const line = `${spot.name}｜${spot.type} ${spot.distance}\n${url}`;
      try {
        await navigator.clipboard.writeText(line);
        showToast("已复制，打开微信 → 发现 → 朋友圈，粘贴即可发布");
        setSharingSpot(null);
      } catch {
        showToast("无法复制，请稍后重试");
      }
    },
    [showToast]
  );

  const copySpotLinkOnly = useCallback(
    async (spot: SpotListItem) => {
      const url = buildSpotPageUrl(spot.id);
      try {
        await navigator.clipboard.writeText(url);
        showToast("链接已复制");
        setSharingSpot(null);
      } catch {
        showToast("复制失败");
      }
    },
    [showToast]
  );

  const sharingNavPoint = useMemo(() => {
    if (!sharingSpot) return null;
    return resolveSpotNavCoords(sharingSpot, userSpots, platformCoords);
  }, [sharingSpot, userSpots, platformCoords]);

  const catalogSpotRows = useMemo((): SpotListItem[] => {
    const rows = platformSpots.map(platformSpotToListItem);
    return rows.length > 0 ? rows : spots;
  }, [platformSpots]);

  const filteredSpots = useMemo(
    () =>
      catalogSpotRows.filter((s) =>
        spotMatchesRegion(s.province, s.city, region)
      ),
    [catalogSpotRows, region]
  );

  const userSpotRows = useMemo((): SpotListItem[] => {
    const agg = aggregateSpotRatingsFromRecords(fishingRecords);
    const links = linkageCountsBySpotId(fishingRecords);
    return userSpots.map((u) => {
      const rated = agg[u.id];
      const linkCount = links[u.id] ?? 0;
      const tags: string[] = [];
      if (rated && rated.count > 0) {
        tags.push(`均分来自 ${rated.count} 次作钓评分`);
      }
      return {
        id: u.id,
        name: u.name,
        type: u.waterCategory ?? "钓友标记",
        waterCategory: u.waterCategory,
        distance: "—",
        rating:
          rated && rated.count > 0
            ? Math.round(rated.avg * 10) / 10
            : null,
        ratingSampleCount: rated?.count ?? 0,
        linkRecordCount: linkCount,
        price: u.feeNote?.trim() || null,
        tags,
        image: USER_SPOT_LIST_IMAGE,
        province: "湖北省",
        city: "武汉市",
        isUserMarked: true,
      };
    });
  }, [userSpots, fishingRecords]);

  const platformSpotRows = useMemo((): SpotListItem[] => {
    const agg = aggregateSpotRatingsFromRecords(fishingRecords);
    const links = linkageCountsBySpotId(fishingRecords);
    return filteredSpots.map((s) => {
      const rated = agg[s.id];
      const linkCount = links[s.id] ?? 0;
      const tags = [...s.tags];
      if (rated && rated.count > 0) {
        tags.unshift(`均分来自 ${rated.count} 次作钓评分`);
      }
      return {
        ...s,
        rating:
          rated && rated.count > 0
            ? Math.round(rated.avg * 10) / 10
            : null,
        ratingSampleCount: rated?.count ?? 0,
        linkRecordCount: linkCount,
        tags,
      };
    });
  }, [filteredSpots, fishingRecords]);

  const combinedSpots = useMemo(
    () => [...userSpotRows, ...platformSpotRows],
    [userSpotRows, platformSpotRows]
  );

  const visibleSpots = useMemo(() => {
    if (activeTab === tabs[0]) return combinedSpots;
    return combinedSpots.filter((s) => {
      const cat = s.waterCategory ?? s.type;
      return cat === activeTab;
    });
  }, [combinedSpots, activeTab]);

  const renderedSpots = useMemo(
    () => visibleSpots.slice(0, LIST_RENDER_LIMIT),
    [visibleSpots]
  );

  const openPicker = useCallback(() => {
    setPickerProvince(
      region.scope === "nation" ? null : region.province
    );
    setRegionOpen(true);
  }, [region]);

  const closePicker = useCallback(() => setRegionOpen(false), []);

  useEffect(() => {
    if (!regionOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePicker();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [regionOpen, closePicker]);

  const rightColumnProvince: ProvinceRegion | null = useMemo(() => {
    if (!pickerProvince) return null;
    return CHINA_PROVINCE_CITIES.find((p) => p.name === pickerProvince) ?? null;
  }, [pickerProvince]);

  const wholeRegionLabel = (p: ProvinceRegion) =>
    p.municipality ? "全市" : "全省";

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="shrink-0 text-lg font-bold">钓点</h1>
          <button
            type="button"
            aria-expanded={regionOpen}
            aria-haspopup="dialog"
            onClick={() => (regionOpen ? closePicker() : openPicker())}
            className={cn(
              "flex min-w-0 max-w-[55%] items-center gap-0.5 text-sm text-gray-600 dark:text-zinc-400",
              loginFocusRing()
            )}
          >
            <span className="truncate">{regionTriggerLabel(region)}</span>
            <ChevronDown
              size={14}
              className={cn(
                "shrink-0 transition-transform",
                regionOpen && "rotate-180"
              )}
              aria-hidden
            />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className={cn("p-1.5", loginFocusRing("rounded-md"))}
            aria-label="地图定位"
          >
            <MapPin size={20} className="text-[#1E90FF]" />
          </button>
        </div>
      </div>

      <div className="relative px-4 pb-2">
        <div className="flex items-center rounded-lg bg-gray-100 px-3 py-2 dark:bg-zinc-900">
          <Search size={16} className="text-gray-400" />
          <input
            type="search"
            placeholder="搜索钓场名称钓点"
            className="ml-2 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 dark:text-zinc-100"
          />
        </div>
        <Link
          href="/map"
          className={cn(
            "absolute right-6 top-1/2 -translate-y-1/2 text-sm text-[#1E90FF] dark:text-[#4da3ff]",
            loginFocusRing()
          )}
        >
          地图模式
        </Link>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto border-b border-gray-100 px-4 py-2 dark:border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1 text-sm transition-colors",
              activeTab === tab
                ? "bg-[#1E90FF] text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-900",
              loginFocusRing()
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {regionOpen ? (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 p-0"
          role="presentation"
          onClick={closePicker}
        >
          <div
            role="dialog"
            aria-label="选择地区"
            className="max-h-[min(72vh,520px)] overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-100 px-4 py-3 text-center text-sm font-medium text-slate-800 dark:border-white/10 dark:text-zinc-100">
              选择地区
            </div>
            <div className="flex min-h-[220px] max-h-[min(60vh,440px)]">
              <div className="w-[42%] shrink-0 overflow-y-auto border-r border-gray-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setRegion({ scope: "nation" });
                    closePicker();
                  }}
                  className={cn(
                    "w-full px-3 py-2.5 text-left text-sm transition-colors",
                    pickerProvince === null
                      ? "bg-blue-50 font-medium text-[#1E90FF] dark:bg-blue-950/40 dark:text-[#4da3ff]"
                      : "text-gray-700 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-800",
                    loginFocusRing()
                  )}
                >
                  全国
                </button>
                {CHINA_PROVINCE_CITIES.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setPickerProvince(p.name)}
                    className={cn(
                      "w-full px-3 py-2.5 text-left text-sm transition-colors",
                      pickerProvince === p.name
                        ? "bg-blue-50 font-medium text-[#1E90FF] dark:bg-blue-950/40 dark:text-[#4da3ff]"
                        : "text-gray-700 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-800",
                      loginFocusRing()
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="min-w-0 flex-1 overflow-y-auto">
                {!rightColumnProvince ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-zinc-500">
                    请先选择省份
                    <br />
                    <span className="text-xs opacity-80">或点「全国」查看全部</span>
                  </p>
                ) : (
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRegion({
                          scope: "province",
                          province: rightColumnProvince.name,
                        });
                        closePicker();
                      }}
                      className={cn(
                        "w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-zinc-200 dark:hover:bg-zinc-800",
                        loginFocusRing()
                      )}
                    >
                      {wholeRegionLabel(rightColumnProvince)}
                    </button>
                    {rightColumnProvince.cities.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setRegion({
                            scope: "city",
                            province: rightColumnProvince.name,
                            city,
                          });
                          closePicker();
                        }}
                        className={cn(
                          "w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-zinc-200 dark:hover:bg-zinc-800",
                          loginFocusRing()
                        )}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto pb-24">
        {visibleSpots.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-zinc-500">
            {activeTab === tabs[0]
              ? "当前地区暂无钓点，请更换省/市或选择「全国」"
              : `当前筛选下暂无「${activeTab}」类钓点`}
          </p>
        ) : null}
        {visibleSpots.length > renderedSpots.length ? (
          <p className="px-4 pb-1 pt-3 text-xs text-gray-500 dark:text-zinc-500">
            已从 {visibleSpots.length} 个结果中优先显示前 {renderedSpots.length} 个，请选择省市或搜索关键词进一步缩小范围。
          </p>
        ) : null}
        {renderedSpots.map((spot) => (
          <div
            key={spot.id}
            className="flex gap-3 border-b border-gray-100 p-4 dark:border-white/10"
          >
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-zinc-900">
              <Image
                src={spot.image}
                alt={spot.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-base font-semibold">{spot.name}</h3>
              <div className="mb-2 flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  {spot.linkRecordCount != null && spot.linkRecordCount > 0 ? (
                    <span className="text-[11px] font-medium text-[#1E90FF] dark:text-[#4da3ff]">
                      {spot.linkRecordCount} 条作钓记录已关联
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                      暂无作钓记录关联
                    </span>
                  )}
                  <span className="text-xs text-gray-500">{spot.type}</span>
                  <span className="text-xs text-gray-400">{spot.distance}</span>
                </div>
                {spot.rating != null &&
                (spot.ratingSampleCount ?? 0) > 0 ? (
                  <div className="flex flex-wrap items-center gap-1 text-yellow-500">
                    <span className="text-xs">★</span>
                    <span className="text-xs font-semibold tabular-nums">
                      {spot.rating}
                    </span>
                    <span className="text-[10px] font-normal text-gray-600 dark:text-zinc-400">
                      钓友均分（{spot.ratingSampleCount} 次评分）
                    </span>
                  </div>
                ) : spot.linkRecordCount != null && spot.linkRecordCount > 0 ? (
                  <span className="text-[10px] text-gray-500 dark:text-zinc-400">
                    关联记录中尚无打分；在作钓记录里为该点打分后即显示均分
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {spot.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
                {spot.price && (
                  <span className="text-xs font-medium text-[#FF4444]">
                    {spot.price}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <FavoriteSpotButton spotId={spot.id} size="sm" />
              {!spot.isUserMarked ? (
                <Link
                  href={`/nav/${spot.id}?from=spots`}
                  className={cn(
                    "rounded-full border border-[#1E90FF] bg-white px-2.5 py-0.5 text-xs font-medium text-[#1E90FF] hover:bg-blue-50 dark:bg-zinc-950 dark:hover:bg-zinc-900",
                    loginFocusRing()
                  )}
                >
                  路线
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setSharingSpot(spot)}
                className={cn(
                  "flex items-center gap-1 rounded bg-[#1E90FF] px-3 py-1 text-xs text-white hover:bg-[#1873CC]",
                  loginFocusRing()
                )}
              >
                <Share2 size={12} aria-hidden />
                分享
              </button>
            </div>
          </div>
        ))}
      </div>

      {sharingSpot ? (
        <div
          className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40"
          role="presentation"
          onClick={() => setSharingSpot(null)}
        >
          <div
            role="dialog"
            aria-label="分享与导航"
            className="rounded-t-2xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-center text-sm font-medium text-slate-800 dark:text-zinc-100">
              分享与导航「{sharingSpot.name}」
            </p>
            {sharingNavPoint ? (
              <div className="mb-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-zinc-950/50">
                <p className="mb-1 text-xs font-semibold text-gray-800 dark:text-zinc-100">
                  用地图导航
                </p>
                <p className="mb-2 text-[10px] leading-relaxed text-gray-500 dark:text-zinc-400">
                  坐标为 GCJ-02（国测）。微信 / QQ 内会整页跳转地图网站；百度为「标点」页（官方路线接口须填起点），进入后可再导航。
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      openExternalMapUrl(
                        buildAmapNavigationUrl(
                          sharingNavPoint.lat,
                          sharingNavPoint.lng,
                          sharingSpot.name
                        )
                      )
                    }
                    className={cn(
                      "rounded-lg border border-[#00A0E9]/50 bg-sky-50 py-2.5 text-sm font-medium text-[#0091d4] hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-950/70",
                      loginFocusRing()
                    )}
                  >
                    高德地图
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openExternalMapUrl(
                        buildTencentMapsRouteUrl(
                          sharingNavPoint.lat,
                          sharingNavPoint.lng,
                          sharingSpot.name
                        )
                      )
                    }
                    className={cn(
                      "rounded-lg border border-emerald-600/40 bg-emerald-50 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/70",
                      loginFocusRing()
                    )}
                  >
                    腾讯地图
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openExternalMapUrl(
                        buildBaiduMapMarkerUrl(
                          sharingNavPoint.lat,
                          sharingNavPoint.lng,
                          sharingSpot.name
                        )
                      )
                    }
                    className={cn(
                      "rounded-lg border border-[#3385ff]/50 bg-blue-50 py-2.5 text-sm font-medium text-[#2b78ff] hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70",
                      loginFocusRing()
                    )}
                  >
                    百度地图（标点）
                  </button>
                  {isIosClient ? (
                    <button
                      type="button"
                      onClick={() =>
                        openExternalMapUrl(
                          buildAppleMapsNavigateUrl(
                            sharingNavPoint.lat,
                            sharingNavPoint.lng,
                            sharingSpot.name
                          )
                        )
                      }
                      className={cn(
                        "rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-white/20 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
                        loginFocusRing()
                      )}
                    >
                      苹果地图
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mb-3 rounded-lg bg-amber-50 px-2 py-2 text-center text-[11px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                该钓点暂无可用坐标，无法一键打开地图导航
              </p>
            )}
            <p className="mb-3 text-center text-xs text-gray-500 dark:text-zinc-500">
              微信内可直接用系统分享；或复制后到微信 / 朋友圈粘贴
            </p>
            <div className="flex flex-col gap-2 pb-2">
              <button
                type="button"
                onClick={() => void shareToWeChatFriend(sharingSpot)}
                className={cn(
                  "rounded-lg bg-[#07C160] py-2.5 text-sm font-medium text-white hover:bg-[#06ad56]",
                  loginFocusRing()
                )}
              >
                微信好友
              </button>
              <button
                type="button"
                onClick={() => void shareToWeChatMoments(sharingSpot)}
                className={cn(
                  "rounded-lg border border-[#07C160] bg-white py-2.5 text-sm font-medium text-[#07C160] hover:bg-green-50 dark:bg-zinc-900 dark:hover:bg-zinc-800",
                  loginFocusRing()
                )}
              >
                朋友圈
              </button>
              <button
                type="button"
                onClick={() => void copySpotLinkOnly(sharingSpot)}
                className={cn(
                  "rounded-lg border border-gray-200 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-zinc-800",
                  loginFocusRing()
                )}
              >
                仅复制链接
              </button>
            </div>
            {!sharingSpot.id.startsWith("u-") ? (
              <Link
                href={`/spot/${sharingSpot.id}?from=spots`}
                onClick={() => setSharingSpot(null)}
                className={cn(
                  "mb-2 block py-2 text-center text-xs text-[#1E90FF] dark:text-[#4da3ff]",
                  loginFocusRing()
                )}
              >
                查看钓点详情
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          role="status"
          className="pointer-events-none fixed bottom-24 left-1/2 z-[70] max-w-[min(90vw,20rem)] -translate-x-1/2 rounded-lg bg-slate-900/92 px-4 py-2.5 text-center text-xs text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
