import Link from "next/link";
import { redirect } from "next/navigation";

import { getBackendBaseUrl } from "@/lib/geo/spots-api";

/**
 * 避免误以为「管理后台在本站同端口」。
 * 配置了 NEXT_PUBLIC_API_BASE_URL（或 API_URL）时，自动跳到 Express 的 /admin/。
 */
export default function AdminEntryPage() {
  const base = getBackendBaseUrl()?.replace(/\/$/, "");
  if (base) {
    redirect(`${base}/admin/`);
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16 text-center">
      <h1 className="text-lg font-semibold text-foreground">管理后台不在这个地址</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        「起势」前端（Next）和「管理登录 / 钓点 API」是<strong>两个服务</strong>。
        管理页由后端 <code className="rounded bg-muted px-1 py-0.5 text-xs">qishi-login-server</code>{" "}
        提供，需要单独启动，并在浏览器打开<strong>后端端口</strong>上的路径。
      </p>
      <ul className="mt-6 list-inside list-disc text-left text-sm text-muted-foreground">
        <li className="mb-2">
          在 <code className="rounded bg-muted px-1 py-0.5 text-xs">qishi-login-server</code>{" "}
          目录执行 <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run dev</code>
        </li>
        <li className="mb-2">
          看终端里的端口，在地址栏输入（注意末尾斜杠）：<br />
          <code className="mt-1 inline-block rounded bg-muted px-2 py-1 text-xs">
            http://localhost:后端端口/admin/
          </code>
        </li>
        <li>
          若 3001 已被本前端占用，请给后端设{" "}
          <code className="rounded bg-muted px-1 text-xs">PORT=3010</code>，再打开{" "}
          <code className="rounded bg-muted px-1 text-xs">http://localhost:3010/admin/</code>
        </li>
      </ul>
      <p className="mt-6 text-sm text-muted-foreground">
        配置好{" "}
        <code className="rounded bg-muted px-1 text-xs">NEXT_PUBLIC_API_BASE_URL</code>{" "}
        后，访问本站 <code className="rounded bg-muted px-1 text-xs">/admin</code>{" "}
        会自动跳转到后端管理页。
      </p>
      <Link
        href="/map"
        className="mt-8 inline-block text-sm font-medium text-[#1E90FF] underline-offset-4 hover:underline"
      >
        返回地图首页
      </Link>
    </div>
  );
}
