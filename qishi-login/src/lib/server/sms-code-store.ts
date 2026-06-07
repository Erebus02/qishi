import { randomInt, timingSafeEqual } from "node:crypto";

type Entry = {
  code: string;
  expiresAt: number;
};

/** 内存验证码（开发/单机进程有效；生产请换 Redis + 短信网关） */
const codes = new Map<string, Entry>();
const lastSendAt = new Map<string, number>();

const SEND_INTERVAL_MS = 60_000;
const CODE_TTL_MS = 15 * 60_000;

export function canSendSms(phone: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const last = lastSendAt.get(phone);
  if (last != null) {
    const elapsed = Date.now() - last;
    if (elapsed < SEND_INTERVAL_MS) {
      return { ok: false, retryAfterSec: Math.ceil((SEND_INTERVAL_MS - elapsed) / 1000) };
    }
  }
  return { ok: true };
}

export function createAndStoreSmsCode(phone: string): string {
  const code = String(randomInt(100000, 1000000));
  codes.set(phone, { code, expiresAt: Date.now() + CODE_TTL_MS });
  lastSendAt.set(phone, Date.now());
  return code;
}

export function verifyAndConsumeSmsCode(phone: string, input: string): boolean {
  const row = codes.get(phone);
  if (!row || row.expiresAt < Date.now()) {
    codes.delete(phone);
    return false;
  }
  const a = Buffer.from(row.code.padStart(6, "0"), "utf8");
  const b = Buffer.from(input.trim().padStart(6, "0"), "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  codes.delete(phone);
  return true;
}
