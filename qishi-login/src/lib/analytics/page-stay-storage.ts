export const PAGE_STAY_STORAGE_KEY = "qishi:page-stay:v1";

const MAX_ENTRIES = 1200;
const MIN_DURATION_MS = 1000;
const MAX_DURATION_MS = 8 * 60 * 60 * 1000;

export type PageStayEntry = {
  id: string;
  path: string;
  title: string;
  startAt: string;
  endAt: string;
  durationMs: number;
  userLabel?: string;
};

export type PageStaySummaryRow = {
  path: string;
  title: string;
  visits: number;
  totalMs: number;
  avgMs: number;
  lastAt: string;
};

function isEntry(raw: unknown): raw is PageStayEntry {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.path === "string" &&
    typeof o.title === "string" &&
    typeof o.startAt === "string" &&
    typeof o.endAt === "string" &&
    typeof o.durationMs === "number" &&
    Number.isFinite(o.durationMs)
  );
}

export function loadPageStayEntries(): PageStayEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PAGE_STAY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

export function savePageStayEntries(entries: PageStayEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PAGE_STAY_STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_ENTRIES))
    );
  } catch {
    /* ignore private mode / quota errors */
  }
}

export function clearPageStayEntries(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PAGE_STAY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function recordPageStay(input: Omit<PageStayEntry, "id">): void {
  const durationMs = Math.round(input.durationMs);
  if (
    !Number.isFinite(durationMs) ||
    durationMs < MIN_DURATION_MS ||
    durationMs > MAX_DURATION_MS
  ) {
    return;
  }

  const entry: PageStayEntry = {
    ...input,
    id: `stay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    durationMs,
  };
  savePageStayEntries([entry, ...loadPageStayEntries()]);
}

export function summarizePageStay(entries: PageStayEntry[]) {
  const totalMs = entries.reduce((sum, entry) => sum + entry.durationMs, 0);
  const pageMap = new Map<string, PageStaySummaryRow>();

  for (const entry of entries) {
    const key = entry.path;
    const current = pageMap.get(key);
    if (!current) {
      pageMap.set(key, {
        path: entry.path,
        title: entry.title,
        visits: 1,
        totalMs: entry.durationMs,
        avgMs: entry.durationMs,
        lastAt: entry.endAt,
      });
      continue;
    }
    current.visits += 1;
    current.totalMs += entry.durationMs;
    current.avgMs = current.totalMs / current.visits;
    if (new Date(entry.endAt).getTime() > new Date(current.lastAt).getTime()) {
      current.lastAt = entry.endAt;
    }
  }

  const pages = Array.from(pageMap.values()).sort((a, b) => b.totalMs - a.totalMs);
  return {
    entries,
    pages,
    totalMs,
    totalVisits: entries.length,
    avgMs: entries.length ? totalMs / entries.length : 0,
  };
}

export function formatStayDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0秒";
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}小时${minutes}分`;
  if (minutes > 0) return `${minutes}分${seconds}秒`;
  return `${seconds}秒`;
}

export function formatStayTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
