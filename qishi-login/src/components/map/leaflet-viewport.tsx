"use client";

import L from "leaflet";
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

function markerStyle(kind: MapMarkerSpec["kind"]): L.CircleMarkerOptions {
  if (kind === "user") {
    return {
      radius: 12,
      color: "#ffffff",
      weight: 3,
      fillColor: "#1E90FF",
      fillOpacity: 1,
    };
  }
  if (kind === "destination") {
    return {
      radius: 11,
      color: "#b91c1c",
      weight: 3,
      fillColor: "#ef4444",
      fillOpacity: 1,
    };
  }
  return {
    radius: 8,
    color: "#14532d",
    weight: 2,
    fillColor: "#22c55e",
    fillOpacity: 0.95,
  };
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
  const mapRef = useRef<L.Map | null>(null);
  const fgRef = useRef<L.FeatureGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const redraw = useCallback(() => {
    const map = mapRef.current;
    const fg = fgRef.current;
    if (!map || !fg) return;

    fg.clearLayers();

    for (const m of markers) {
      const cm = L.circleMarker([m.lat, m.lng], markerStyle(m.kind))
        .bindPopup(m.label)
        .addTo(fg);
      cm.on("click", () => {
        cm.openPopup();
      });
    }

    if (polyline && polyline.length >= 2) {
      const latlngs = polyline.map((p) => [p.lat, p.lng] as L.LatLngExpression);
      L.polyline(latlngs, {
        color: "#1E90FF",
        weight: 6,
        opacity: 0.92,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(fg);

      if (fit === "polyline") {
        const bounds = L.latLngBounds(latlngs);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true });
        return;
      }
    }

    if (fit === "markers" && markers.length > 0) {
      if (markers.length === 1) {
        const m = markers[0];
        map.setView([m.lat, m.lng], Math.min(zoom, 15), { animate: true });
        return;
      }
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [56, 56], maxZoom: 14, animate: true });
      return;
    }

    map.setView([center.lat, center.lng], zoom, { animate: true });
  }, [center.lat, center.lng, zoom, markers, polyline, fit]);

  useEffect(() => {
    const el = elRef.current;
    if (!el || mapRef.current) return;

    /**
     * 手机浏览器：单指拖移、双指捏合缩放、双击放大（与常见「地图 App」一致）。
     * 底图当前为 OpenStreetMap 栅格瓦片；若 PRD 要求切换高德 JS SDK，可在此替换 L.tileLayer 为 AMap 或叠加层。
     */
    const map = L.map(el, {
      zoomControl: true,
      attributionControl: true,
      preferCanvas: false,
      tap: true,
      touchZoom: true,
      dragging: true,
      doubleClickZoom: true,
      scrollWheelZoom: true,
      boxZoom: false,
      keyboard: false,
    }).setView([center.lat, center.lng], zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const fg = L.featureGroup().addTo(map);
    mapRef.current = map;
    fgRef.current = fg;
    setMapReady(true);

    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    const t = window.setTimeout(() => map.invalidateSize(), 400);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      setMapReady(false);
      map.remove();
      mapRef.current = null;
      fgRef.current = null;
    };
    // 地图只创建一次；中心与图层由 redraw 同步
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载时创建 Leaflet 实例
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    redraw();
  }, [mapReady, redraw]);

  /** 首页等多层 flex/absolute 下，首帧容器常为 0 高；尺寸变化后必须让 Leaflet 重算，否则瓦片与定位点不显示 */
  useEffect(() => {
    const map = mapRef.current;
    const el = elRef.current;
    if (!mapReady || !map || !el) return;

    const bump = () => {
      map.invalidateSize({ animate: false });
      redraw();
    };

    const ro = new ResizeObserver(() => bump());
    ro.observe(el);
    const t = window.setTimeout(bump, 0);
    const t2 = window.setTimeout(bump, 320);

    return () => {
      ro.disconnect();
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [mapReady, redraw]);

  return <div ref={elRef} className={className ?? "h-full w-full"} />;
}
