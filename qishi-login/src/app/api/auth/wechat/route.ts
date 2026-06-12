import { NextResponse } from "next/server";

import { issueAuthToken } from "@/lib/server/auth-token";

export const runtime = "nodejs";

export async function POST() {
  const token = issueAuthToken({ login: "wechat" });
  return NextResponse.json({
    ok: true,
    token,
    user: {
      loginType: "wechat" as const,
      label: "微信用户",
    },
  });
}
