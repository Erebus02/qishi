import { apiUrl, apiBaseUrl } from "@/lib/api-base";

import {
  DEFAULT_MAP_CENTER,
  FALLBACK_FISHING_SPOTS,
  type FishingSpot,
} from "./fishing-spots";
import { isWaterSpotCategory } from "./water-spot-category";

export type SpotsPayload = {
  spots: FishingSpot[];
  defaultCenter: { lat: number; lng: number };
};

function normalizeSpot(raw: unknown): FishingSpot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  if (typeof o.lat !== "number" || typeof o.lng !== "number") return null;
  const spot: FishingSpot = {
    id: o.id,
    name: o.name,
    lat: o.lat,
    lng: o.lng,
  };
  if (typeof o.fish === "string") spot.fish = o.fish;
  if (typeof o.waterCategory === "string" && isWaterSpotCategory(o.waterCategory)) {
    spot.waterCategory = o.waterCategory;
  }
  if (typeof o.region === "string") spot.region = o.region;
  if (typeof o.distanceLabel === "string") spot.distanceLabel = o.distanceLabel;
  if (typeof o.rating === "number") spot.rating = o.rating;
  return spot;
}

function parseListPayload(json: unknown): SpotsPayload | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const spotsRaw = o.spots;
  if (!Array.isArray(spotsRaw)) return null;
  const spots = spotsRaw
    .map(normalizeSpot)
    .filter((s): s is FishingSpot => s != null);
  let defaultCenter = DEFAULT_MAP_CENTER;
  const dc = o.defaultCenter as Record<string, unknown> | undefined;
  if (
    dc &&
    typeof dc.lat === "number" &&
    typeof dc.lng === "number" &&
    Number.isFinite(dc.lat) &&
    Number.isFinite(dc.lng)
  ) {
    defaultCenter = { lat: dc.lat, lng: dc.lng };
  }
  return { spots, defaultCenter };
}

export function getBackendBaseUrl(): string | undefined {
  return (
    process.env.API_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")
  );
}

/** 浏览器：未配置后端地址时使用本地静态兜底数据 */
export async function fetchSpotsPayloadClient(): Promise<SpotsPayload> {
  if (!apiBaseUrl()) {
    return {
      spots: [...FALLBACK_FISHING_SPOTS],
      defaultCenter: { ...DEFAULT_MAP_CENTER },
    };
  }
  try {
    const res = await fetch(apiUrl("/api/spots"), {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const parsed = parseListPayload(json);
    if (!parsed || parsed.spots.length === 0) {
      return {
        spots: [...FALLBACK_FISHING_SPOTS],
        defaultCenter: { ...DEFAULT_MAP_CENTER },
      };
    }
    return parsed;
  } catch {
    return {
      spots: [...FALLBACK_FISHING_SPOTS],
      defaultCenter: { ...DEFAULT_MAP_CENTER },
    };
  }
}

/** Next Server Components：需配置 API_URL 或 NEXT_PUBLIC_API_BASE_URL 为绝对后端地址 */
export async function fetchSpotsPayloadServer(): Promise<SpotsPayload> {
  const base = getBackendBaseUrl();
  if (!base) {
    return {
      spots: [...FALLBACK_FISHING_SPOTS],
      defaultCenter: { ...DEFAULT_MAP_CENTER },
    };
  }
  try {
    const res = await fetch(`${base}/api/spots`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const parsed = parseListPayload(json);
    if (!parsed || parsed.spots.length === 0) {
      return {
        spots: [...FALLBACK_FISHING_SPOTS],
        defaultCenter: { ...DEFAULT_MAP_CENTER },
      };
    }
    return parsed;
  } catch {
    return {
      spots: [...FALLBACK_FISHING_SPOTS],
      defaultCenter: { ...DEFAULT_MAP_CENTER },
    };
  }
}

export async function fetchSpotByIdClient(id: string): Promise<FishingSpot | null> {
  if (!apiBaseUrl()) {
    return (
      FALLBACK_FISHING_SPOTS.find((s) => s.id === id) ?? null
    );
  }
  try {
    const res = await fetch(apiUrl(`/api/spots/${encodeURIComponent(id)}`), {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return normalizeSpot(json);
  } catch {
    return FALLBACK_FISHING_SPOTS.find((s) => s.id === id) ?? null;
  }
}

export async function fetchSpotByIdServer(
  id: string
): Promise<FishingSpot | null> {
  const fallback = (): FishingSpot | null =>
    FALLBACK_FISHING_SPOTS.find((s) => s.id === id) ?? null;

  const base = getBackendBaseUrl();
  if (!base) {
    return fallback();
  }
  try {
    const res = await fetch(`${base}/api/spots/${encodeURIComponent(id)}`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const json = await res.json();
      const spot = normalizeSpot(json);
      if (spot) return spot;
    }
    /** 列表在无数据或失败时会用兜底钓点；后端库中无对应 id 时不能 404，须与客户端一致 */
    return fallback();
  } catch {
    return fallback();
  }
}
