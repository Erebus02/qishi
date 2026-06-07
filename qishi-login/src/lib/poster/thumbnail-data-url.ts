/** 将实拍图压成 JPEG Data URL，供海报与本地存储使用（控制体积） */

export async function blobToJpegDataUrl(
  blob: Blob,
  maxWidth: number,
  quality: number
): Promise<string> {
  const bmp = await createImageBitmap(blob);
  try {
    const w = bmp.width;
    const h = bmp.height;
    const scale = w > maxWidth ? maxWidth / w : 1;
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d");
    ctx.drawImage(bmp, 0, 0, cw, ch);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    bmp.close();
  }
}

export async function blobsToJpegDataUrls(
  blobs: Blob[],
  maxCount: number,
  maxWidth: number,
  quality: number
): Promise<string[]> {
  const out: string[] = [];
  for (const b of blobs.slice(0, maxCount)) {
    try {
      out.push(await blobToJpegDataUrl(b, maxWidth, quality));
    } catch {
      /* 单张失败则跳过 */
    }
  }
  return out;
}

/** 将完整海报 data URL 压成列表用小缩略图（JPEG） */
export function dataUrlToJpegThumb(
  dataUrl: string,
  maxWidth: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("image load"));
    img.src = dataUrl;
  });
}
