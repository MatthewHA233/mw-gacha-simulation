'use client'

import { useEffect } from 'react'

/**
 * 手机自动全屏横屏（2026-10-15 号主定：浏览器支持就直接全屏，不要按钮）。
 *
 * 浏览器只允许在用户点击里请求全屏，所以做不到「打开页面就全屏」：手指点页面的那一下进全屏，并把方向锁成横屏
 * （系统锁了竖屏也是真横屏，截图、输入法都是横的）。自己退出全屏后，下一次点击会再进去。
 * 只在触屏、且支持全屏和锁定方向的浏览器上生效（安卓 Chrome / Edge / 三星 / 火狐）；iPhone Safari、
 * 微信 / QQ 内置浏览器不支持，照常用伪横屏。点的是输入框时不进全屏，免得和输入法打架。
 */
export function useAutoFullscreen() {
  useEffect(() => {
    const root = document.documentElement
    const coarse = window.matchMedia?.('(pointer: coarse)').matches
    const canFullscreen = !!(document.fullscreenEnabled && root.requestFullscreen)
    const canLock = !!(window.screen?.orientation && typeof window.screen.orientation.lock === 'function')
    if (!coarse || !canFullscreen || !canLock) return undefined

    let pending = false
    const enter = async (event) => {
      if (pending || document.fullscreenElement) return
      if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      pending = true
      try {
        await root.requestFullscreen({ navigationUI: 'hide' })
        // 锁不了方向就只全屏，伪横屏照样能用
        await window.screen.orientation.lock('landscape').catch(() => {})
      } catch {
        // 浏览器拒绝全屏：不提示，照常浏览
      } finally {
        pending = false
      }
    }
    const onChange = () => {
      if (!document.fullscreenElement) {
        try { window.screen.orientation.unlock?.() } catch { /* 有的浏览器没有 unlock */ }
      }
    }

    document.addEventListener('click', enter, true)
    document.addEventListener('fullscreenchange', onChange)
    return () => {
      document.removeEventListener('click', enter, true)
      document.removeEventListener('fullscreenchange', onChange)
    }
  }, [])
}
