"use client";

import dynamic from "next/dynamic";

import type { FishingSpot } from "@/lib/geo/fishing-spots";
import type { ReturnTab } from "@/lib/navigation/return-tab";

const NavRouteClientInner = dynamic(
  () =>
    import("@/components/map/nav-route-client").then((m) => m.NavRouteClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50dvh] items-center justify-center bg-gray-100 text-sm text-gray-500 dark:bg-zinc-900 dark:text-zinc-400">
        导航地图加载中…
      </div>
    ),
  }
);

export function NavRouteDynamic({
  spotId,
  returnTab,
  initialSpot,
}: {
  spotId: string;
  returnTab: ReturnTab;
  initialSpot?: FishingSpot | null;
}) {
  return (
    <NavRouteClientInner
      spotId={spotId}
      returnTab={returnTab}
      initialSpot={initialSpot}
    />
  );
}
