/* 起势 PWA — Service Worker：离线兜底 + 地图瓦片缓存 + 静态资源加速 */
/* 版本号 bump 后用户将获取新 SW（需刷新或自动更新） */
const VERSION = "qishi-sw-v1";
const CACHE_STATIC = `${VERSION}-static`;
const CACHE_TILES = `${VERSION}-tiles`;
const CACHE_NEXT = `${VERSION}-next-static`;

/** 安装阶段：预缓存离线页与 manifest/图标（海报为前端导出 DataURL，由页面脚本本地保存，不经 SW fetch） */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) =>
        cache.addAll([
          "/offline.html",
          "/manifest.json",
          "/icons/pwa-icon-512.svg",
          "/icons/pwa-icon-maskable.svg",
        ])
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([CACHE_STATIC, CACHE_TILES, CACHE_NEXT]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("qishi-sw-") && !keep.has(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function staleWhileRevalidateTiles(request) {
  const cache = await caches.open(CACHE_TILES);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || networkPromise;
}

async function staleWhileRevalidateNextStatic(request) {
  const cache = await caches.open(CACHE_NEXT);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  /* OSM 瓦片：支持手势浏览过的区域弱网/离线回看（注意遵守 OSM Tile Usage Policy） */
  if (url.hostname.endsWith("tile.openstreetmap.org")) {
    event.respondWith(staleWhileRevalidateTiles(request));
    return;
  }

  /* Next 打包的 chunk / CSS：优先缓存，后台更新 */
  if (
    url.origin === self.location.origin &&
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(staleWhileRevalidateNextStatic(request));
    return;
  }

  /* HTML 导航：网络优先，失败展示离线页 */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await caches.match("/offline.html");
        return offline || Response.error();
      })
    );
  }
});
