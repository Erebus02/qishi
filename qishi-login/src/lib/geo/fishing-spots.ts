import type { WaterSpotCategory } from "@/lib/geo/water-spot-category";

/** 类型与本地兜底数据（API 不可用时使用） */
export type FishingSpot = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** 水域：水库、湖泊、江河、黑坑（与钓点 Tab、作钓记录、后台一致） */
  waterCategory?: WaterSpotCategory;
  fish?: string;
  /** 地区关键词，用于搜索 */
  region?: string;
  distanceLabel?: string;
  rating?: number;
};

export type MapCenter = { lat: number; lng: number };

export const DEFAULT_MAP_CENTER: MapCenter = { lat: 30.544, lng: 114.429 };

/** 无后端或未配置 NEXT_PUBLIC_API_BASE_URL 时的演示数据 */
export const FALLBACK_FISHING_SPOTS: FishingSpot[] = [
  {
    id: "1",
    name: "东湖钓点",
    lat: 30.5521,
    lng: 114.4382,
    waterCategory: "湖泊",
    fish: "草鱼、鲤鱼",
    region: "武汉 东湖",
    distanceLabel: "2.3km",
    rating: 4.5,
  },
  {
    id: "2",
    name: "西山水库",
    lat: 30.4984,
    lng: 114.3821,
    waterCategory: "水库",
    fish: "鲈鱼、黑鱼",
    region: "武汉 西山",
    distanceLabel: "5.6km",
    rating: 4.8,
  },
  {
    id: "3",
    name: "渔乐钓场",
    lat: 30.5198,
    lng: 114.4095,
    waterCategory: "黑坑",
    region: "武汉",
    distanceLabel: "12.1km",
    rating: undefined,
  },
  {
    id: "4",
    name: "青龙湖",
    lat: 30.5602,
    lng: 114.3598,
    waterCategory: "湖泊",
    region: "武汉 江夏",
    distanceLabel: "16.7km",
    rating: 4.13,
  },
];

export function getFallbackFishingSpotById(id: string): FishingSpot | undefined {
  return FALLBACK_FISHING_SPOTS.find((s) => s.id === id);
}
