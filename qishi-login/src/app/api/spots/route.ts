import {
  DEFAULT_MAP_CENTER,
} from "@/lib/geo/fishing-spots";
import {
  FALLBACK_FISHING_SPOTS,
} from "@/lib/geo/fishing-spots-database";
import { haversineKm } from "@/lib/geo/haversine";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const limit = Math.min(
    3000,
    Math.max(1, Number(searchParams.get("limit") ?? 3000) || 3000)
  );
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const hasOrigin = Number.isFinite(lat) && Number.isFinite(lng);

  let rows = FALLBACK_FISHING_SPOTS;

  if (q) {
    const parts = q.split(/\s+/).filter(Boolean);
    rows = rows.filter((spot) => {
      const blob = [
        spot.id,
        spot.name,
        spot.region ?? "",
        spot.fish ?? "",
        spot.waterCategory ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return parts.every((part) => blob.includes(part));
    });
  }

  if (hasOrigin) {
    rows = [...rows].sort(
      (a, b) =>
        haversineKm({ lat, lng }, a) - haversineKm({ lat, lng }, b)
    );
  }

  const spots = rows.slice(0, limit);

  return Response.json({
    defaultCenter: DEFAULT_MAP_CENTER,
    spots,
    total: FALLBACK_FISHING_SPOTS.length,
    matched: rows.length,
    limit,
  });
}
