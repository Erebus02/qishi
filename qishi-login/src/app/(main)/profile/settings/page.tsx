import type { Metadata } from "next";

import { ProfileSettingsContent } from "@/components/profile/profile-settings-content";
import { ProfileSubPageShell } from "@/components/profile/profile-sub-page-shell";

export const metadata: Metadata = {
  title: "设置 · 起势",
};

export default function ProfileSettingsPage() {
  return (
    <ProfileSubPageShell title="设置">
      <ProfileSettingsContent />
    </ProfileSubPageShell>
  );
}
