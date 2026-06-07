import type { Metadata } from "next";

import { LoginView } from "@/components/login/login-view";

export const metadata: Metadata = {
  title: "登录 · 起势",
  description: "钓有所乐 · 分享每一次收获 — 登录起势",
};

export default function LoginRoutePage() {
  return <LoginView />;
}
