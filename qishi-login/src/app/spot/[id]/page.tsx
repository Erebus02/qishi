import type { Metadata } from "next";

import { SpotDetailView } from "@/components/pages/spot-detail-view";
import { fetchSpotByIdServer } from "@/lib/geo/spots-api";
import { parseReturnTab } from "@/lib/navigation/return-tab";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const spot = await fetchSpotByIdServer(id);
  return {
    title: spot ? `${spot.name} · 钓点 · 起势` : `钓点 ${id} · 起势`,
  };
}

export default async function SpotDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const returnTab = parseReturnTab(sp.from);
  const spot = await fetchSpotByIdServer(id);
  const spotName = spot?.name ?? `钓点 ${id}`;
  return <SpotDetailView spotId={id} spotName={spotName} returnTab={returnTab} />;
}
