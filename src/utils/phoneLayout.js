/**
 * 「手机布局」口径（2026-10-15），和 tailwind.config.js 的断点保持一致：宽 < 768，或者高 < 500。
 *
 * 手机真横屏（自动全屏锁横屏、或系统自动旋转）宽度能到 800～900，但高度只有三四百；
 * 只看宽度会把它当成电脑，整站套上电脑尺寸撑爆。伪横屏（竖着拿、页面转 90°）时浏览器看到的是竖屏宽度，
 * 本来就走手机样式 —— 加上高度条件后，两种横屏走的是同一套样式。
 */
export const PHONE_MAX_WIDTH = 768
export const PHONE_MAX_HEIGHT = 500

export const isPhoneLayout = () =>
  typeof window !== 'undefined' &&
  (window.innerWidth < PHONE_MAX_WIDTH || window.innerHeight < PHONE_MAX_HEIGHT)
