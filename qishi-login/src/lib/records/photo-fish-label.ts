/** 压缩大图后用于识鱼接口；在图片底部绘制鱼种文案用于下载 */

export async function shrinkImageBlob(
  blob: Blob,
  maxW = 1280
): Promise<Blob> {
  if (blob.size < 400_000) return blob;
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, maxW / bmp.width);
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82)
    );
    return out ?? blob;
  } catch {
    return blob;
  }
}

/** 在照片底部叠加鱼种文字，返回 PNG data URL */
export async function renderImageWithBottomSpeciesLabel(
  imageBlob: Blob,
  label: string
): Promise<string> {
  const bmp = await createImageBitmap(imageBlob);
  const W = bmp.width;
  const H = bmp.height;
  const barH = Math.max(40, Math.round(H * 0.08));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bmp.close();
    throw new Error("canvas");
  }
  ctx.drawImage(bmp, 0, 0);
  bmp.close();

  ctx.fillStyle = "rgba(0,0,0,0.62)";
  ctx.fillRect(0, H - barH, W, barH);

  const text = label.trim() || "鱼种待确认";
  const fontSize = Math.min(28, Math.max(16, Math.floor(barH * 0.45)));
  ctx.font = `bold ${fontSize}px system-ui, "PingFang SC", sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  const padX = 14;
  const maxW = W - padX * 2;
  let drawText = text;
  while (ctx.measureText(drawText).width > maxW && drawText.length > 4) {
    drawText = `${drawText.slice(0, -2)}…`;
  }
  ctx.fillText(drawText, padX, H - barH / 2);

  return canvas.toDataURL("image/png");
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename.replace(/[/\\?%*:|"<>]/g, "_");
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
