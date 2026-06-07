import type { FishingSpot } from "@/lib/geo/fishing-spots";
import { haversineKm } from "@/lib/geo/haversine";
import type { LatLng } from "@/lib/geo/osrm-route";

export function matchesSpotQuery(spot: FishingSpot, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const blob = [spot.name, spot.fish ?? "", spot.id, spot.region ?? ""]
    .join(" ")
    .toLowerCase();
  return s.split(/\s+/).every((part) => part.length > 0 && blob.includes(part));
}

export function filterSpotsByQuery(spots: FishingSpot[], q: string): FishingSpot[] {
  return spots.filter((spot) => matchesSpotQuery(spot, q));
}

export function sortSpotsByDistanceFrom(
  spots: FishingSpot[],
  from: LatLng
): { spot: FishingSpot; distanceKm: number }[] {
  return spots
    .map((spot) => ({
      spot,
      distanceKm: haversineKm(from, { lat: spot.lat, lng: spot.lng }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
