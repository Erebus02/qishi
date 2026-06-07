import { isWaterSpotCategory } from "@/lib/geo/water-spot-category";

export type CatchEntry = {
  species: string;
  quantity: number;
  weightKg: number;
  /** 当 [species] 为「其它」时，填写具体鱼种名称（可选字段，仅此时使用） */
  speciesOtherNote?: string;
};

export type FishingRecord = {
  id: string;
  createdAt: string;
  location: string;
  /** 作钓水域：水库、湖泊、江河、黑坑 */
  waterCategory?: string;
  catches: CatchEntry[];
  notes: string;
  /** 关联的官方钓点 id（如 "1"）或钓友标记 id（u- 开头） */
  linkedSpotId?: string;
  /** 本次作钓对该钓点的评分，1～5 星；仅在与 linkedSpotId 同时存在时有效 */
  spotRatingStars?: number;
  /** 分享海报用：最多 3 张 JPEG data URL（保存时从实拍压缩生成） */
  sharePhotos?: string[];
};

const STORAGE_KEY = "qishi:fishing-records:v1";

function safeParse(raw: string | null): FishingRecord[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(isValidRecord);
  } catch {
    return [];
  }
}

function isValidRecord(x: unknown): x is FishingRecord {
  if (!x || typeof x !== "object") return false;
  const r = x as FishingRecord;
  if (
    typeof r.id !== "string" ||
    typeof r.createdAt !== "string" ||
    typeof r.location !== "string" ||
    typeof r.notes !== "string" ||
    !Array.isArray(r.catches) ||
    !r.catches.every((c) => {
      if (
        !c ||
        typeof c.species !== "string" ||
        typeof c.quantity !== "number" ||
        typeof c.weightKg !== "number"
      ) {
        return false;
      }
      if (
        c.speciesOtherNote != null &&
        typeof c.speciesOtherNote !== "string"
      ) {
        return false;
      }
      return true;
    })
  ) {
    return false;
  }
  if (r.waterCategory != null) {
    if (typeof r.waterCategory !== "string" || !isWaterSpotCategory(r.waterCategory)) {
      return false;
    }
  }
  if (r.linkedSpotId != null && typeof r.linkedSpotId !== "string") {
    return false;
  }
  if (r.spotRatingStars != null) {
    if (
      typeof r.spotRatingStars !== "number" ||
      r.spotRatingStars < 1 ||
      r.spotRatingStars > 5 ||
      Number.isNaN(r.spotRatingStars)
    ) {
      return false;
    }
    if (!r.linkedSpotId) return false;
  }
  if (r.sharePhotos != null) {
    if (!Array.isArray(r.sharePhotos) || r.sharePhotos.length > 3) {
      return false;
    }
    if (
      !r.sharePhotos.every(
        (u) => typeof u === "string" && u.length > 0 && u.length < 2_500_000
      )
    ) {
      return false;
    }
  }
  return true;
}

/** 列表 / 分享等处的鱼种展示文案 */
export function formatCatchSpeciesDisplay(c: CatchEntry): string {
  const sp = c.species.trim();
  const note = c.speciesOtherNote?.trim();
  if (sp === "其它" && note) {
    return `其它（${note}）`;
  }
  return c.species;
}

export function loadFishingRecords(): FishingRecord[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function saveFishingRecords(records: FishingRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function newRecordId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function aggregateStats(records: FishingRecord[]) {
  let totalQty = 0;
  let totalKg = 0;
  for (const r of records) {
    for (const c of r.catches) {
      totalQty += Math.max(0, Math.floor(c.quantity));
      totalKg += Math.max(0, c.weightKg);
    }
  }
  return {
    trips: records.length,
    totalQty,
    totalKg,
  };
}

/** 根据作钓记录汇总各钓点「钓友评分」平均分与条数 */
export function aggregateSpotRatingsFromRecords(
  records: FishingRecord[]
): Record<string, { avg: number; count: number }> {
  const acc: Record<string, { sum: number; count: number }> = {};
  for (const r of records) {
    const id = r.linkedSpotId;
    const stars = r.spotRatingStars;
    if (!id || stars == null || stars < 1 || stars > 5) continue;
    if (!acc[id]) acc[id] = { sum: 0, count: 0 };
    acc[id].sum += stars;
    acc[id].count += 1;
  }
  const out: Record<string, { avg: number; count: number }> = {};
  for (const id of Object.keys(acc)) {
    const { sum, count } = acc[id]!;
    out[id] = { avg: sum / count, count };
  }
  return out;
}

/** 各钓点在作钓记录中的关联条数（含仅关联、未打分的记录） */
export function linkageCountsBySpotId(
  records: FishingRecord[]
): Record<string, number> {
  const m: Record<string, number> = {};
  for (const r of records) {
    const id = r.linkedSpotId;
    if (!id) continue;
    m[id] = (m[id] ?? 0) + 1;
  }
  return m;
}
