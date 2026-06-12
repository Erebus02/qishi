import type { UserMarkedSpot } from "@/lib/spots/user-marked-spots";
import { loadUserMarkedSpots } from "@/lib/spots/user-marked-spots";

/**
 * 解析关联钓点名称。平台钓点可传入 API 拉取后的 id→name，避免依赖静态兜底。
 */
export function resolveLinkedSpotName(
  linkedSpotId: string,
  userSpots?: UserMarkedSpot[],
  platformSpotNames?: Record<string, string>
): string {
  const users = userSpots ?? loadUserMarkedSpots();
  const u = users.find((s) => s.id === linkedSpotId);
  if (u) return u.name;
  const fromApi = platformSpotNames?.[linkedSpotId];
  if (fromApi) return fromApi;
  return linkedSpotId;
}

/** 钓友标记钓点的收费说明；非标记 id 或无记录时返回 null */
export function resolveLinkedSpotFeeNote(
  linkedSpotId: string,
  userSpots?: UserMarkedSpot[]
): string | null {
  if (!linkedSpotId.startsWith("u-")) return null;
  const users = userSpots ?? loadUserMarkedSpots();
  const u = users.find((s) => s.id === linkedSpotId);
  const t = u?.feeNote?.trim();
  return t || null;
}
