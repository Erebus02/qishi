"use client";

import { forwardRef } from "react";

import {
  formatCatchSpeciesDisplay,
  type FishingRecord,
} from "@/lib/records/fishing-record-storage";
import {
  POSTER_TEMPLATES,
  type PosterTemplateId,
} from "@/lib/poster/poster-templates";

function formatPosterDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type PosterPreviewProps = {
  templateId: PosterTemplateId;
  /** 覆盖模板背景（如用户自选渐变） */
  customBg?: string | null;
  headline: string;
  record: FishingRecord;
  qtySum: number;
  kgSum: number;
  photos: string[];
  photoFilterCss: string;
};

/** 竖版 1080×1920，供 html-to-image 导出 */
export const PosterPreview = forwardRef<HTMLDivElement, PosterPreviewProps>(
  function PosterPreview(
    {
      templateId,
      customBg,
      headline,
      record,
      qtySum,
      kgSum,
      photos,
      photoFilterCss,
    },
    ref
  ) {
    const t = POSTER_TEMPLATES[templateId];
    const bg = customBg?.trim() || t.bg;
    const maxKg = Math.max(0, ...record.catches.map((c) => c.weightKg));
    const topSpecies = [...record.catches]
      .sort((a, b) => b.weightKg - a.weightKg)
      .slice(0, 3)
      .map((c) => formatCatchSpeciesDisplay(c))
      .join(" · ");

    return (
      <div
        ref={ref}
        className="relative box-border overflow-hidden text-left"
        style={{
          width: 1080,
          height: 1920,
          background: bg,
          fontFamily: t.fontTitle,
          color: t.accent,
        }}
      >
        <div
          className="absolute right-10 top-10 rounded-full border-2 px-5 py-2 text-3xl font-black tracking-tight"
          style={{ borderColor: t.accent, color: t.accent }}
        >
          起势
        </div>

        <div className="absolute bottom-12 right-10 text-2xl font-semibold opacity-70" style={{ color: t.muted }}>
          起势 QISHI
        </div>

        <div className="flex h-full flex-col px-16 pb-24 pt-36">
          <p className="mb-4 text-4xl font-semibold leading-tight" style={{ color: t.muted }}>
            作钓记录
          </p>
          <h1
            className="mb-8 line-clamp-3 text-6xl font-black leading-[1.1]"
            style={{ color: t.accent }}
          >
            {record.location}
          </h1>

          <p className="mb-10 text-3xl leading-relaxed" style={{ color: t.muted }}>
            {formatPosterDate(record.createdAt)}
            <br />
            <span className="opacity-90">时长：以现场为准</span>
          </p>

          <div
            className="mb-10 rounded-3xl border-2 p-10"
            style={{ borderColor: `${t.accent}55` }}
          >
            <p className="mb-4 text-3xl font-bold" style={{ color: t.muted }}>
              渔获高光
            </p>
            <p className="text-8xl font-black tabular-nums" style={{ color: t.accent }}>
              {maxKg > 0 ? maxKg.toFixed(1) : "—"}
              <span className="ml-2 text-5xl font-bold">kg</span>
            </p>
            <p className="mt-4 text-3xl" style={{ color: t.muted }}>
              共 {qtySum} 尾 · 总重 {kgSum.toFixed(1)} kg
            </p>
            <p className="mt-3 text-2xl leading-snug opacity-95" style={{ color: t.muted }}>
              {topSpecies || "—"}
            </p>
          </div>

          {/* 轨迹示意（无真实 GPS 时用装饰线） */}
          <div className="mb-10 flex flex-1 flex-col justify-end">
            <p className="mb-3 text-2xl font-semibold" style={{ color: t.muted }}>
              轨迹 / 标点
            </p>
            <svg viewBox="0 0 900 120" className="h-28 w-full" aria-hidden>
              <defs>
                <linearGradient id="route" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={t.accent} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={t.accent} stopOpacity="1" />
                </linearGradient>
              </defs>
              <path
                d="M20,80 Q220,20 400,70 T780,40"
                fill="none"
                stroke="url(#route)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <circle cx="120" cy="55" r="10" fill={t.accent} />
              <circle cx="420" cy="68" r="10" fill={t.accent} />
              <circle cx="720" cy="42" r="12" fill={t.accent} />
            </svg>
          </div>

          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {photos.slice(0, 3).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${i}-${src.slice(0, 40)}`}
                  src={src}
                  alt=""
                  className="h-72 w-full rounded-2xl object-cover"
                  style={{ filter: photoFilterCss }}
                />
              ))}
            </div>
          ) : (
            <div
              className="flex h-72 items-center justify-center rounded-2xl border-2 border-dashed text-3xl"
              style={{ borderColor: `${t.accent}44`, color: t.muted }}
            >
              本次无实拍图 · 海报同样精彩
            </div>
          )}

          <div
            className="mt-10 rounded-3xl px-8 py-8 text-4xl font-bold leading-snug"
            style={{
              background: `${t.accent}18`,
              color: t.accent,
            }}
          >
            {headline}
          </div>
        </div>
      </div>
    );
  }
);
