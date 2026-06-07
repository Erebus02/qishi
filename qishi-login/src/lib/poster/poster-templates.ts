export type PosterTemplateId =
  | "minimal"
  | "cyber"
  | "film"
  | "sunrise"
  | "nature";

export const POSTER_TEMPLATES: Record<
  PosterTemplateId,
  { name: string; bg: string; accent: string; muted: string; fontTitle: string }
> = {
  minimal: {
    name: "简约深蓝",
    bg: "linear-gradient(168deg,#0f172a 0%,#1e293b 55%,#0f172a 100%)",
    accent: "#38bdf8",
    muted: "#94a3b8",
    fontTitle: "ui-sans-serif,system-ui,sans-serif",
  },
  cyber: {
    name: "赛博钓鱼",
    bg: "linear-gradient(160deg,#090014 0%,#1a0a2e 40%,#0b1f3a 100%)",
    accent: "#22d3ee",
    muted: "#a5b4fc",
    fontTitle: "ui-sans-serif,system-ui,sans-serif",
  },
  film: {
    name: "复古胶片",
    bg: "linear-gradient(175deg,#2a1b12 0%,#4a3224 50%,#1f140e 100%)",
    accent: "#fbbf24",
    muted: "#d6c4b0",
    fontTitle: "Georgia,serif",
  },
  sunrise: {
    name: "日出湖景",
    bg: "linear-gradient(180deg,#0c4a6e 0%,#f97316 45%,#fde68a 100%)",
    accent: "#fff7ed",
    muted: "#e0f2fe",
    fontTitle: "ui-sans-serif,system-ui,sans-serif",
  },
  nature: {
    name: "自然绿调",
    bg: "linear-gradient(165deg,#052e16 0%,#166534 50%,#14532d 100%)",
    accent: "#bbf7d0",
    muted: "#86efac",
    fontTitle: "ui-sans-serif,system-ui,sans-serif",
  },
};

export const POSTER_TEMPLATE_LIST = Object.entries(POSTER_TEMPLATES).map(
  ([id, v]) => ({ id: id as PosterTemplateId, ...v })
);
