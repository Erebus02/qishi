"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { loadAuthSession } from "@/lib/auth/client-session";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const session = loadAuthSession();
    if (!session) {
      const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
      return;
    }
    setAllowed(true);
  }, [pathname, router]);

  if (!allowed) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white text-slate-500 dark:bg-zinc-950 dark:text-zinc-400">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          正在进入登录页…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
