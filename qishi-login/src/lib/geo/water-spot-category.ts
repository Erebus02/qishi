/** 与钓点 Tab、作钓记录、后台库字段一致的水域分类 */
export const WATER_SPOT_CATEGORIES = ["水库", "湖泊", "江河", "黑坑"] as const;

export type WaterSpotCategory = (typeof WATER_SPOT_CATEGORIES)[number];

export function isWaterSpotCategory(s: string): s is WaterSpotCategory {
  return (WATER_SPOT_CATEGORIES as readonly string[]).includes(s);
}
