"use client";

import { DEFAULT_MAP_CENTER, type FishingSpot } from "@/lib/geo/fishing-spots";
import type { LatLng } from "@/lib/geo/osrm-route";

import { LeafletViewport, type MapMarkerSpec } from "./leaflet-viewport";

type GeoStatus = "idle" | "loading" | "granted" | "denied" | "error";

type Props = {
  /** 来自 API 或兜底列表 */
  spots: FishingSpot[];
  userPosition: LatLng | null;
  geoStatus: GeoStatus;
  geoMessage: string | null;
  /** null 表示展示全部钓点；非空则仅展示这些 id */
  visibleSpotIds: string[] | null;
};

/** 有定位时以用户为中心，避免「演示钓点 + 真实坐标」fitBounds 把视野拉到全国级导致蓝点看不见 */
const USER_FOCUS_ZOOM = 15;

export function HomeMap({
  spots: allSpots,
  userPosition,
  geoStatus,
  geoMessage,
  visibleSpotIds,
}: Props) {
  const spots =
    visibleSpotIds == null
      ? allSpots
      : allSpots.filter((s) => visibleSpotIds.includes(s.id));

  const hasUser = userPosition != null;
  const center = hasUser ? userPosition : DEFAULT_MAP_CENTER;
  const zoom = hasUser ? USER_FOCUS_ZOOM : 12;

  const markers: MapMarkerSpec[] = [
    ...spots.map((s) => ({
      lat: s.lat,
      lng: s.lng,
      label: `${s.name}${s.fish ? ` · ${s.fish}` : ""}`,
      kind: "spot" as const,
    })),
    ...(hasUser
      ? [
          {
            lat: userPosition.lat,
            lng: userPosition.lng,
            label: "我的位置",
            kind: "user" as const,
          },
        ]
      : []),
  ];

  const fitMarkers = !hasUser && markers.length > 0;

  return (
    <div className="relative h-full w-full">
      <LeafletViewport
        className="h-full w-full"
        center={center}
        zoom={zoom}
        markers={markers}
        polyline={null}
        fit={fitMarkers ? "markers" : "none"}
      />
      <div className="pointer-events-none absolute bottom-3 left-2 right-2 z-[1000] rounded-lg bg-black/55 px-2 py-1.5 text-center text-[10px] text-white backdrop-blur-sm sm:left-3 sm:right-3 sm:px-3 sm:py-2 sm:text-[11px]">
        {geoStatus === "loading" && "正在获取定位…"}
        {geoStatus === "denied" &&
          "未授权定位：地图以默认区域为中心，可在浏览器设置中允许定位后刷新页面"}
        {geoStatus === "error" && (geoMessage ?? "定位不可用：已使用默认区域")}
        {geoStatus === "granted" && userPosition && "已定位到附近，绿点为钓点，蓝点为您"}
        {geoStatus === "idle" && "准备定位…"}
      </div>
    </div>
  );
}
