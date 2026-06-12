import { createHmac, timingSafeEqual } from "node:crypto";

export type AuthTokenPayload = {
  /** 登录方式 */
  login: "sms" | "password" | "device" | "wechat";
  /** 规范化账号（可为手机号） */
  sub?: string;
  exp: number;
};

function getSecret(): string {
  return process.env.AUTH_SECRET ?? "dev-qishi-auth-secret-change-me";
}

export function issueAuthToken(partial: Omit<AuthTokenPayload, "exp">): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload: AuthTokenPayload = { ...partial, exp };
  const raw = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(raw).digest("base64url");
  return `${raw}.${sig}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const raw = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = createHmac("sha256", getSecret()).update(raw).digest("base64url");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8")
    ) as AuthTokenPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
