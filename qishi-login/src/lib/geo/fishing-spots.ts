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
