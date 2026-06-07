import { cn } from "@/lib/utils";

/** Shared focus ring aligned with brand accent (#1E90FF). */
export function loginFocusRing(className?: string) {
  return cn(
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E90FF]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",
    className
  );
}
