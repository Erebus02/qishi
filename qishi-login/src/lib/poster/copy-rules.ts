import {
  type CatchEntry,
  formatCatchSpeciesDisplay,
  type FishingRecord,
} from "@/lib/records/fishing-record-storage";

/** 本地规则生成「AI 风」短文案，后续可替换为通义/GPT */
export function buildPosterTagline(
  record: FishingRecord,
  qtySum: number,
  kgSum: number
): string {
  const maxKg = Math.max(0, ...record.catches.map((c) => c.weightKg));
  const top = record.catches.reduce<CatchEntry | null>((a, c) => {
    if (!a || c.weightKg > a.weightKg) return c;
    return a;
  }, null);
  const topName = top ? formatCatchSpeciesDisplay(top) : "大鱼";

  if (maxKg >= 10) {
    const jin = (maxKg * 2).toFixed(1);
    return `今天起势！约 ${jin} 斤「${topName}」到手，势不可挡！`;
  }
  if (maxKg >= 5) {
    return `起势有鱼！一尾 ${topName} ${maxKg.toFixed(1)} kg，手感拉满！`;
  }
  if (qtySum >= 15) {
    return `爆护预警！${qtySum} 尾入护，${kgSum.toFixed(1)} kg 小高潮～`;
  }
  if (qtySum >= 5) {
    return `稳稳起势，${qtySum} 尾 · ${kgSum.toFixed(1)} kg，下次继续！`;
  }
  return `起势作钓 · ${record.location.slice(0, 12)}${record.location.length > 12 ? "…" : ""}，每一竿都算数！`;
}
