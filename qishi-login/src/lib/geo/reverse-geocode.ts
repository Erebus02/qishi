/** Open-Meteo 逆地理，无需 Key：https://open-meteo.com/en/docs/geocoding-api */

type ReverseResult = {
  results?: {
    name: string;
    admin1?: string;
    admin2?: string;
    country?: string;
  }[];
};

export async function reverseGeocodeLabel(
  lat: number,
  lon: number
): Promise<string> {
  const u = new URL("https://geocoding-api.open-meteo.com/v1/reverse");
  u.searchParams.set("latitude", String(lat));
  u.searchParams.set("longitude", String(lon));
  u.searchParams.set("language", "zh");
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error("逆地理请求失败");
  const data = (await res.json()) as ReverseResult;
  const f = data.results?.[0];
  if (!f) {
    return `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`;
  }
  const parts = [f.name, f.admin2, f.admin1, f.country].filter(Boolean);
  return parts.join(" · ");
}
