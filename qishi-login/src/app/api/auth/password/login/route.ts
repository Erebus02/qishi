import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { issueAuthToken } from "@/lib/server/auth-token";
import { maskMainlandMobile } from "@/lib/server/phone-mask";

export const runtime = "nodejs";

const PHONE_RE = /^1[3-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeStrEq(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function demoAccount(): string {
  return (process.env.AUTH_DEMO_ACCOUNT ?? "13800138000").trim();
}

function demoPassword(): string {
  return process.env.AUTH_DEMO_PASSWORD ?? "qishi123456";
}

/**
 * POST /api/auth/password/login
 * body: { account: string, password: string }
 * 演示账号见环境变量 AUTH_DEMO_ACCOUNT / AUTH_DEMO_PASSWORD（默认 13800138000 / qishi123456）。
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
  const account = String(raw.account ?? "").trim();
  const password = String(raw.password ?? "");

  if (!account || password.length < 6) {
    return NextResponse.json(
      { error: "请输入账号与密码（密码至少 6 位）" },
      { status: 400 }
    );
  }

  const okPhone = PHONE_RE.test(account);
  const okMail = EMAIL_RE.test(account);
  if (!okPhone && !okMail) {
    return NextResponse.json({ error: "账号须为手机号或邮箱" }, { status: 400 });
  }

  const demoAcc = demoAccount();
  const demoPwd = demoPassword();

  if (!safeStrEq(account, demoAcc) || !safeStrEq(password, demoPwd)) {
    return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
  }

  const sub = okPhone ? account : account.toLowerCase();
  const token = issueAuthToken({ login: "password", sub });
  const display =
    okPhone ? maskMainlandMobile(account) : account.replace(/^(.{2}).+(@.+)$/, "$1***$2");

  return NextResponse.json({
    ok: true,
    token,
    user: {
      loginType: "password" as const,
      accountMasked: display,
    },
  });
}
