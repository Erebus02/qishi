"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  ChevronLeft,
  ImagePlus,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { nextRouteApi } from "@/lib/api-base";
import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

type IdentifyOk = {
  mode: "demo" | "openai";
  species: string;
  confidence: number;
  tip: string;
  candidates: { species: string; confidence: number }[];
};

type IdentifyErr = { error: string; fallback?: IdentifyOk };

async function shrinkImageIfNeeded(file: File, maxW = 1280): Promise<Blob> {
  if (file.size < 400_000 && file.type !== "image/png") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxW / bmp.width);
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82)
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export function FishAiView() {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IdentifyOk | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onFile = useCallback(async (f: File | null) => {
    setErr(null);
    setResult(null);
    if (!f || !f.type.startsWith("image/")) {
      setPreview(null);
      setFile(null);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const clearPhoto = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setResult(null);
    setErr(null);
  }, [preview]);

  const identify = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const blob = await shrinkImageIfNeeded(file);
      const fd = new FormData();
      fd.append("image", blob, "fish.jpg");
      const res = await fetch(nextRouteApi("/api/fish-identify"), {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as IdentifyOk | IdentifyErr;
      if (!res.ok) {
        if ("error" in data && data.error) {
          if ("fallback" in data && data.fallback) {
            setResult(data.fallback);
            setErr(data.error);
          } else {
            setErr(data.error || "识别失败");
          }
        } else {
          setErr("识别失败");
        }
        return;
      }
      if (!("species" in data)) {
        setErr("error" in data && data.error ? data.error : "识别失败");
        return;
      }
      setResult({
        mode: data.mode,
        species: data.species,
        confidence: data.confidence,
        tip: data.tip,
        candidates: Array.isArray(data.candidates) ? data.candidates : [],
      });
    } catch {
      setErr("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [file]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50 dark:bg-zinc-950">
      <header className="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-3 py-3 dark:border-white/10 dark:bg-zinc-900">
        <Link
          href="/tools"
          className={cn(
            "flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-zinc-200",
            loginFocusRing()
          )}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
          工具箱
        </Link>
        <h1 className="flex-1 text-center text-base font-semibold">AI 识鱼</h1>
        <span className="w-16" aria-hidden />
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-28">
        <p className="text-center text-xs text-gray-500 dark:text-zinc-400">
          拍摄或上传鱼体清晰的照片，识别常见淡水/海水鱼类并给出简要钓法提示
        </p>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E90FF] py-3 text-sm font-medium text-white hover:bg-[#1873CC]",
              loginFocusRing()
            )}
          >
            <Camera className="h-5 w-5" aria-hidden />
            拍照
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
              loginFocusRing()
            )}
          >
            <ImagePlus className="h-5 w-5" aria-hidden />
            相册
          </button>
        </div>

        {preview ? (
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-zinc-900">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={preview}
                alt="待识别照片"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2 dark:border-white/10">
              <span className="truncate text-xs text-gray-500 dark:text-zinc-400">
                {file?.name ?? "已选图片"}
              </span>
              <button
                type="button"
                onClick={clearPhoto}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30",
                  loginFocusRing()
                )}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                清除
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-sm text-gray-400 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-500">
            <Sparkles className="mb-2 h-10 w-10 opacity-40" aria-hidden />
            请选择照片开始识别
          </div>
        )}

        <button
          type="button"
          disabled={!file || loading}
          onClick={() => void identify()}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-semibold text-white shadow-md hover:from-emerald-600 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-50",
            loginFocusRing()
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              识别中…
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" aria-hidden />
              开始识别
            </>
          )}
        </button>

        {err ? (
          <p
            className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
            role="alert"
          >
            {err}
          </p>
        ) : null}

        {result ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-50">
                {result.species}
              </h2>
              <span className="shrink-0 text-xs text-gray-500 dark:text-zinc-400">
                置信度 {(result.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <p className="mb-3 text-xs text-gray-500 dark:text-zinc-400">
              {result.mode === "demo"
                ? "演示模式：配置 OPENAI_API_KEY 后可使用云端视觉识别"
                : "云端识别结果仅供参考"}
            </p>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-zinc-200">
              {result.tip}
            </p>
            {result.candidates.length > 1 ? (
              <div className="mt-4 border-t border-gray-100 pt-3 dark:border-white/10">
                <p className="mb-2 text-xs font-medium text-gray-500 dark:text-zinc-400">
                  其它可能
                </p>
                <ul className="space-y-1.5 text-xs text-gray-600 dark:text-zinc-300">
                  {result.candidates.slice(1).map((c) => (
                    <li key={c.species} className="flex justify-between gap-2">
                      <span>{c.species}</span>
                      <span className="tabular-nums opacity-70">
                        {(c.confidence * 100).toFixed(0)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
