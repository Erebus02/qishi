"use client";

import {
  AlertCircle,
  Camera,
  Droplets,
  Loader2,
  MapPin,
  Sun,
  Sunrise,
  Sunset,
  TrendingUp,
  Waves,
  Wind,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import { loginFocusRing } from "@/lib/login-styles";
import {
  type ToolboxWeatherState,
  fetchToolboxWeather,
} from "@/lib/weather/open-meteo-toolbox";
import { cn } from "@/lib/utils";

const DEFAULT_WEATHER: ToolboxWeatherState = {
  temp: "22°C",
  condition: "晴",
  wind: "东风 2级",
  humidity: "65%",
  biteIndex: 85,
  biteLabel: "非常适合",
  hourly: [
    { time: "06:00", temp: "18°C", barPercent: 75, labelPercent: 75 },
    { time: "09:00", temp: "20°C", barPercent: 85, labelPercent: 85 },
    { time: "12:00", temp: "23°C", barPercent: 70, labelPercent: 70 },
    { time: "15:00", temp: "24°C", barPercent: 65, labelPercent: 65 },
    { time: "18:00", temp: "22°C", barPercent: 80, labelPercent: 80 },
    { time: "21:00", temp: "19°C", barPercent: 60, labelPercent: 60 },
  ],
  sunrise: "06:15",
  sunset: "18:45",
};

const tools = [
  {
    id: "tide",
    title: "潮汐月相",
    icon: Waves,
    color: "from-blue-500 to-cyan-500",
    data: { tide: "高潮", time: "14:30", moon: "上弦月" },
  },
  {
    id: "fish-ai",
    title: "AI识鱼",
    icon: Camera,
    color: "from-green-500 to-emerald-500",
    data: null as null,
  },
  {
    id: "ban",
    title: "禁钓期",
    icon: AlertCircle,
    color: "from-red-500 to-orange-500",
    data: { status: "无禁钓", area: "当前区域" },
  },
] as const;

function geoErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return "已拒绝定位权限，请在浏览器或系统设置中允许定位";
    case 2:
      return "暂时无法获取位置，请稍后重试";
    case 3:
      return "定位超时，请到开阔处再试";
    default:
      return "定位失败，请重试";
  }
}

export function ToolboxView() {
  const [weather, setWeather] = useState<ToolboxWeatherState>(DEFAULT_WEATHER);
  const [locating, setLocating] = useState(false);
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const [locatedAt, setLocatedAt] = useState<string | null>(null);

  const refreshByLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoHint("当前环境不支持定位");
      return;
    }
    setLocating(true);
    setGeoHint(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const next = await fetchToolboxWeather(latitude, longitude);
          setWeather(next);
          setLocatedAt(
            new Date().toLocaleString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              month: "numeric",
              day: "numeric",
            })
          );
          setGeoHint(null);
        } catch {
          setGeoHint("天气数据获取失败，请检查网络后重试");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setGeoHint(geoErrorMessage(err.code));
      },
      { enableHighAccuracy: true, timeout: 18_000, maximumAge: 120_000 }
    );
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50 dark:bg-zinc-950">
      <div className="border-b border-gray-100 bg-white px-4 py-4 dark:border-white/10 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">钓鱼工具箱</h1>
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
              极简实用工具，助力每次出钓
            </p>
            {locatedAt ? (
              <p className="mt-1 text-xs text-[#1E90FF] dark:text-[#4da3ff]">
                已按定位更新 · {locatedAt}
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
                点击「定位」根据当前位置刷新天气与日出日落
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={refreshByLocation}
            disabled={locating}
            aria-busy={locating}
            aria-label="定位并刷新天气预报"
            className={cn(
              "flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-2.5 py-2 text-[#1E90FF] transition-colors hover:bg-blue-50 disabled:opacity-60 dark:text-[#4da3ff] dark:hover:bg-blue-950/40",
              loginFocusRing()
            )}
          >
            {locating ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            ) : (
              <MapPin className="h-6 w-6" aria-hidden />
            )}
            <span className="text-[10px] font-medium leading-none">
              {locating ? "定位中" : "定位"}
            </span>
          </button>
        </div>
        {geoHint ? (
          <p
            className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
            role="alert"
          >
            {geoHint}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-24">
        <div className="mx-4 my-4">
          <div className="rounded-3xl bg-gradient-to-br from-[#1E90FF] to-[#00BFFF] p-5 text-white shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="mb-1 text-4xl font-bold">{weather.temp}</div>
                <div className="text-sm opacity-90">{weather.condition}</div>
              </div>
              <Sun size={56} className="opacity-90" />
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                <div className="mb-1 flex items-center gap-2">
                  <Wind size={16} />
                  <span className="text-xs opacity-80">风力</span>
                </div>
                <div className="text-sm font-medium">{weather.wind}</div>
              </div>
              <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                <div className="mb-1 flex items-center gap-2">
                  <Droplets size={16} />
                  <span className="text-xs opacity-80">湿度</span>
                </div>
                <div className="text-sm font-medium">{weather.humidity}</div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={20} />
                  <span className="font-semibold">今日咬钩指数</span>
                </div>
                <div className="text-2xl font-bold">{weather.biteIndex}</div>
              </div>
              <div className="mb-2 h-2 rounded-full bg-white/20">
                <div
                  className="h-2 rounded-full bg-white transition-all"
                  style={{ width: `${weather.biteIndex}%` }}
                />
              </div>
              <div className="text-xs opacity-90">{weather.biteLabel}</div>
            </div>
          </div>
        </div>

        <div className="mx-4 mb-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
            <h3 className="mb-3 text-sm font-semibold">逐小时预报</h3>
            <p className="mb-2 text-[10px] text-gray-400 dark:text-zinc-500">
              气温与相对湿度（定位后按当地预报更新）
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {weather.hourly.map((item) => (
                <div
                  key={item.time}
                  className="min-w-[70px] flex-shrink-0 rounded-xl bg-gradient-to-b from-blue-50 to-cyan-50 p-3 text-center dark:from-blue-950/50 dark:to-cyan-950/50"
                >
                  <div className="mb-2 text-xs text-gray-600 dark:text-zinc-400">
                    {item.time}
                  </div>
                  <Sun size={20} className="mx-auto mb-2 text-yellow-500" />
                  <div className="mb-2 text-sm font-medium">{item.temp}</div>
                  <div className="text-xs">
                    <div className="mb-1 h-1.5 rounded-full bg-gray-200 dark:bg-zinc-700">
                      <div
                        className="h-1.5 rounded-full bg-[#1E90FF]"
                        style={{ width: `${item.barPercent}%` }}
                      />
                    </div>
                    <span className="text-gray-500">湿度 {item.labelPercent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-4 mb-4 space-y-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const row = (
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white",
                    tool.color
                  )}
                >
                  <Icon size={28} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="mb-1 text-base font-semibold">{tool.title}</h3>
                  {tool.data && tool.id === "tide" && (
                    <div className="text-xs text-gray-500 dark:text-zinc-400">
                      {tool.data.tide} {tool.data.time} · {tool.data.moon}
                    </div>
                  )}
                  {tool.data && tool.id === "ban" && (
                    <span className="text-xs font-medium text-green-600">
                      ✓ {tool.data.status}
                    </span>
                  )}
                  {tool.id === "fish-ai" && (
                    <span className="text-xs text-gray-500 dark:text-zinc-400">
                      拍照识别鱼类
                    </span>
                  )}
                </div>
                <div className="text-gray-400">›</div>
              </div>
            );

            const cardClass = cn(
              "block w-full rounded-2xl bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-900",
              loginFocusRing()
            );

            if (tool.id === "fish-ai") {
              return (
                <Link key={tool.id} href="/tools/fish-ai" className={cardClass}>
                  {row}
                </Link>
              );
            }

            return (
              <button key={tool.id} type="button" className={cardClass}>
                {row}
              </button>
            );
          })}
        </div>

        <div className="mx-4 mb-4">
          <div className="rounded-2xl bg-gradient-to-r from-orange-100 to-yellow-100 p-4 dark:from-orange-950/40 dark:to-yellow-950/40">
            <h3 className="mb-3 text-sm font-semibold">今日日出日落</h3>
            <div className="flex items-center justify-around">
              <div className="text-center">
                <Sunrise size={32} className="mx-auto mb-2 text-orange-500" />
                <div className="mb-1 text-xs text-gray-600 dark:text-zinc-400">
                  日出
                </div>
                <div className="font-semibold tabular-nums">{weather.sunrise}</div>
              </div>
              <div className="h-12 w-px bg-gray-300 dark:bg-zinc-600" />
              <div className="text-center">
                <Sunset size={32} className="mx-auto mb-2 text-orange-600" />
                <div className="mb-1 text-xs text-gray-600 dark:text-zinc-400">
                  日落
                </div>
                <div className="font-semibold tabular-nums">{weather.sunset}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
