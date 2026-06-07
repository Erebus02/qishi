/** Open-Meteo 免费接口，无需 API Key：https://open-meteo.com */

const WMO_LABEL: Record<number, string> = {
  0: "晴",
  1: "大部晴朗",
  2: "多云",
  3: "阴",
  45: "雾",
  48: "雾凇",
  51: "小毛毛雨",
  53: "毛毛雨",
  55: "强毛毛雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  80: "阵雨",
  81: "强阵雨",
  82: "暴雨",
  95: "雷暴",
  96: "雷暴伴冰雹",
  99: "强雷暴伴冰雹",
};

function wmoLabel(code: number): string {
  return WMO_LABEL[code] ?? "多云";
}

function windDirZh(deg: number): string {
  const dirs = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  const i = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return `${dirs[i]}风`;
}

/** 将 10m 风速（km/h）粗略换算为蒲福风级描述 */
function windLevelFromKmh(kmh: number): string {
  const ms = kmh / 3.6;
  if (ms < 0.3) return "0级";
  if (ms < 1.6) return "1级";
  if (ms < 3.4) return "2级";
  if (ms < 5.5) return "3级";
  if (ms < 8) return "4级";
  if (ms < 10.8) return "5级";
  if (ms < 13.9) return "6级";
  if (ms < 17.2) return "7级";
  return "8级及以上";
}

export function formatWind(windKmh: number, windDeg: number): string {
  return `${windDirZh(windDeg)} ${windLevelFromKmh(windKmh)}`;
}

export function computeBiteIndex(
  weatherCode: number,
  windKmh: number,
  humidity: number
): number {
  let score = 62;
  if ([0, 1].includes(weatherCode)) score += 14;
  else if ([2, 3].includes(weatherCode)) score += 6;
  if (weatherCode >= 51 && weatherCode <= 67) score -= 10;
  if (weatherCode >= 80) score -= 8;
  if (weatherCode >= 95) score -= 12;
  if (windKmh > 28) score -= 14;
  else if (windKmh > 18) score -= 6;
  else if (windKmh < 10) score += 6;
  if (humidity > 88) score -= 6;
  if (humidity < 45) score += 4;
  return Math.round(Math.min(98, Math.max(38, score)));
}

function biteLabel(score: number): string {
  if (score >= 80) return "非常适合";
  if (score >= 65) return "适合出钓";
  if (score >= 52) return "尚可";
  return "一般";
}

export type HourlySlot = {
  time: string;
  temp: string;
  /** 用于小条展示，沿用原 UI 的百分比条：此处用相对湿度 */
  barPercent: number;
  labelPercent: number;
};

export type ToolboxWeatherState = {
  temp: string;
  condition: string;
  wind: string;
  humidity: string;
  biteIndex: number;
  biteLabel: string;
  hourly: HourlySlot[];
  sunrise: string;
  sunset: string;
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 从 ISO 时间串取本地 HH:mm（依赖浏览器对带时区 ISO 的解析） */
function isoToHm(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

type OpenMeteoJson = {
  current?: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
  };
  daily?: {
    sunrise: string[];
    sunset: string[];
  };
};

const TARGET_HOURS = [6, 9, 12, 15, 18, 21] as const;

export async function fetchToolboxWeather(
  lat: number,
  lon: number
): Promise<ToolboxWeatherState> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
    ].join(","),
    hourly: ["temperature_2m", "relative_humidity_2m"].join(","),
    daily: "sunrise,sunset",
    timezone: "auto",
    forecast_days: "2",
  });

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  );
  if (!res.ok) throw new Error(`天气接口 ${res.status}`);

  const data = (await res.json()) as OpenMeteoJson;
  const cur = data.current;
  if (!cur) throw new Error("无当前天气数据");

  const humidity = Math.round(cur.relative_humidity_2m);
  const biteIndex = computeBiteIndex(
    cur.weather_code,
    cur.wind_speed_10m,
    humidity
  );

  const hourlySlots: HourlySlot[] = [];
  const ht = data.hourly?.time ?? [];
  const tt = data.hourly?.temperature_2m ?? [];
  const rh = data.hourly?.relative_humidity_2m ?? [];

  for (const wantH of TARGET_HOURS) {
    let idx = -1;
    for (let i = 0; i < ht.length; i++) {
      const d = new Date(ht[i]);
      if (Number.isNaN(d.getTime())) continue;
      if (d.getHours() === wantH) {
        idx = i;
        break;
      }
    }
    if (idx >= 0 && tt[idx] != null && rh[idx] != null) {
      const hum = Math.round(rh[idx]);
      hourlySlots.push({
        time: `${pad2(wantH)}:00`,
        temp: `${Math.round(tt[idx])}°C`,
        barPercent: hum,
        labelPercent: hum,
      });
    }
  }

  if (hourlySlots.length === 0) {
    for (let i = 0; i < Math.min(6, ht.length); i++) {
      const d = new Date(ht[i]);
      const hum = rh[i] != null ? Math.round(rh[i]) : 60;
      hourlySlots.push({
        time: Number.isNaN(d.getTime())
          ? "--:--"
          : `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
        temp: tt[i] != null ? `${Math.round(tt[i])}°C` : "--",
        barPercent: hum,
        labelPercent: hum,
      });
    }
  }

  const sunrise =
    data.daily?.sunrise?.[0] != null ? isoToHm(data.daily.sunrise[0]) : "--:--";
  const sunset =
    data.daily?.sunset?.[0] != null ? isoToHm(data.daily.sunset[0]) : "--:--";

  return {
    temp: `${Math.round(cur.temperature_2m)}°C`,
    condition: wmoLabel(cur.weather_code),
    wind: formatWind(cur.wind_speed_10m, cur.wind_direction_10m),
    humidity: `${humidity}%`,
    biteIndex,
    biteLabel: biteLabel(biteIndex),
    hourly: hourlySlots,
    sunrise,
    sunset,
  };
}
