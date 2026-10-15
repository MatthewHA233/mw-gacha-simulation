'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { MusicPlayer } from '../music/MusicPlayer'
import { useSound } from '../../hooks/useSound'

/**
 * 左下角悬浮控件（2026-10-15）：背景音乐播放器 + 手机「全屏横屏」。
 * 放在抽卡页的旋转容器里（伪横屏时跟着一起转）；音乐状态在根布局的 MusicProvider，换页面不中断。
 */

// 「全屏横屏」：进入全屏后把屏幕方向锁成横屏，系统锁了竖屏也是真横屏（截图、输入法都横）。
// 只在支持锁定方向的触屏浏览器上显示（安卓 Chrome / Edge / 三星 / 火狐）；iPhone Safari、微信 / QQ 内置浏览器不支持就不显示，继续用伪横屏。
function useLandscapeLockSupport() {
  const [supported, setSupported] = useState(false)
  useEffect(() => {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches
    const canFullscreen = !!(document.fullscreenEnabled && document.documentElement.requestFullscreen)
    const canLock = !!(window.screen?.orientation && typeof window.screen.orientation.lock === 'function')
    setSupported(!!(coarse && canFullscreen && canLock))
  }, [])
  return supported
}

function LandscapeButton() {
  const supported = useLandscapeLockSupport()
  const [active, setActive] = useState(false)
  const { playButtonClick } = useSound()

  useEffect(() => {
    const onChange = () => {
      const inFullscreen = !!document.fullscreenElement
      setActive(inFullscreen)
      if (!inFullscreen) { try { window.screen.orientation.unlock?.() } catch { /* 有的浏览器没有 unlock */ } }
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  if (!supported) return null

  const enter = async () => {
    try {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    } catch {
      toast.error('当前浏览器不允许全屏')
      return
    }
    try {
      await window.screen.orientation.lock('landscape')
    } catch {
      try { await document.exitFullscreen() } catch { /* 已退出 */ }
      toast('当前浏览器不支持锁定横屏，请打开系统自动旋转后把手机横过来', { icon: 'ℹ️' })
    }
  }
  const exit = async () => {
    try { window.screen.orientation.unlock?.() } catch { /* 同上 */ }
    try { await document.exitFullscreen() } catch { /* 已退出 */ }
  }

  return (
    <button
      onClick={() => { playButtonClick(); active ? exit() : enter() }}
      aria-label={active ? '退出全屏' : '全屏横屏'}
      title={active ? '退出全屏' : '全屏横屏'}
      className="w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center bg-slate-900/80 border border-white/25 text-white/85 shadow-[0_3px_10px_rgba(0,0,0,0.6)] hover:text-white"
    >
      {active ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3v4a2 2 0 0 1-2 2H3M21 9h-4a2 2 0 0 1-2-2V3M3 15h4a2 2 0 0 1 2 2v4M15 21v-4a2 2 0 0 1 2-2h4" /></svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
      )}
    </button>
  )
}

export function FloatingControls() {
  return (
    <div className="absolute left-3 bottom-3 md:left-6 md:bottom-6 z-30 flex flex-col items-start gap-2">
      <LandscapeButton />
      <MusicPlayer />
    </div>
  )
}
