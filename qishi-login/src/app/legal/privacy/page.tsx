import type { Metadata } from "next";

import { PrivacyPolicyArticle } from "@/components/legal/legal-articles";
import { LegalDocShell } from "@/components/legal/legal-doc-shell";

export const metadata: Metadata = {
  title: "隐私政策 · 起势",
  description: "起势应用隐私政策：个人信息收集、使用、存储与您的权利说明。",
};

export default function LegalPrivacyPage() {
  return (
    <LegalDocShell title="隐私政策">
      <PrivacyPolicyArticle />
    </LegalDocShell>
  );
}
