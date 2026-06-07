/**
 * 在系统浏览器、微信内置浏览器等环境下打开第三方地图链接。
 * 微信内对程序化 `target=_blank` 拦截多，优先整页跳转；其它环境先 `window.open`，失败再回退。
 */
export function openExternalMapUrl(url: string): void {
  if (typeof window === "undefined") return;
  const ua = navigator.userAgent || "";
  const inWeChat = /MicroMessenger/i.test(ua);
  const inQQ = /\bQQ\//i.test(ua);
  if (inWeChat || inQQ) {
    window.location.assign(url);
    return;
  }
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened == null || opened.closed) {
    window.location.assign(url);
  }
}
