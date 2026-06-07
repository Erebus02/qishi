import { Button } from "@/components/ui/button";
import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

import { AppleIcon, QQIcon, WeChatIcon, WeiboIcon } from "./login-third-party-icons";

const circleBtn =
  "h-11 w-11 min-h-11 min-w-11 rounded-full border-0 p-0 shadow-md transition-transform hover:scale-110 active:scale-95";

type LoginThirdPartyRowProps = {
  /** 第三方 OAuth 未接好时点击提示，避免用户以为「点了没反应」 */
  onUnavailable?: (providerLabel: string) => void;
};

export function LoginThirdPartyRow({ onUnavailable }: LoginThirdPartyRowProps) {
  return (
    <div className="mb-10 flex items-center justify-center gap-6 sm:gap-7" role="group" aria-label="第三方登录">
      {/* 顺序：微信 · QQ · 新浪微博 · Apple */}
      <Button
        type="button"
        variant="ghost"
        className={cn(
          circleBtn,
          "bg-[#07C160] text-white hover:bg-[#06ad56]",
          loginFocusRing()
        )}
        aria-label="使用微信登录"
        onClick={() => onUnavailable?.("微信")}
      >
        <WeChatIcon className="size-6" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          circleBtn,
          "bg-[#12B7F5] text-white hover:bg-[#0ea5e9]",
          loginFocusRing()
        )}
        aria-label="使用 QQ 登录"
        onClick={() => onUnavailable?.("QQ")}
      >
        <QQIcon className="size-6" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          circleBtn,
          "bg-[#E6162D] text-white hover:bg-[#cf1428]",
          loginFocusRing()
        )}
        aria-label="使用微博登录"
        onClick={() => onUnavailable?.("微博")}
      >
        <WeiboIcon className="size-6" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          circleBtn,
          "bg-black text-white hover:bg-zinc-900 dark:bg-white dark:text-black dark:hover:bg-zinc-100",
          loginFocusRing()
        )}
        aria-label="使用 Apple 登录"
        onClick={() => onUnavailable?.("Apple")}
      >
        <AppleIcon className="size-[22px]" />
      </Button>
    </div>
  );
}
