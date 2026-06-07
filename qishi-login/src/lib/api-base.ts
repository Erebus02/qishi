/**
 * 外置后端（如 qishi-login-server）根地址，无尾部斜杠。
 * 仅用于该后端的接口（如 /api/spots）；Next 自带的 Route Handler 不要用 apiUrl。
 */
export function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
}

export function apiUrl(path: string): string {
  const base = apiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

/** 本 Next 应用内的 Route Handlers（/api/...），始终与当前页面同域。 */
export function nextRouteApi(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}
