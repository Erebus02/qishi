import type { Metadata } from "next";

import { RecordsView } from "@/components/pages/records-view";

export const metadata: Metadata = {
  title: "作钓记录 · 起势",
};

export default function RecordsPage() {
  return <RecordsView />;
}
