import type { Metadata } from "next";

import { ProfileJournalContent } from "@/components/profile/profile-journal-content";
import { ProfileSubPageShell } from "@/components/profile/profile-sub-page-shell";

export const metadata: Metadata = {
  title: "我的作钓日志 · 起势",
};

export default function ProfileJournalPage() {
  return (
    <ProfileSubPageShell title="我的作钓日志">
      <ProfileJournalContent />
    </ProfileSubPageShell>
  );
}
