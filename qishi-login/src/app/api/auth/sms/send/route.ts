import { NextResponse } from "next/server";

import { createAndStoreSmsCode, canSendSms } from "@/lib/server/sms-code-store";

const PHONE_RE = /^1[3-9]\d{9}$/;

export const runtime = "nodejs";

/**
 * POST /api/auth/sms/send
 * body: { phone: string }
 * 开发环境可在响应中带 debugCode；生产接入阿里云等短信后删除。
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }
  const phone =
    typeof body === "object" && body !== null && "phone" in body
      ? String((body as { phone: unknown }).phone ?? "").trim()
      : "";

  if (!PHONE_RE.test(phone)) {
    return NextResponse.json({ error: "请输入正确的 11 位手机号" }, { status: 400 });
  }

  const gate = canSendSms(phone);
  if (!gate.ok) {
    return NextResponse.json(
      { error: `发送过于频繁，请 ${gate.retryAfterSec} 秒后再试`, cooldownSeconds: gate.retryAfterSec },
      { status: 429 }
    );
  }

  const code = createAndStoreSmsCode(phone);

  const debug =
    process.env.NODE_ENV === "development" || process.env.SMS_DEBUG === "1";

  if (process.env.NODE_ENV === "development") {
    console.info(`[sms][dev] ${phone} 验证码: ${code}`);
  }

  return NextResponse.json({
    ok: true,
    cooldownSeconds: 60,
    ...(debug ? { debugCode: code } : {}),
  });
}
