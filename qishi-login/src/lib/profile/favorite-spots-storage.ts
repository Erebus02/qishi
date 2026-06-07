const KEY = "qishi:favorite-spot-ids:v1";

/** 收藏列表变更后派发，用于刷新「我的」计数与各页心形状态 */
export const FAVORITES_CHANGED_EVENT = "qishi:favorites-changed";

function notifyFavoritesChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
}

export function loadFavoriteSpotIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function saveFavoriteSpotIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(ids));
  notifyFavoritesChanged();
}

/** @returns 操作后是否已收藏 */
export function toggleFavoriteSpotId(spotId: string): boolean {
  const cur = loadFavoriteSpotIds();
  const set = new Set(cur);
  const had = set.has(spotId);
  if (had) set.delete(spotId);
  else set.add(spotId);
  saveFavoriteSpotIds([...set]);
  return !had;
}

export function isFavoriteSpotId(spotId: string): boolean {
  return loadFavoriteSpotIds().includes(spotId);
}
