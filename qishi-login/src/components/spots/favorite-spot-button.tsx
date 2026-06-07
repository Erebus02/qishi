"use client";

import { Heart } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  FAVORITES_CHANGED_EVENT,
  isFavoriteSpotId,
  toggleFavoriteSpotId,
} from "@/lib/profile/favorite-spots-storage";
import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

export type FavoriteSpotButtonProps = {
  spotId: string;
  /** default：列表浅底；light：深色顶栏上的白/红心 */
  variant?: "default" | "light";
  size?: "sm" | "md";
  className?: string;
};

export function FavoriteSpotButton({
  spotId,
  variant = "default",
  size = "md",
  className,
}: FavoriteSpotButtonProps) {
  const [on, setOn] = useState(false);

  const sync = useCallback(() => {
    setOn(isFavoriteSpotId(spotId));
  }, [spotId]);

  useEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    const handler = () => sync();
    window.addEventListener(FAVORITES_CHANGED_EVENT, handler);
    return () => window.removeEventListener(FAVORITES_CHANGED_EVENT, handler);
  }, [sync]);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const next = toggleFavoriteSpotId(spotId);
      setOn(next);
    },
    [spotId]
  );

  const iconSz = size === "sm" ? 16 : 20;
  const heartClass =
    variant === "light"
      ? on
        ? "fill-red-400 text-red-400"
        : "text-white"
      : on
        ? "fill-red-500 text-red-500"
        : "text-gray-400 dark:text-zinc-500";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={on ? "取消收藏" : "收藏钓点"}
      aria-pressed={on}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full p-1.5 transition-colors",
        variant === "default" && "hover:bg-red-50 dark:hover:bg-red-950/30",
        loginFocusRing(),
        className
      )}
    >
      <Heart size={iconSz} className={heartClass} aria-hidden />
    </button>
  );
}
