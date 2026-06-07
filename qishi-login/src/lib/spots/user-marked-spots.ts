import { isWaterSpotCategory } from "@/lib/geo/water-spot-category";

export type UserMarkedSpot = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  createdAt: string;
  /** 收费说明，如「免费」「¥80/天」；旧数据可能无此字段 */
  feeNote?: string;
  /** 水域类型；与作钓记录保存时勾选一致 */
  waterCategory?: string;
};

const STORAGE_KEY = "qishi:user-marked-spots:v1";

function safeParse(raw: string | null): UserMarkedSpot[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(isValid);
  } catch {
    return [];
  }
}

function isValid(x: unknown): x is UserMarkedSpot {
  if (!x || typeof x !== "object") return false;
  const s = x as UserMarkedSpot;
  if (
    typeof s.id !== "string" ||
    !s.id.startsWith("u-") ||
    typeof s.name !== "string" ||
    typeof s.lat !== "number" ||
    typeof s.lng !== "number" ||
    typeof s.createdAt !== "string"
  ) {
    return false;
  }
  if (s.feeNote != null && typeof s.feeNote !== "string") return false;
  if (s.waterCategory != null) {
    if (typeof s.waterCategory !== "string" || !isWaterSpotCategory(s.waterCategory)) {
      return false;
    }
  }
  return true;
}

export function loadUserMarkedSpots(): UserMarkedSpot[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function saveUserMarkedSpots(spots: UserMarkedSpot[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(spots));
}

export function newUserSpotId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `u-${crypto.randomUUID()}`;
  }
  return `u-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function addUserMarkedSpot(input: {
  name: string;
  lat: number;
  lng: number;
  /** 收费说明；可空字符串表示未填 */
  feeNote?: string;
  /** 水域：水库、湖泊、江河、黑坑 */
  waterCategory?: string;
}): UserMarkedSpot {
  const fee = input.feeNote?.trim() ?? "";
  const wc = input.waterCategory?.trim();
  const spot: UserMarkedSpot = {
    id: newUserSpotId(),
    name: input.name.trim(),
    lat: input.lat,
    lng: input.lng,
    createdAt: new Date().toISOString(),
    ...(fee ? { feeNote: fee } : {}),
    ...(wc && isWaterSpotCategory(wc) ? { waterCategory: wc } : {}),
  };
  const all = loadUserMarkedSpots();
  saveUserMarkedSpots([spot, ...all]);
  return spot;
}

export function removeUserMarkedSpot(id: string): void {
  saveUserMarkedSpots(loadUserMarkedSpots().filter((s) => s.id !== id));
}

/** 每位钓友每日最多新增的标记钓点数 */
export const USER_SPOT_DAILY_LIMIT = 3;

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 本地日历「今天」已保存的标记钓点数量 */
export function countUserMarkedSpotsToday(): number {
  const key = toLocalDateKey(new Date());
  return loadUserMarkedSpots().filter(
    (s) => toLocalDateKey(new Date(s.createdAt)) === key
  ).length;
}

export function canAddUserMarkedSpotToday(): boolean {
  return countUserMarkedSpotsToday() < USER_SPOT_DAILY_LIMIT;
}

export function remainingUserSpotQuotaToday(): number {
  return Math.max(0, USER_SPOT_DAILY_LIMIT - countUserMarkedSpotsToday());
}
