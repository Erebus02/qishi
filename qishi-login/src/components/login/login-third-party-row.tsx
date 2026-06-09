import { Button } from "@/components/ui/button";
import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

import { AppleIcon, QQIcon, WeiboIcon } from "./login-third-party-icons";

const circleBtn =
  "h-[52px] w-[52px] min-h-[52px] min-w-[52px] rounded-full border border-slate-300/60 bg-white/75 p-0 text-slate-900 shadow-[0_8px_22px_rgba(15,30,51,0.08)] backdrop-blur-md transition-transform hover:scale-105 hover:bg-white active:scale-95";

type LoginThirdPartyRowProps = {
  /** 第三方 OAuth 未接好时点击提示，避免用户以为「点了没反应」 */
  onUnavailable?: (providerLabel: string) => void;
};

export function LoginThirdPartyRow({ onUnavailable }: LoginThirdPartyRowProps) {
  return (
    <div className="flex items-center justify-center gap-7" role="group" aria-label="第三方登录">
      <Button
        type="button"
        variant="ghost"
        className={cn(
          circleBtn,
          loginFocusRing()
        )}
        aria-label="使用 Apple 登录"
        onClick={() => onUnavailable?.("Apple")}
      >
        <AppleIcon className="size-6" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          circleBtn,
          loginFocusRing()
        )}
        aria-label="使用 QQ 登录"
        onClick={() => onUnavailable?.("QQ")}
      >
        <QQIcon className="size-6 text-slate-900" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          circleBtn,
          loginFocusRing()
        )}
        aria-label="使用微博登录"
        onClick={() => onUnavailable?.("微博")}
      >
        <WeiboIcon className="size-6 text-slate-900" />
      </Button>
    </div>
  );
}
