import { apiUrl } from "@/lib/api-base";
import { readAdminSpotsPayload } from "@/lib/admin/admin-spots-storage";

import {
  DEFAULT_MAP_CENTER,
  type FishingSpot,
} from "./fishing-spots";
import { isWaterSpotCategory } from "./water-spot-category";

export type SpotsPayload = {
  spots: FishingSpot[];
  defaultCenter: { lat: number; lng: number };
  categoryCounts?: Record<string, number>;
};

export type FetchSpotsOptions = {
  lat?: number;
  lng?: number;
  limit?: number;
  q?: string;
  province?: string;
  city?: string;
  category?: string;
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
  const categoryCounts =
    o.categoryCounts && typeof o.categoryCounts === "object"
      ? Object.fromEntries(
          Object.entries(o.categoryCounts as Record<string, unknown>)
            .filter(([, value]) => typeof value === "number")
            .map(([key, value]) => [key, value as number])
        )
      : undefined;
  return { spots, defaultCenter, categoryCounts };
}

export function getBackendBaseUrl(): string | undefined {
  return (
    process.env.API_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")
  );
}

function buildSpotsPath(options?: FetchSpotsOptions) {
  const params = new URLSearchParams();
  if (typeof options?.lat === "number") params.set("lat", String(options.lat));
  if (typeof options?.lng === "number") params.set("lng", String(options.lng));
  if (typeof options?.limit === "number") {
    params.set("limit", String(options.limit));
  }
  const q = options?.q?.trim();
  if (q) params.set("q", q);
  if (options?.province) params.set("province", options.province);
  if (options?.city) params.set("city", options.city);
  if (options?.category) params.set("category", options.category);
  const qs = params.toString();
  return qs ? `/api/spots?${qs}` : "/api/spots";
}

/** 浏览器：默认通过同域 API 按需读取，不把全国库整包塞进首屏 */
export async function fetchSpotsPayloadClient(
  options?: FetchSpotsOptions
): Promise<SpotsPayload> {
  const adminPayload = readAdminSpotsPayload();
  if (adminPayload && !options) return adminPayload;

  try {
    const res = await fetch(apiUrl(buildSpotsPath(options)), {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const parsed = parseListPayload(json);
    if (!parsed || parsed.spots.length === 0) {
      return {
        spots: [],
        defaultCenter: { ...DEFAULT_MAP_CENTER },
      };
    }
    return parsed;
  } catch {
    return {
      spots: [],
      defaultCenter: { ...DEFAULT_MAP_CENTER },
    };
  }
}

/** Next Server Components：需配置 API_URL 或 NEXT_PUBLIC_API_BASE_URL 为绝对后端地址 */
export async function fetchSpotsPayloadServer(): Promise<SpotsPayload> {
  const base = getBackendBaseUrl();
  if (!base) {
    const { FALLBACK_FISHING_SPOTS } = await import("./fishing-spots-database");
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
      const { FALLBACK_FISHING_SPOTS } = await import("./fishing-spots-database");
      return {
        spots: [...FALLBACK_FISHING_SPOTS],
        defaultCenter: { ...DEFAULT_MAP_CENTER },
      };
    }
    return parsed;
  } catch {
    const { FALLBACK_FISHING_SPOTS } = await import("./fishing-spots-database");
    return {
      spots: [...FALLBACK_FISHING_SPOTS],
      defaultCenter: { ...DEFAULT_MAP_CENTER },
    };
  }
}

export async function fetchSpotByIdClient(id: string): Promise<FishingSpot | null> {
  const adminPayload = readAdminSpotsPayload();
  const adminSpot = adminPayload?.spots.find((s) => s.id === id);
  if (adminSpot) return adminSpot;

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
    return null;
  }
}

export async function fetchSpotByIdServer(
  id: string
): Promise<FishingSpot | null> {
  const fallback = async (): Promise<FishingSpot | null> => {
    const { FALLBACK_FISHING_SPOTS } = await import("./fishing-spots-database");
    return FALLBACK_FISHING_SPOTS.find((s) => s.id === id) ?? null;
  };

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
