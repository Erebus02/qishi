import { NextResponse } from "next/server";

import { issueAuthToken } from "@/lib/server/auth-token";

export const runtime = "nodejs";

/** POST /api/auth/device — 本机一键登录（演示：直接签发会话，不接运营商网关） */
export async function POST() {
  const token = issueAuthToken({ login: "device" });
  return NextResponse.json({
    ok: true,
    token,
    user: {
      loginType: "device" as const,
      label: "本机访客",
    },
  });
}
