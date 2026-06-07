"use client";

import dynamic from "next/dynamic";

/**
 * 必须在 Client Component 内使用 `ssr: false`（App Router 的 Server Component 中不允许）。
 * 避免 Leaflet 在服务端执行导致 `window is not defined`。
 */
export const MapHomeDynamic = dynamic(
  () =>
    import("@/components/map/map-home-screen").then((m) => m.MapHomeScreen),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-gray-100 text-sm text-gray-500 dark:bg-zinc-900 dark:text-zinc-400">
        地图加载中…
      </div>
    ),
  }
);
