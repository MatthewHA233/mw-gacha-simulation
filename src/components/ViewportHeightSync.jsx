'use client'

import { useEffect } from 'react'

/**
 * 把浏览器实际可见高度写进 CSS 变量 --app-height。
 *
 * 手机 Chrome 的 100vh 按「地址栏收起」时的高度算，地址栏显示时比可见区域高一截；
 * 竖屏旋转成横屏的页面用 100vh 当长边，底部那截就被裁掉、页面又不能滚动，看不到也划不下去。
 * 地址栏出现 / 收起都会触发 resize，这里跟着更新；用的地方写 var(--app-height, 100vh)。
 *
 * 输入时不更新（2026-10-15）：layout 的 viewport 设了 interactive-widget=resizes-content，输入法弹出会让
 * innerHeight 变矮。弹窗该跟着让位，但背后的抽奖页面不该被压扁、跳动，所以聚焦输入框期间冻结，收起后再更新。
 */
const isEditing = () =>
  !!document.activeElement?.matches?.('input, textarea, select, [contenteditable="true"]')

export function ViewportHeightSync() {
  useEffect(() => {
    const update = () => {
      if (isEditing()) return
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
    }
    // 收起输入法时焦点先离开、高度后恢复，等一下再量
    const onFocusOut = () => setTimeout(update, 350)
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    window.visualViewport?.addEventListener('resize', update)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      window.visualViewport?.removeEventListener('resize', update)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])
  return null
}
