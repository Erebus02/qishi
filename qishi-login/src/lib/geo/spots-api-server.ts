import {
  buildSpotsPath,
  getBackendBaseUrl,
  normalizeSpot,
  parseListPayload,
  type SpotsPayload,
} from "./spots-api";
import { DEFAULT_MAP_CENTER, type FishingSpot } from "./fishing-spots";
import { FALLBACK_FISHING_SPOTS } from "./fishing-spots-database";

function fallbackPayload(): SpotsPayload {
  return {
    spots: [...FALLBACK_FISHING_SPOTS],
    defaultCenter: { ...DEFAULT_MAP_CENTER },
  };
}

function fallbackSpot(id: string): FishingSpot | null {
  return FALLBACK_FISHING_SPOTS.find((s) => s.id === id) ?? null;
}

export async function fetchSpotsPayloadServer(): Promise<SpotsPayload> {
  const base = getBackendBaseUrl();
  if (!base) return fallbackPayload();

  try {
    const res = await fetch(`${base}${buildSpotsPath()}`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const parsed = parseListPayload(json);
    if (!parsed || parsed.spots.length === 0) return fallbackPayload();
    return parsed;
  } catch {
    return fallbackPayload();
  }
}

export async function fetchSpotByIdServer(
  id: string
): Promise<FishingSpot | null> {
  const base = getBackendBaseUrl();
  if (!base) return fallbackSpot(id);

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
    return fallbackSpot(id);
  } catch {
    return fallbackSpot(id);
  }
}
