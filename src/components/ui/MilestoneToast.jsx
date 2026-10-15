'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { AchievementIcon, achievementRim } from './AchievementIcon'

/**
 * 氪金里程碑弹窗：Steam 成就那样从右下角滑上来（2026-10-15 重做）
 *
 * - 左边是这个里程碑专属的成就徽章（AchievementIcon），出现时扫过一道高光
 * - 右边：「成就已解锁 · ¥648」、标题、文案；带选项的里程碑下面是两个按钮
 * - 和全站通知同一套亮灰紫玻璃；底部细线随剩余时间缩短，颜色是徽章那一档的边框色；鼠标停留时暂停
 * - 进出场动画、多条时的上下挪位交给 MilestoneToastProvider 里的 AnimatePresence + layout
 */
export function MilestoneToast({ id, milestone, onClose, onButtonClick, duration = 5000 }) {
  const rim = achievementRim(milestone.amount)
  const [paused, setPaused] = useState(false)
  const remainingRef = useRef(duration)

  // 倒计时：悬停时停、移开后接着剩下的时间走
  useEffect(() => {
    if (paused) return undefined
    const startedAt = Date.now()
    const timer = setTimeout(() => onClose(id), remainingRef.current)
    return () => {
      clearTimeout(timer)
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAt))
    }
  }, [paused, id, onClose])

  const choose = (text) => {
    onButtonClick?.(milestone, text)
    onClose(id)
  }

  return (
    <motion.div
      layout
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 360, damping: 32 } }}
      exit={{ y: 36, opacity: 0, transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="status"
      aria-live="polite"
      className="pointer-events-auto w-[min(19rem,84vw)] md:w-[22rem]"
    >
      <div className="relative overflow-hidden rounded-xl border border-white/20 bg-[#3a3650]/95 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
        <div className="flex gap-2.5 md:gap-3 p-2.5 md:p-3">
          <div className="achievement-icon relative shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-[10px] overflow-hidden">
            <AchievementIcon amount={milestone.amount} size={64} className="w-full h-full" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 pr-5 text-[10px] md:text-[11px] leading-none">
              <span className="text-white/75 tracking-wide">成就已解锁</span>
              <span className="text-white/35">·</span>
              <span className="font-semibold tabular-nums" style={{ color: rim }}>¥{milestone.amount.toLocaleString()}</span>
            </div>
            <h3 className="mt-1 md:mt-1.5 text-[13px] md:text-[15px] font-bold leading-snug text-white">
              {milestone.title}
            </h3>
            <p className="mt-1 text-[11px] md:text-xs leading-relaxed text-white/85 whitespace-pre-line">
              {milestone.content}
            </p>

            {milestone.buttons?.length > 0 && (
              <div className="mt-2 md:mt-2.5 flex gap-1.5 md:gap-2">
                {milestone.buttons.map((text, index) => (
                  <button
                    key={text}
                    onClick={() => choose(text)}
                    className="flex-1 rounded-md px-2 py-1.5 text-[10px] md:text-xs font-medium text-white whitespace-nowrap transition-colors hover:brightness-110"
                    style={index === 0
                      ? { background: 'rgba(255,255,255,0.12)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)' }
                      : { background: `${rim}33`, boxShadow: `inset 0 0 0 1px ${rim}aa` }}
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onClose(id)}
            aria-label="关闭"
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M7 7l10 10M17 7L7 17" />
            </svg>
          </button>
        </div>

        <span
          className="app-toast-timer absolute left-0 bottom-0 h-px w-full origin-left"
          style={{ background: rim, animationDuration: `${duration}ms`, animationPlayState: paused ? 'paused' : 'running' }}
        />
      </div>
    </motion.div>
  )
}
