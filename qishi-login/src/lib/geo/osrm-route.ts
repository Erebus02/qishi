export type LatLng = { lat: number; lng: number };

type OsrmGeometry = {
  coordinates: [number, number][]; // [lng, lat]
};

type OsrmRouteResponse = {
  code: string;
  routes?: { geometry: OsrmGeometry }[];
};

/**
 * 使用 OSRM 公共演示服务规划驾车路线（浏览器端直连）。
 * 若网络/CORS/无路径失败，返回 null，由调用方回退为直线。
 */
export async function fetchDrivingRoute(
  from: LatLng,
  to: LatLng
): Promise<LatLng[] | null> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=simplified&geometries=geojson`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OsrmRouteResponse;
    if (data.code !== "Ok" || !data.routes?.[0]?.geometry?.coordinates?.length) {
      return null;
    }
    return data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
  } catch {
    return null;
  }
}

export function straightLineRoute(from: LatLng, to: LatLng): LatLng[] {
  return [from, to];
}
