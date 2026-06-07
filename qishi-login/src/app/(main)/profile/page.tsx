import type { Metadata } from "next";

import { ProfileView } from "@/components/pages/profile-view";

export const metadata: Metadata = {
  title: "我的 · 起势",
};

export default function ProfilePage() {
  return <ProfileView />;
}
