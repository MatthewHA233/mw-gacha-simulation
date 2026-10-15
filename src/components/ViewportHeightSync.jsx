'use client'

import { useEffect } from 'react'

/**
 * 把浏览器实际可见高度写进 CSS 变量 --app-height。
 *
 * 手机 Chrome 的 100vh 按「地址栏收起」时的高度算，地址栏显示时比可见区域高一截；
 * 竖屏旋转成横屏的页面用 100vh 当长边，底部那截就被裁掉、页面又不能滚动，看不到也划不下去。
 * 地址栏出现 / 收起都会触发 resize，这里跟着更新；用的地方写 var(--app-height, 100vh)。
 */
export function ViewportHeightSync() {
  useEffect(() => {
    const update = () => {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])
  return null
}
