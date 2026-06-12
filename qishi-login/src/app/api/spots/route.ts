import {
  DEFAULT_MAP_CENTER,
  FALLBACK_FISHING_SPOTS,
} from "@/lib/geo/fishing-spots";

export function GET() {
  return Response.json({
    defaultCenter: DEFAULT_MAP_CENTER,
    spots: FALLBACK_FISHING_SPOTS,
    total: FALLBACK_FISHING_SPOTS.length,
  });
}
