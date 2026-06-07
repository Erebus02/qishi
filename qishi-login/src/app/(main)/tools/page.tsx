import type { Metadata } from "next";

import { ToolboxView } from "@/components/pages/toolbox-view";

export const metadata: Metadata = {
  title: "工具箱 · 起势",
};

export default function ToolsPage() {
  return <ToolboxView />;
}
