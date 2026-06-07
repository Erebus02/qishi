import type { Metadata } from "next";

import { SpotsView } from "@/components/pages/spots-view";

export const metadata: Metadata = {
  title: "钓点 · 起势",
};

export default function SpotsPage() {
  return <SpotsView />;
}
