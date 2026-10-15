/**
 * 登录账号打码（2026-10-15 号主定）：账号里带一串数字的（多半是手机号 / QQ 号）只露开头 2 位和末尾 4 位，
 * 中间固定 4 个星号（不暴露长度），例如 15727124853 → 15****4853。数字少于 6 个的账号原样显示。
 */
export const maskLoginId = (loginId) => {
  const value = String(loginId || '')
  const digitCount = (value.match(/\d/g) || []).length
  if (digitCount < 6 || value.length <= 6) return value
  return `${value.slice(0, 2)}****${value.slice(-4)}`
}
