import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEMO_SPECIES: { species: string; tip: string }[] = [
  { species: "鲫鱼", tip: "底钓为主，蚯蚓、红虫效果好；选草边、缓流处。" },
  { species: "鲤鱼", tip: "喜弱光与清晨傍晚，玉米、螺鲤打窝后守钓。" },
  { species: "草鱼", tip: "中上层，嫩草、芦苇芯浮钓或半水截口。" },
  { species: "鲈鱼", tip: "路亚软虫、米诺搜索结构区；注意窗口期。" },
  { species: "黑鱼", tip: "雷强草区贴草搜索，扬竿刺鱼要果断。" },
  { species: "鲢鳙", tip: "雾化雾化带，浮钓找泳层，漂相多为顿口。" },
  { species: "翘嘴", tip: "清晨窗口期，亮片、铅笔远投搜索。" },
  { species: "罗非", tip: "小钩细线，腥味饵；水温稳定时开口好。" },
];

function demoFromBuffer(buf: Buffer): {
  mode: "demo";
  species: string;
  confidence: number;
  tip: string;
  candidates: { species: string; confidence: number }[];
} {
  let s = 0;
  const cap = Math.min(buf.length, 4000);
  for (let i = 0; i < cap; i++) {
    s = (s + buf[i]! * (i + 3)) % 2147483647;
  }
  const n = DEMO_SPECIES.length;
  const main = s % n;
  const c0 = 0.58 + ((s >> 3) % 35) / 100;
  const c1 = 0.12 + ((s >> 5) % 18) / 100;
  const c2 = 0.08 + ((s >> 7) % 12) / 100;
  const i1 = (main + 1) % n;
  const i2 = (main + 3) % n;
  return {
    mode: "demo",
    species: DEMO_SPECIES[main]!.species,
    confidence: Math.min(0.94, c0),
    tip: DEMO_SPECIES[main]!.tip,
    candidates: [
      { species: DEMO_SPECIES[main]!.species, confidence: c0 },
      { species: DEMO_SPECIES[i1]!.species, confidence: c1 },
      { species: DEMO_SPECIES[i2]!.species, confidence: c2 },
    ],
  };
}

function tryParseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "无效的请求体" }, { status: 400 });
  }

  const image = form.get("image");
  if (!image || typeof (image as Blob).arrayBuffer !== "function") {
    return NextResponse.json({ error: "请上传图片" }, { status: 400 });
  }

  const buf = Buffer.from(await (image as Blob).arrayBuffer());
  if (buf.length < 32) {
    return NextResponse.json({ error: "图片过小或已损坏" }, { status: 400 });
  }
  if (buf.length > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "图片请小于 6MB" }, { status: 400 });
  }

  const mime =
    (image as File).type && (image as File).type.startsWith("image/")
      ? (image as File).type
      : "image/jpeg";

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(demoFromBuffer(buf));
  }

  const base64 = buf.toString("base64");
  const dataUrl = `data:${mime};base64,${base64}`;

  const prompt =
    "你是鱼类识别助手。根据图片判断主要淡水或海水经济鱼类中文俗名（单种最可能）。只输出 JSON：{\"species_cn\":\"中文名\",\"confidence\":0到1的小数,\"brief_tip\":\"不超过40字的垂钓要点\"}";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 220,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    return NextResponse.json(
      {
        error: "识别服务暂时不可用，已为你展示演示结果",
        detail: res.status,
        fallback: demoFromBuffer(buf),
      },
      { status: 502 }
    );
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  const parsed = tryParseJsonObject(text);
  const species =
    typeof parsed?.species_cn === "string"
      ? parsed.species_cn
      : typeof parsed?.species === "string"
        ? parsed.species
        : null;
  const confidence =
    typeof parsed?.confidence === "number"
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.75;
  const tip =
    typeof parsed?.brief_tip === "string"
      ? parsed.brief_tip
      : "注意天气变化与放流规范。";

  if (!species) {
    return NextResponse.json({
      mode: "openai",
      species: "未能确定鱼种",
      confidence: 0.35,
      tip: "请换更清晰、鱼体完整的照片重试。",
      candidates: [],
    });
  }

  return NextResponse.json({
    mode: "openai",
    species,
    confidence,
    tip,
    candidates: [{ species, confidence }],
  });
}
