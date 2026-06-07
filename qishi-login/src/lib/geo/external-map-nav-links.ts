/**
 * 第三方地图导航 / 打开终点（坐标为 GCJ-02 / 国测局，与国内地图 App 一致）
 * @see https://lbs.amap.com/api/uri-api/
 * @see https://lbs.baidu.com/faq/api?title=webapi/uri/web
 * @see https://lbs.qq.com/
 */

const SRC_AMAP = "qishi";
const SRC_BAIDU_WEB = "webapp.qishi.spots";

/** 高德地图：路径规划；`callnative=1` 便于移动端调起 App；`to` 为 lng,lat,名称 */
export function buildAmapNavigationUrl(
  lat: number,
  lng: number,
  name: string
): string {
  const n = encodeURIComponent(name.trim() || "钓点");
  return `https://uri.amap.com/navigation?to=${lng},${lat},${n}&mode=car&policy=1&src=${SRC_AMAP}&callnative=1`;
}

/** 苹果地图：路线规划到终点 */
export function buildAppleMapsNavigateUrl(
  lat: number,
  lng: number,
  name: string
): string {
  const q = encodeURIComponent(name.trim() || "钓点");
  return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d&q=${q}`;
}

/**
 * 百度地图：标点展示（官方 direction 接口要求必选 origin，空 origin 在移动端常失败）。
 * 用户进入地图后可再点「到这去」规划路线。location 为 纬度,经度。
 */
export function buildBaiduMapMarkerUrl(
  lat: number,
  lng: number,
  name: string
): string {
  const title = encodeURIComponent(name.trim() || "钓点");
  const src = encodeURIComponent(SRC_BAIDU_WEB);
  return `https://api.map.baidu.com/marker?location=${lat},${lng}&title=${title}&content=${encodeURIComponent("起势 · 钓点位置")}&output=html&coord_type=gcj02&src=${src}`;
}

/** @deprecated 使用 {@link buildBaiduMapMarkerUrl}，direction 无合法 origin 时不可靠 */
export function buildBaiduMapsDirectionWebUrl(
  lat: number,
  lng: number,
  name: string
): string {
  return buildBaiduMapMarkerUrl(lat, lng, name);
}

/**
 * 腾讯地图：路线规划（起点为当前位置；tocoord 为纬度,经度 GCJ-02）
 */
export function buildTencentMapsRouteUrl(
  lat: number,
  lng: number,
  name: string
): string {
  const to = encodeURIComponent(name.trim() || "钓点");
  return `https://apis.map.qq.com/uri/v1/routeplan?type=drive&fromcoord=CurrentLocation&tocoord=${lat},${lng}&to=${to}&policy=0`;
}
