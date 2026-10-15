'use client'

import { useEffect, useRef, useState } from 'react'
import { Toaster, resolveValue, toast as hotToast } from 'react-hot-toast'

/**
 * 全站统一的通知 toast（2026-10-15，里程碑 toast 除外，那套是 MilestoneToastProvider 自己的）
 *
 * 仍然用 react-hot-toast 的 toast() / toast.success() / toast.error() 调用，这里只接管渲染：
 * - 位置：右上角、顶栏下方，多条往下叠（原先屏幕正上方居中弹出，不像通知）
 * - 外观：和背景音乐播放器同一套亮一档的灰紫玻璃；左边细线状态图标 + 白字；底部一根细线随剩余时间缩短，悬停暂停
 * - 动画：从右侧滑入带一点回弹，退出向右滑出淡出（keyframes 在 src/index.css 的 .app-toast-*）
 * - 调用处传的 style / iconTheme 一律忽略，保证全站一个样子；icon: '⚠️' 视为「提醒」
 * - 点一下关闭
 * - 连点：同一句话不叠多条，合成一条、右边显示 ×N，每次再触发卡片跳一下、倒计时细线从头开始（见下面 dedupe 与 AppToast）
 */

// 同一句话连点不叠多条：没给 id 的 success / error 按「类型 + 文案」自动给 id，再触发就是刷新同一条。
// （toast 默认导出和具名导出是同一个对象，改它的 success / error 对全站调用都生效；toast() 普通通知文案各不相同，不处理）
let dedupeInstalled = false
function installDedupe() {
  if (dedupeInstalled) return
  dedupeInstalled = true
  for (const type of ['success', 'error']) {
    const original = hotToast[type]
    hotToast[type] = (message, options = {}) => original(
      message,
      typeof message === 'string' && !options.id ? { ...options, id: `auto:${type}:${message}` } : options,
    )
  }
}
installDedupe()

const TONES = {
  success: { color: '#6ee7b7', label: '成功' },
  error: { color: '#fda4af', label: '失败' },
  warning: { color: '#fcd34d', label: '提醒' },
  info: { color: '#d6cbf5', label: '通知' },
  loading: { color: '#d6cbf5', label: '处理中' },
}

function toneOf(t) {
  if (t.type === 'success' || t.type === 'error' || t.type === 'loading') return t.type
  if (t.icon === '⚠️' || t.icon === '⚠') return 'warning'
  return 'info'
}

function ToneIcon({ tone, color }) {
  const common = {
    className: 'w-3.5 h-3.5',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  if (tone === 'success') return <svg {...common}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
  if (tone === 'error') return <svg {...common}><path d="M7 7l10 10M17 7L7 17" /></svg>
  if (tone === 'warning') return <svg {...common}><path d="M12 6v7.5" /><path d="M12 17.5v.01" /></svg>
  if (tone === 'loading') {
    return (
      <svg {...common} className="w-3.5 h-3.5 animate-spin">
        <path d="M12 4a8 8 0 1 0 8 8" />
      </svg>
    )
  }
  return <svg {...common}><path d="M12 11v6" /><path d="M12 7v.01" /></svg>
}

// 同一个 id 再次触发时 react-hot-toast 会更新 createdAt（消失计时也随之重置）：据此计数、跳一下、细线重来。
// 文案一样 = 连点同一件事，次数 +1；文案变了（比如播放模式切到下一种）只刷新、不计数。
function useRepeat(t) {
  const message = typeof t.message === 'string' ? t.message : ''
  const last = useRef({ createdAt: t.createdAt, message })
  const [count, setCount] = useState(1)
  const [bump, setBump] = useState(0)
  useEffect(() => {
    if (t.createdAt === last.current.createdAt) return
    setCount((value) => (message === last.current.message ? value + 1 : 1))
    setBump((value) => value + 1)
    last.current = { createdAt: t.createdAt, message }
  }, [t.createdAt, message])
  return { count, bump }
}

function AppToast({ t }) {
  const tone = toneOf(t)
  const { color, label } = TONES[tone]
  const timed = Number.isFinite(t.duration) && t.duration > 0 && tone !== 'loading'
  const { count, bump } = useRepeat(t)
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      aria-label={label}
      onClick={() => hotToast.dismiss(t.id)}
      className={`app-toast group/toast relative w-max max-w-[min(20rem,80vw)] cursor-pointer select-none overflow-hidden rounded-xl border border-white/20 bg-[#3a3650]/92 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.35)] ${
        t.visible ? 'app-toast-enter' : 'app-toast-leave'
      }`}
    >
      <div key={bump} className={`flex items-start gap-2.5 pl-3 pr-3.5 py-2.5 ${bump ? 'app-toast-bump' : ''}`}>
        <span
          className="mt-[1px] shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ boxShadow: `inset 0 0 0 1.5px ${color}` }}
        >
          <ToneIcon tone={tone} color={color} />
        </span>
        <span className="min-w-0 text-[12px] md:text-[13px] leading-[1.45] text-white whitespace-pre-line break-words">
          {resolveValue(t.message, t)}
        </span>
        {count > 1 && (
          <span className="app-toast-count shrink-0 self-center -mr-0.5 text-[11px] md:text-xs font-semibold tabular-nums" style={{ color }}>
            ×{count}
          </span>
        )}
      </div>
      {timed && (
        <span
          key={t.createdAt}
          className="app-toast-timer absolute left-0 bottom-0 h-px w-full origin-left"
          style={{ background: color, animationDuration: `${t.duration}ms` }}
        />
      )}
    </div>
  )
}

export function AppToaster({ isMobile }) {
  return (
    <Toaster
      position="top-right"
      gutter={8}
      containerClassName="app-toaster"
      containerStyle={{
        zIndex: 10000,
        top: isMobile ? 52 : 72,   // 让开顶栏
        right: isMobile ? 12 : 20,
      }}
      toastOptions={{ duration: 3000, success: { duration: 2600 }, error: { duration: 3600 } }}
    >
      {(t) => <AppToast t={t} />}
    </Toaster>
  )
}
