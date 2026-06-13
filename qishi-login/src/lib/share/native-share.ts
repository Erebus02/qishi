export function shouldUseNativeShare(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const isMobileUa = /Android|iPhone|iPad|iPod|Mobile|MicroMessenger|QQ\//i.test(
    ua
  );
  const isTouchMac =
    /Mac/i.test(platform) &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1;

  return isMobileUa || isTouchMac;
}
