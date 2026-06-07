"use client";

const KEY = "qishi-auth-session";

export type AuthUser = {
  loginType: "sms" | "password" | "device";
  phoneMasked?: string;
  accountMasked?: string;
  label?: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export function saveAuthSession(session: AuthSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* 私密模式等 */
  }
}

export function loadAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as AuthSession;
    if (!data?.token || !data?.user) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
