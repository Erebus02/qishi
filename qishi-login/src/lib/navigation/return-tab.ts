/** 与底部 Tab 对应的来源页，用于详情/导航子页「返回」到确定路由 */
export type ReturnTab = "map" | "spots" | "records" | "tools" | "profile";

const TABS = new Set<ReturnTab>(["map", "spots", "records", "tools", "profile"]);

export function parseReturnTab(
  value: string | string[] | undefined
): ReturnTab {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && TABS.has(raw as ReturnTab)) return raw as ReturnTab;
  return "map";
}

export function returnHref(tab: ReturnTab): string {
  return `/${tab}`;
}
