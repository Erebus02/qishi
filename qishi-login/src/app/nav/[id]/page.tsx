import type { Metadata } from "next";

import { NavRouteDynamic } from "@/components/map/nav-route-dynamic";
import { fetchSpotByIdServer } from "@/lib/geo/spots-api";
import { parseReturnTab } from "@/lib/navigation/return-tab";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const spot = await fetchSpotByIdServer(id);
  return { title: spot ? `导航 · ${spot.name}` : "导航 · 起势" };
}

export default async function NavPage({ params, searchParams }: Props) {
  const { id } = await params;
  const spot = await fetchSpotByIdServer(id);
  const sp = await searchParams;
  const returnTab = parseReturnTab(sp.from);
  return (
    <NavRouteDynamic
      spotId={id}
      returnTab={returnTab}
      initialSpot={spot}
    />
  );
}
