import {
  DEFAULT_MAP_CENTER,
  type FishingSpot,
  type MapCenter,
} from "@/lib/geo/fishing-spots";
import { isWaterSpotCategory } from "@/lib/geo/water-spot-category";

export const ADMIN_SPOTS_STORAGE_KEY = "qishi:admin-spots:v1";

export type AdminSpotsPayload = {
  spots: FishingSpot[];
  defaultCenter: MapCenter;
};

export function normalizeAdminSpot(raw: unknown): FishingSpot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.name !== "string" ||
    typeof o.lat !== "number" ||
    typeof o.lng !== "number"
  ) {
    return null;
  }

  return {
    id: o.id,
    name: o.name,
    lat: o.lat,
    lng: o.lng,
    waterCategory:
      typeof o.waterCategory === "string" && isWaterSpotCategory(o.waterCategory)
        ? o.waterCategory
        : undefined,
    fish: typeof o.fish === "string" ? o.fish : undefined,
    region: typeof o.region === "string" ? o.region : undefined,
    distanceLabel: typeof o.distanceLabel === "string" ? o.distanceLabel : undefined,
    rating: typeof o.rating === "number" ? o.rating : undefined,
  };
}

export function parseAdminSpotsPayload(raw: string): AdminSpotsPayload | null {
  try {
    const json = JSON.parse(raw) as unknown;
    const list = Array.isArray(json)
      ? json
      : json &&
          typeof json === "object" &&
          Array.isArray((json as { spots?: unknown }).spots)
        ? (json as { spots: unknown[] }).spots
        : null;

    if (!list) return null;
    const spots = list
      .map(normalizeAdminSpot)
      .filter((spot): spot is FishingSpot => spot != null);
    if (spots.length === 0) return null;

    const dc =
      json && typeof json === "object"
        ? (json as { defaultCenter?: unknown }).defaultCenter
        : null;
    const defaultCenter =
      dc &&
      typeof dc === "object" &&
      typeof (dc as MapCenter).lat === "number" &&
      typeof (dc as MapCenter).lng === "number"
        ? { lat: (dc as MapCenter).lat, lng: (dc as MapCenter).lng }
        : { ...DEFAULT_MAP_CENTER };

    return { spots, defaultCenter };
  } catch {
    return null;
  }
}

export function readAdminSpotsPayload(): AdminSpotsPayload | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ADMIN_SPOTS_STORAGE_KEY);
  return raw ? parseAdminSpotsPayload(raw) : null;
}
