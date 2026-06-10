"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LatLng } from "@/lib/geo/osrm-route";

export type MapMarkerSpec = {
  lat: number;
  lng: number;
  label: string;
  kind: "user" | "spot" | "destination";
};

type FitMode = "none" | "markers" | "polyline";

type Props = {
  className?: string;
  center: LatLng;
  zoom: number;
  markers: MapMarkerSpec[];
  polyline?: LatLng[] | null;
  fit: FitMode;
};

type AMapMap = {
  add: (overlays: unknown | unknown[]) => void;
  remove: (overlays: unknown | unknown[]) => void;
  destroy: () => void;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setFitView: (overlays?: unknown[], immediately?: boolean, avoid?: number[]) => void;
  resize: () => void;
};

type AMapMarker = {
  on: (event: string, handler: () => void) => void;
};

type AMapDriving = {
  search: (
    origin: [number, number],
    destination: [number, number],
    callback: (status: string) => void
  ) => void;
  clear: () => void;
};

type AMapApi = {
  Map: new (
    element: HTMLElement,
    options: Record<string, unknown>
  ) => AMapMap;
  Marker: new (options: Record<string, unknown>) => AMapMarker;
  Polyline: new (options: Record<string, unknown>) => unknown;
  InfoWindow: new (options: Record<string, unknown>) => {
    open: (map: AMapMap, position: [number, number]) => void;
  };
  ToolBar: new (options?: Record<string, unknown>) => unknown;
  Scale: new (options?: Record<string, unknown>) => unknown;
  Driving: new (options: Record<string, unknown>) => AMapDriving;
};

declare global {
  interface Window {
    AMap?: AMapApi;
    _AMapSecurityConfig?: { securityJsCode: string };
  }
}

let amapPromise: Promise<AMapApi> | null = null;

async function fetchAmapConfig(): Promise<{
  key: string;
  securityCode: string;
}> {
  const buildTimeKey = process.env.NEXT_PUBLIC_AMAP_KEY?.trim();
  const buildTimeSecurityCode =
    process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE?.trim();

  if (buildTimeKey && buildTimeSecurityCode) {
    return {
      key: buildTimeKey,
      securityCode: buildTimeSecurityCode,
    };
  }

  const response = await fetch("/api/map-config", {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("高德地图环境变量未配置");
  return response.json() as Promise<{ key: string; securityCode: string }>;
}

async function loadAmap(): Promise<AMapApi> {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (amapPromise) return amapPromise;

  const { key, securityCode } = await fetchAmapConfig();

  window._AMapSecurityConfig = { securityJsCode: securityCode };
  amapPromise = new Promise<AMapApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(
      key
    )}&plugin=AMap.ToolBar,AMap.Scale,AMap.Driving`;
    script.async = true;
    script.onload = () => {
      if (window.AMap) resolve(window.AMap);
      else reject(new Error("高德地图初始化失败"));
    };
    script.onerror = () => reject(new Error("高德地图加载失败"));
    document.head.appendChild(script);
  });
  return amapPromise;
}

function markerContent(kind: MapMarkerSpec["kind"]): HTMLDivElement {
  const colors =
    kind === "user"
      ? { fill: "#1E90FF", border: "#ffffff", size: 22 }
      : kind === "destination"
        ? { fill: "#ef4444", border: "#991b1b", size: 22 }
        : { fill: "#22c55e", border: "#ffffff", size: 18 };
  const el = document.createElement("div");
  el.style.width = `${colors.size}px`;
  el.style.height = `${colors.size}px`;
  el.style.borderRadius = "999px";
  el.style.background = colors.fill;
  el.style.border = `3px solid ${colors.border}`;
  el.style.boxShadow = "0 4px 12px rgba(15,23,42,.24)";
  return el;
}

export function LeafletViewport({
  className,
  center,
  zoom,
  markers,
  polyline,
  fit,
}: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMapMap | null>(null);
  const apiRef = useRef<AMapApi | null>(null);
  const overlaysRef = useRef<unknown[]>([]);
  const drivingRef = useRef<AMapDriving | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">(
    "loading"
  );

  const redraw = useCallback(() => {
    const map = mapRef.current;
    const AMap = apiRef.current;
    if (!map || !AMap) return;

    drivingRef.current?.clear();
    drivingRef.current = null;
    if (overlaysRef.current.length) map.remove(overlaysRef.current);

    const overlays: unknown[] = markers.map((marker) => {
      const position: [number, number] = [marker.lng, marker.lat];
      const item = new AMap.Marker({
        position,
        content: markerContent(marker.kind),
        offset: [-11, -11],
        zIndex: marker.kind === "user" ? 120 : 110,
      });
      const info = new AMap.InfoWindow({
        content: `<div style="padding:6px 10px;font-size:13px">${marker.label}</div>`,
        offset: [0, -14],
      });
      item.on("click", () => info.open(map, position));
      return item;
    });

    if (polyline && polyline.length >= 2) {
      const path = polyline.map(
        (point) => [point.lng, point.lat] as [number, number]
      );
      const line = new AMap.Polyline({
        path,
        strokeColor: "#1E90FF",
        strokeWeight: 6,
        strokeOpacity: 0.92,
        lineJoin: "round",
        lineCap: "round",
      });
      overlays.push(line);

      const origin = path[0];
      const destination = path[path.length - 1];
      const driving = new AMap.Driving({
        map,
        hideMarkers: true,
        showTraffic: false,
        autoFitView: true,
      });
      drivingRef.current = driving;
      driving.search(origin, destination, (routeStatus) => {
        if (routeStatus === "complete") map.remove(line);
      });
    }

    map.add(overlays);
    overlaysRef.current = overlays;

    if (fit !== "none" && overlays.length) {
      map.setFitView(overlays, false, [64, 64, 64, 64]);
    } else {
      map.setCenter([center.lng, center.lat]);
      map.setZoom(zoom);
    }
  }, [center.lat, center.lng, fit, markers, polyline, zoom]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    let cancelled = false;

    void loadAmap()
      .then((AMap) => {
        if (cancelled || !elRef.current) return;
        const map = new AMap.Map(elRef.current, {
          viewMode: "2D",
          zoom,
          center: [center.lng, center.lat],
          mapStyle: "amap://styles/whitesmoke",
          resizeEnable: true,
        });
        map.add([new AMap.ToolBar({ position: "LT" }), new AMap.Scale()]);
        apiRef.current = AMap;
        mapRef.current = map;
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("fallback");
      });

    return () => {
      cancelled = true;
      drivingRef.current?.clear();
      mapRef.current?.destroy();
      mapRef.current = null;
      apiRef.current = null;
      overlaysRef.current = [];
    };
    // 地图实例只创建一次，中心和覆盖物由 redraw 更新。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    redraw();
  }, [redraw, status]);

  useEffect(() => {
    const map = mapRef.current;
    const el = elRef.current;
    if (status !== "ready" || !map || !el) return;
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(el);
    return () => observer.disconnect();
  }, [status]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#dbe9f3]">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(75,120,150,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(75,120,150,.12) 1px, transparent 1px), radial-gradient(circle at 28% 35%, rgba(116,180,132,.35), transparent 28%), radial-gradient(circle at 72% 68%, rgba(103,169,213,.32), transparent 30%)",
          backgroundSize: "32px 32px, 32px 32px, 100% 100%, 100% 100%",
        }}
      />
      <div ref={elRef} className={className ?? "h-full w-full"} />
      {status === "loading" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-600">
          正在加载高德地图…
        </div>
      ) : null}
      {status === "fallback" ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-[900] -translate-x-1/2 rounded-full bg-white/90 px-3 py-1.5 text-[11px] text-slate-600 shadow-md backdrop-blur">
          高德地图未配置，已使用轻量地图
        </div>
      ) : null}
    </div>
  );
}
