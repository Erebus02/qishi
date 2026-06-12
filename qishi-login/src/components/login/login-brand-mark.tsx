import Image from "next/image";

import { cn } from "@/lib/utils";

export function LoginBrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex shrink-0 flex-col items-center", className)}
      aria-hidden
    >
      <Image
        src="/icons/qishi-logo.webp"
        alt=""
        width={96}
        height={96}
        priority
        className="h-24 w-24 drop-shadow-[0_18px_28px_rgba(30,105,230,0.28)]"
      />
    </div>
  );
}
