"use client";

import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buildPosterTagline } from "@/lib/poster/copy-rules";
import { loadMyPosters, saveMyPoster } from "@/lib/poster/my-posters-storage";
import {
  POSTER_TEMPLATE_LIST,
  type PosterTemplateId,
} from "@/lib/poster/poster-templates";
import { dataUrlToJpegThumb } from "@/lib/poster/thumbnail-data-url";
import { downloadDataUrl } from "@/lib/records/photo-fish-label";
import type { FishingRecord } from "@/lib/records/fishing-record-storage";
import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

import { PosterPreview } from "./poster-preview";

const PHOTO_FILTER_CSS: Record<string, string> = {
  none: "none",
  vivid: "saturate(1.28) contrast(1.08)",
  warm: "sepia(0.18) saturate(1.12) brightness(1.02)",
  cool: "saturate(0.92) hue-rotate(-10deg) brightness(1.02)",
  mono: "grayscale(1) contrast(1.06)",
};

const BG_MOOD: { id: string; label: string; value: string | null }[] = [
  { id: "tpl", label: "随模板", value: null },
  {
    id: "clear",
    label: "晴光",
    value: "linear-gradient(180deg,#38bdf8 0%,#fef08a 100%)",
  },
  {
    id: "rain",
    label: "阴雨",
    value: "linear-gradient(175deg,#334155 0%,#64748b 45%,#1e293b 100%)",
  },
  {
    id: "dusk",
    label: "暮色",
    value: "linear-gradient(165deg,#4c1d95 0%,#fb7185 55%,#312e81 100%)",
  },
  {
    id: "forest",
    label: "森野",
    value: "linear-gradient(170deg,#14532d 0%,#4ade80 40%,#052e16 100%)",
  },
];

async function dataUrlToPngFile(
  dataUrl: string,
  filename: string
): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

export function PosterOfferAfterSaveDialog({
  open,
  onLater,
  onGenerate,
}: {
  open: boolean;
  onLater: () => void;
  onGenerate: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[6630] flex items-end justify-center bg-black/50 sm:items-center"
      role="presentation"
      onClick={onLater}
    >
      <div
        role="dialog"
        aria-label="生成分享海报"
        className="w-full max-w-md rounded-t-2xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl dark:bg-zinc-900 sm:rounded-2xl sm:pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#1E90FF]" aria-hidden />
          <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-50">
            生成分享海报？
          </h2>
        </div>
        <p className="mb-4 text-sm text-gray-600 dark:text-zinc-400">
          竖版品牌化海报，适合朋友圈与好友分享，本地秒级生成。
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onLater}
            className={cn(
              "flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium dark:border-white/15",
              loginFocusRing()
            )}
          >
            稍后
          </button>
          <button
            type="button"
            onClick={onGenerate}
            className={cn(
              "flex-1 rounded-xl bg-[#1E90FF] py-2.5 text-sm font-semibold text-white",
              loginFocusRing()
            )}
          >
            立即生成
          </button>
        </div>
      </div>
    </div>
  );
}

export type PosterEditorModalProps = {
  open: boolean;
  record: FishingRecord | null;
  qtySum: number;
  kgSum: number;
  onClose: () => void;
  onToast: (msg: string) => void;
};

export function PosterEditorModal({
  open,
  record,
  qtySum,
  kgSum,
  onClose,
  onToast,
}: PosterEditorModalProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const addPhotoInputRef = useRef<HTMLInputElement>(null);

  const [templateId, setTemplateId] = useState<PosterTemplateId>("minimal");
  const [headline, setHeadline] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoFilterKey, setPhotoFilterKey] = useState<
    "none" | "vivid" | "warm" | "cool" | "mono"
  >("none");
  const [bgMoodId, setBgMoodId] = useState("tpl");
  const [editOpen, setEditOpen] = useState(true);
  const [myListOpen, setMyListOpen] = useState(false);
  const [myList, setMyList] = useState(() => loadMyPosters());
  const [exporting, setExporting] = useState(false);

  const customBg = useMemo(() => {
    const row = BG_MOOD.find((b) => b.id === bgMoodId);
    return row?.value ?? null;
  }, [bgMoodId]);

  const photoFilterCss = PHOTO_FILTER_CSS[photoFilterKey] ?? "none";

  useEffect(() => {
    if (!open || !record) return;
    setTemplateId("minimal");
    setHeadline(buildPosterTagline(record, qtySum, kgSum));
    setPhotos([...(record.sharePhotos ?? [])].slice(0, 3));
    setPhotoFilterKey("none");
    setBgMoodId("tpl");
    setEditOpen(true);
  }, [open, record, qtySum, kgSum]);

  /**
   * 竖版画布固定 1080×1920；预览区按屏宽等比缩小。
   * 监听 resize/orientationchange，避免横竖屏切换后比例错位。
   */
  const [previewScale, setPreviewScale] = useState(0.32);
  useEffect(() => {
    const compute = () => {
      const w = typeof window !== "undefined" ? window.innerWidth : 360;
      const gutter = w < 390 ? 16 : 24;
      const maxW = Math.min(w - gutter, 1080);
      setPreviewScale(Math.min(1, maxW / 1080));
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
  }, []);

  const movePhoto = useCallback((index: number, dir: -1 | 1) => {
    setPhotos((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }, []);

  const removePhotoAt = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const onAddPhotosFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const { blobToJpegDataUrl } = await import("@/lib/poster/thumbnail-data-url");
      const room = 3 - photos.length;
      if (room <= 0) {
        onToast("最多 3 张照片");
        return;
      }
      const take = Array.from(files).slice(0, room);
      const nextUrls: string[] = [];
      for (const f of take) {
        try {
          nextUrls.push(await blobToJpegDataUrl(f, 900, 0.82));
        } catch {
          onToast("部分图片无法读取");
        }
      }
      if (nextUrls.length) {
        setPhotos((p) => [...p, ...nextUrls].slice(0, 3));
      }
    },
    [photos.length, onToast]
  );

  const exportPosterDataUrl = useCallback(async (): Promise<string | null> => {
    const node = posterRef.current;
    if (!node) return null;
    const { toPng } = await import("html-to-image");
    return toPng(node, {
      cacheBust: true,
      pixelRatio: 1,
      width: 1080,
      height: 1920,
      style: {
        width: "1080px",
        height: "1920px",
      },
    });
  }, []);

  const persistToMyPosters = useCallback(
    async (dataUrl: string) => {
      try {
        const thumbDataUrl = await dataUrlToJpegThumb(dataUrl, 200, 0.62);
        saveMyPoster({
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `p-${Date.now()}`,
          createdAt: new Date().toISOString(),
          recordId: record?.id ?? "",
          templateId,
          thumbDataUrl,
        });
        setMyList(loadMyPosters());
      } catch {
        /* 缩略失败不影响主流程 */
      }
    },
    [record?.id, templateId]
  );

  const handleSaveImage = useCallback(async () => {
    if (!record) return;
    setExporting(true);
    try {
      const dataUrl = await exportPosterDataUrl();
      if (!dataUrl) throw new Error("empty");
      downloadDataUrl(
        dataUrl,
        `起势作钓海报-${record.location.slice(0, 8)}-${record.id.slice(0, 8)}.png`
      );
      void persistToMyPosters(dataUrl);
      onToast("已保存到下载 / 相册（视系统而定）");
    } catch {
      onToast("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  }, [record, exportPosterDataUrl, persistToMyPosters, onToast]);

  const handleShareWeChat = useCallback(async () => {
    if (!record) return;
    setExporting(true);
    try {
      const dataUrl = await exportPosterDataUrl();
      if (!dataUrl) throw new Error("empty");
      void persistToMyPosters(dataUrl);
      const file = await dataUrlToPngFile(
        dataUrl,
        `起势海报-${record.id.slice(0, 8)}.png`
      );
      let canFileShare = typeof navigator.share === "function";
      if (canFileShare && typeof navigator.canShare === "function") {
        try {
          canFileShare = navigator.canShare({ files: [file] });
        } catch {
          canFileShare = false;
        }
      }
      if (canFileShare) {
        await navigator.share({
          files: [file],
          title: `起势 · ${record.location}`,
          text: headline.slice(0, 80),
        });
        onToast("已调起系统分享，请选择微信好友或保存");
      } else {
        downloadDataUrl(
          dataUrl,
          `起势作钓海报-${record.location.slice(0, 8)}.png`
        );
        onToast("当前环境不支持直发图片，已触发下载；保存后到微信发送即可");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      onToast("分享失败，可改用「保存图片」");
    } finally {
      setExporting(false);
    }
  }, [
    record,
    headline,
    exportPosterDataUrl,
    persistToMyPosters,
    onToast,
  ]);

  const handleShareCommunity = useCallback(async () => {
    if (!record) return;
    setExporting(true);
    try {
      const dataUrl = await exportPosterDataUrl();
      if (!dataUrl) throw new Error("empty");
      void persistToMyPosters(dataUrl);
      downloadDataUrl(
        dataUrl,
        `起势作钓海报-${record.location.slice(0, 8)}.png`
      );
      onToast(
        "海报已保存并记入「我的海报」。社区发帖入口上线后，可一键带图发布；请先使用已下载图片发帖。"
      );
    } catch {
      onToast("导出失败");
    } finally {
      setExporting(false);
    }
  }, [record, exportPosterDataUrl, persistToMyPosters, onToast]);

  if (!open || !record) return null;

  return (
    <div
      className="fixed inset-0 z-[6640] flex flex-col bg-zinc-950"
      role="dialog"
      aria-label="海报预览与编辑"
    >
      <header className="shrink-0 border-b border-white/10 bg-zinc-900 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">分享海报</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setMyList(loadMyPosters());
                setMyListOpen(true);
              }}
              className={cn(
                "rounded-lg px-2 py-1 text-xs text-sky-300 hover:bg-white/10",
                loginFocusRing()
              )}
            >
              我的海报
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className={cn("rounded-lg p-1.5 text-zinc-400 hover:bg-white/10", loginFocusRing())}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {POSTER_TEMPLATE_LIST.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplateId(t.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                templateId === t.id
                  ? "border-sky-400 bg-sky-500/25 text-sky-100"
                  : "border-white/15 bg-white/5 text-zinc-300 hover:bg-white/10"
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* 离屏完整画布，供 html-to-image 导出（避免预览 scale 影响尺寸） */}
        <div
          className="pointer-events-none fixed -left-[12000px] top-0 opacity-0"
          aria-hidden
        >
          <PosterPreview
            ref={posterRef}
            templateId={templateId}
            customBg={customBg}
            headline={headline}
            record={record}
            qtySum={qtySum}
            kgSum={kgSum}
            photos={photos}
            photoFilterCss={photoFilterCss}
          />
        </div>
        {/* 手机竖屏：预览宽度 ≈ 屏宽 − gutter，高度随 1920×scale，保证整页海报可见 */}
        {/* 预览必须与画布同比缩放：用 top-left + 绝对定位，避免「居中缩放」导致布局仍为 1080px 宽，
          父级 overflow-hidden 只裁到左侧一条（表现为半屏黑 / 无法完整预览） */}
        <div className="flex justify-center bg-black px-2 py-3 sm:px-3 sm:py-4">
          <div
            className="relative shrink-0 overflow-hidden rounded-lg shadow-xl ring-1 ring-white/10"
            style={{
              width: 1080 * previewScale,
              height: 1920 * previewScale,
            }}
          >
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{
                width: 1080,
                height: 1920,
                transform: `scale(${previewScale})`,
              }}
            >
              <PosterPreview
                templateId={templateId}
                customBg={customBg}
                headline={headline}
                record={record}
                qtySum={qtySum}
                kgSum={kgSum}
                photos={photos}
                photoFilterCss={photoFilterCss}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-zinc-900 px-3 py-2">
          <button
            type="button"
            onClick={() => setEditOpen((v) => !v)}
            className="flex w-full items-center justify-between py-1 text-left text-xs font-medium text-zinc-300"
          >
            <span>文案 · 照片 · 滤镜 · 背景</span>
            {editOpen ? (
              <ChevronUp className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden />
            )}
          </button>
          {editOpen ? (
            <div className="space-y-3 pb-2 pt-1">
              <label className="block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                海报文案
              </label>
              <textarea
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-sky-500/30 focus:ring-2"
                placeholder="编辑一句亮眼文案…"
              />
              <div>
                <p className="mb-1.5 text-[10px] font-medium text-zinc-500">
                  实拍（最多 3 张，可排序）
                </p>
                <input
                  ref={addPhotoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void onAddPhotosFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  {photos.map((src, i) => (
                    <div
                      key={`${i}-${src.slice(0, 24)}`}
                      className="relative overflow-hidden rounded-lg border border-white/15"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        className="h-16 w-16 object-cover"
                        style={{ filter: photoFilterCss }}
                      />
                      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-0.5 bg-black/60 py-0.5">
                        <button
                          type="button"
                          className="px-1 text-[10px] text-white"
                          onClick={() => movePhoto(i, -1)}
                        >
                          左
                        </button>
                        <button
                          type="button"
                          className="px-1 text-[10px] text-white"
                          onClick={() => movePhoto(i, 1)}
                        >
                          右
                        </button>
                        <button
                          type="button"
                          className="px-1 text-[10px] text-rose-300"
                          onClick={() => removePhotoAt(i)}
                        >
                          删
                        </button>
                      </div>
                    </div>
                  ))}
                  {photos.length < 3 ? (
                    <button
                      type="button"
                      onClick={() => addPhotoInputRef.current?.click()}
                      className={cn(
                        "flex h-16 w-16 flex-col items-center justify-center rounded-lg border border-dashed border-white/25 text-zinc-400 hover:bg-white/5",
                        loginFocusRing()
                      )}
                    >
                      <ImagePlus className="h-5 w-5" />
                      <span className="mt-0.5 text-[9px]">添加</span>
                    </button>
                  ) : null}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] text-zinc-500">照片滤镜</p>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["none", "原图"],
                      ["vivid", "鲜明"],
                      ["warm", "暖调"],
                      ["cool", "冷调"],
                      ["mono", "黑白"],
                    ] as const
                  ).map(([k, lab]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setPhotoFilterKey(k)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px]",
                        photoFilterKey === k
                          ? "bg-sky-600 text-white"
                          : "bg-white/10 text-zinc-300"
                      )}
                    >
                      {lab}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] text-zinc-500">背景氛围</p>
                <div className="flex flex-wrap gap-1.5">
                  {BG_MOOD.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBgMoodId(b.id)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px]",
                        bgMoodId === b.id
                          ? "bg-emerald-600 text-white"
                          : "bg-white/10 text-zinc-300"
                      )}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="shrink-0 border-t border-white/10 bg-zinc-900 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleSaveImage()}
            className={cn(
              "rounded-xl bg-white py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-50",
              loginFocusRing()
            )}
          >
            {exporting ? (
              <span className="inline-flex items-center justify-center gap-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                导出中
              </span>
            ) : (
              "保存图片"
            )}
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleShareWeChat()}
            className={cn(
              "rounded-xl bg-[#07C160] py-2.5 text-sm font-semibold text-white disabled:opacity-50",
              loginFocusRing()
            )}
          >
            分享到微信
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleShareCommunity()}
            className={cn(
              "rounded-xl border border-sky-400/50 bg-sky-500/20 py-2.5 text-sm font-semibold text-sky-100 disabled:opacity-50",
              loginFocusRing()
            )}
          >
            分享到社区
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={onClose}
            className={cn(
              "rounded-xl border border-white/15 py-2.5 text-sm font-medium text-zinc-300 disabled:opacity-50",
              loginFocusRing()
            )}
          >
            取消
          </button>
        </div>
      </footer>

      {myListOpen ? (
        <div
          className="fixed inset-0 z-[6650] flex items-end justify-center bg-black/55 sm:items-center"
          role="presentation"
          onClick={() => setMyListOpen(false)}
        >
          <div
            className="max-h-[70vh] w-full max-w-md overflow-hidden rounded-t-2xl bg-zinc-900 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">我的海报</h3>
              <button
                type="button"
                onClick={() => setMyListOpen(false)}
                className={cn("rounded-lg p-1 text-zinc-400", loginFocusRing())}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-3">
              {myList.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  暂无，保存或分享后会出现在这里
                </p>
              ) : (
                <ul className="grid grid-cols-3 gap-2">
                  {myList.map((item) => (
                    <li
                      key={item.id}
                      className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.thumbDataUrl}
                        alt=""
                        className="aspect-[9/16] w-full object-cover"
                      />
                      <p className="truncate px-1 py-1 text-[9px] text-zinc-500">
                        {new Date(item.createdAt).toLocaleString("zh-CN", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
