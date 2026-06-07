function isLoopbackHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".localhost")
  );
}

/**
 * 非安全上下文（典型：手机用 http://局域网IP 打开）下，浏览器会禁用 Geolocation。
 * 开发机可运行 `npm run dev:lan:https`，用手机访问 https://电脑IP:3000 并信任证书。
 */
export function geolocationBlockedReason(): string | null {
  if (typeof window === "undefined") return null;
  if (!navigator.geolocation) return "当前浏览器不支持定位 API";
  const host = window.location.hostname;
  if (!window.isSecureContext && !isLoopbackHost(host)) {
    return "当前为 HTTP 且通过局域网 IP 访问，浏览器会禁止定位。请在电脑运行 npm run dev:lan:https，用手机打开 https://本机IP:3000（首次在系统里信任证书），或改用 USB 调试走 localhost。";
  }
  return null;
}

/** 错误码 2（POSITION_UNAVAILABLE）：按访问环境给不同说明，避免本机开发被误导成「必须 HTTPS」 */
function hintPositionUnavailable(): string {
  if (typeof window === "undefined") {
    return "无法获取位置，请手写作钓地点。";
  }
  const host = window.location.hostname;
  const loopback = isLoopbackHost(host);
  const insecureLan = !window.isSecureContext && !loopback;

  if (insecureLan) {
    return "无法获取位置：当前是 HTTP + 局域网 IP，浏览器会拦截定位。请在项目目录运行 npm run dev:lan:https，用 https://本机IP:3000 打开并信任证书；或手写作钓地点。";
  }
  if (loopback) {
    return "本机开发常见情况：电脑没有 GPS、Windows「定位」服务关闭，或浏览器未允许本站使用位置。可直接手写作钓地点；若要用定位，请在 设置 → 隐私 → 位置 中开启，并在浏览器地址栏允许位置权限。";
  }
  return "无法获取位置：请确认系统已开启定位/GPS 且浏览器已授权；桌面环境也可直接手写作钓地点。";
}

/**
 * GeolocationPositionError.code 对应文案（作钓记录「定位填入」等）。
 * @see https://developer.mozilla.org/docs/Web/API/GeolocationPositionError/code
 */
export function hintForGeolocationError(lastCode: number | undefined): string {
  switch (lastCode) {
    case 1:
      return "已拒绝定位权限：请点击地址栏锁形/信息图标，允许本站使用「位置」。";
    case 3:
      return "定位超时：请到窗边或室外重试，或稍后再点「定位填入」。";
    case 2:
      return hintPositionUnavailable();
    default:
      return "暂时无法获取位置，请手写作钓地点或稍后重试。";
  }
}
