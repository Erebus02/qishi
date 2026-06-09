"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";

import {
  DEFAULT_MAP_CENTER,
  type FishingSpot,
} from "@/lib/geo/fishing-spots";
import {
  straightLineRoute,
  type LatLng,
} from "@/lib/geo/osrm-route";
import { fetchSpotByIdClient } from "@/lib/geo/spots-api";
import { useUserLocation } from "@/lib/geo/use-user-location";

import type { ReturnTab } from "@/lib/navigation/return-tab";
import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

import { LeafletViewport, type MapMarkerSpec } from "./leaflet-viewport";

type RouteState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; points: LatLng[]; source: "straight" }
  | { phase: "error"; message: string };

export function NavRouteClient({
  spotId,
  returnTab,
  initialSpot,
}: {
  spotId: string;
  returnTab: ReturnTab;
  /** 服务端已解析时可传入，减少一次客户端请求 */
  initialSpot?: FishingSpot | null;
}) {
  const spotDetailHref = `/spot/${spotId}?from=${returnTab}`;
  /** 结束导航应回到主地图，避免随 `from` 落到「我的」等子 Tab */
  const mainMapHref = "/map";

  const [spot, setSpot] = useState<FishingSpot | null>(initialSpot ?? null);

  useEffect(() => {
    if (initialSpot?.id === spotId) {
      setSpot(initialSpot);
      return;
    }
    let cancelled = false;
    void fetchSpotByIdClient(spotId).then((s) => {
      if (!cancelled) setSpot(s);
    });
    return () => {
      cancelled = true;
    };
  }, [spotId, initialSpot]);

  const { position, status, request } = useUserLocation({ autoRequest: true });
  const [route, setRoute] = useState<RouteState>({ phase: "idle" });

  const destination = useMemo(
    () =>
      spot ? { lat: spot.lat, lng: spot.lng } : { lat: DEFAULT_MAP_CENTER.lat, lng: DEFAULT_MAP_CENTER.lng },
    [spot]
  );

  const compute = useCallback(() => {
    if (!spot) return;
    const origin = position ?? DEFAULT_MAP_CENTER;
    setRoute({
      phase: "ready",
      points: straightLineRoute(origin, destination),
      source: "straight",
    });
  }, [destination, position, spot]);

  useEffect(() => {
    if (!spot) return;
    compute();
  }, [compute, spot, position]);

  const origin = position ?? DEFAULT_MAP_CENTER;
  const markers: MapMarkerSpec[] = spot
    ? [
        {
          lat: origin.lat,
          lng: origin.lng,
          label: position ? "我的位置（起点）" : "起点（未授权定位，为示意中心）",
          kind: position ? "user" : "user",
        },
        {
          lat: spot.lat,
          lng: spot.lng,
          label: `${spot.name}（终点）`,
          kind: "destination",
        },
      ]
    : [];

  const polyline =
    route.phase === "ready" && route.points.length >= 2 ? route.points : null;

  if (!spot) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-2 bg-zinc-950 text-white">
        <Loader2 className="size-8 animate-spin" aria-hidden />
        <p className="text-sm text-white/80">加载钓点…</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-950">
      <header className="relative z-[1100] flex items-center gap-2 border-b border-white/10 bg-zinc-950/90 px-3 py-2 text-white backdrop-blur">
        <Link
          href={spotDetailHref}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/15",
            loginFocusRing()
          )}
          aria-label="返回钓点详情"
        >
          <ChevronLeft className="size-6" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">导航至 {spot.name}</p>
          <p className="truncate text-[11px] text-white/70">
            {route.phase === "ready" && "路线：轻量位置示意"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href={mainMapHref}
            className={cn(
              "rounded-full px-2.5 py-1.5 text-xs text-white/90 hover:bg-white/10",
              loginFocusRing()
            )}
          >
            首页
          </Link>
          <button
            type="button"
            onClick={() => {
              request();
              compute();
            }}
            className={cn(
              "rounded-full bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15",
              loginFocusRing()
            )}
          >
            刷新
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <LeafletViewport
          className="h-full w-full"
          center={destination}
          zoom={13}
          markers={markers}
          polyline={polyline}
          fit={polyline ? "polyline" : "markers"}
        />
      </div>

      <footer className="relative z-[1100] space-y-1 border-t border-white/10 bg-zinc-950/90 px-4 py-3 text-[11px] text-white/80 backdrop-blur">
        <p>
          定位状态：
          {status === "granted" && "已使用实时位置作为起点"}
          {status === "denied" && "未授权：起点为默认区域中心，仍可查看示意线路"}
          {status === "loading" && "定位中…"}
          {status === "error" && "定位失败：已用默认起点"}
        </p>
        <p className="text-white/60">
          当前为轻量位置示意；实际道路导航请使用高德或百度地图。
        </p>
      </footer>
    </div>
  );
}
