/** 中国大陆 11 位手机号脱敏 */
export function maskMainlandMobile(phone: string): string {
  const p = phone.replace(/\D/g, "");
  if (p.length !== 11) return phone.trim();
  return `${p.slice(0, 3)}****${p.slice(7)}`;
}
