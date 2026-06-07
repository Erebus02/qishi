import type { Metadata } from "next";

import { FishAiView } from "@/components/pages/fish-ai-view";

export const metadata: Metadata = {
  title: "AI 识鱼 · 起势",
};

export default function FishAiPage() {
  return <FishAiView />;
}
