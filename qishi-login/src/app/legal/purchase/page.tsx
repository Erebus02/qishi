import type { Metadata } from "next";

import { PurchaseAgreementArticle } from "@/components/legal/legal-articles";
import { LegalDocShell } from "@/components/legal/legal-doc-shell";

export const metadata: Metadata = {
  title: "购买协议 · 起势",
  description: "起势付费与增值服务购买协议：订单、支付、退款与争议解决。",
};

export default function LegalPurchasePage() {
  return (
    <LegalDocShell title="购买协议">
      <PurchaseAgreementArticle />
    </LegalDocShell>
  );
}
