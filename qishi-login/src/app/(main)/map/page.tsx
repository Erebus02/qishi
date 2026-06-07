import type { Metadata } from "next";

import { MapHomeDynamic } from "@/components/map/map-home-dynamic";

export const metadata: Metadata = {
  title: "地图 · 起势",
};

/** 首页：在 flex 链里占满「视口 − 底栏」，地图容器才有非零高度 */
export default function MapPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MapHomeDynamic />
    </div>
  );
}
