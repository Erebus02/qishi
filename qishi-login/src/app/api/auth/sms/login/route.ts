import { NextResponse } from "next/server";

import { issueAuthToken } from "@/lib/server/auth-token";
import { maskMainlandMobile } from "@/lib/server/phone-mask";
import { verifyAndConsumeSmsCode } from "@/lib/server/sms-code-store";

const PHONE_RE = /^1[3-9]\d{9}$/;

export const runtime = "nodejs";

/**
 * POST /api/auth/sms/login
 * body: { phone: string, code: string }
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }
  const raw =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const phone = String(raw.phone ?? "").trim();
  const code = String(raw.code ?? "").trim();

  if (!PHONE_RE.test(phone)) {
    return NextResponse.json({ error: "手机号格式不正确" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "请输入 6 位验证码" }, { status: 400 });
  }

  if (!verifyAndConsumeSmsCode(phone, code)) {
    return NextResponse.json({ error: "验证码错误或已过期，请重新获取" }, { status: 401 });
  }

  const token = issueAuthToken({ login: "sms", sub: phone });
  return NextResponse.json({
    ok: true,
    token,
    user: {
      loginType: "sms" as const,
      phoneMasked: maskMainlandMobile(phone),
    },
  });
}
