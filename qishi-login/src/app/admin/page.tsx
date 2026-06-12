import type { Metadata } from "next";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import {
  DEFAULT_MAP_CENTER,
  FALLBACK_FISHING_SPOTS,
} from "@/lib/geo/fishing-spots";

export const metadata: Metadata = {
  title: "管理后台 · 起势",
  description: "起势钓点数据管理后台",
};

export default function AdminPage() {
  return (
    <AdminDashboard
      initialSpots={FALLBACK_FISHING_SPOTS}
      defaultCenter={DEFAULT_MAP_CENTER}
    />
  );
}
