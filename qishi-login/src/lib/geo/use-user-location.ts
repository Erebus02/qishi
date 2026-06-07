"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LatLng } from "@/lib/geo/osrm-route";
import {
  geolocationBlockedReason,
  hintForGeolocationError,
} from "@/lib/geo/secure-geolocation";

type Status = "idle" | "loading" | "granted" | "denied" | "error";

/**
 * 浏览器 Geolocation（手机 GPS）：需用户授权；生产环境请使用 HTTPS，否则部分机型会静默失败。
 */
export function useUserLocation(options?: { autoRequest?: boolean }) {
  const auto = options?.autoRequest ?? true;
  const [position, setPosition] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      setMessage("当前环境不支持定位");
      return;
    }
    const blocked = geolocationBlockedReason();
    if (blocked) {
      setStatus("error");
      setMessage(blocked);
      return;
    }
    setStatus("loading");
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mounted.current) return;
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(next);
        setStatus("granted");
      },
      (err) => {
        if (!mounted.current) return;
        setStatus(err.code === 1 ? "denied" : "error");
        setMessage(hintForGeolocationError(err.code));
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 12_000 }
    );
  }, []);

  useEffect(() => {
    if (auto) request();
  }, [auto, request]);

  return { position, status, message, request };
}
