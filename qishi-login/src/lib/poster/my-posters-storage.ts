const KEY = "qishi:my-posters:v1";
const MAX_ITEMS = 24;

export type MyPosterItem = {
  id: string;
  createdAt: string;
  recordId: string;
  templateId: string;
  /** 小缩略图，便于「我的海报」列表 */
  thumbDataUrl: string;
};

function safeParse(raw: string | null): MyPosterItem[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(
      (x): x is MyPosterItem =>
        x &&
        typeof x === "object" &&
        typeof (x as MyPosterItem).id === "string" &&
        typeof (x as MyPosterItem).createdAt === "string" &&
        typeof (x as MyPosterItem).recordId === "string" &&
        typeof (x as MyPosterItem).templateId === "string" &&
        typeof (x as MyPosterItem).thumbDataUrl === "string"
    );
  } catch {
    return [];
  }
}

export function loadMyPosters(): MyPosterItem[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY));
}

export function saveMyPoster(item: MyPosterItem): void {
  if (typeof window === "undefined") return;
  const next = [item, ...loadMyPosters()].slice(0, MAX_ITEMS);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}
