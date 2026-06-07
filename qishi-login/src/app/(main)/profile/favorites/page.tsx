import type { Metadata } from "next";

import { ProfileFavoritesContent } from "@/components/profile/profile-favorites-content";
import { ProfileSubPageShell } from "@/components/profile/profile-sub-page-shell";

export const metadata: Metadata = {
  title: "收藏的钓点 · 起势",
};

export default function ProfileFavoritesPage() {
  return (
    <ProfileSubPageShell title="收藏的钓点">
      <ProfileFavoritesContent />
    </ProfileSubPageShell>
  );
}
