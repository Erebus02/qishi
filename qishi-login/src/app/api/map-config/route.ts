import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const key =
    process.env.AMAP_KEY?.trim() ||
    process.env.NEXT_PUBLIC_AMAP_KEY?.trim();
  const securityCode =
    process.env.AMAP_SECURITY_CODE?.trim() ||
    process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE?.trim();

  if (!key || !securityCode) {
    return NextResponse.json(
      { error: "高德地图环境变量未配置" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  return NextResponse.json(
    { key, securityCode },
    { headers: { "Cache-Control": "no-store" } }
  );
}
