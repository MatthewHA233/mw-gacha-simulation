'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

const MILESTONE_THRESHOLD = 5000

/**
 * 里程碑抽奖按钮：累计抽数达到5000时，500抽按钮通过动画过渡为5000抽
 *
 * - totalDraws < 5000：显示"抽奖 ×500"，点击执行500连抽
 * - totalDraws 首次达到5000：播放数字滚动动画（500→5000），可点击跳过
 * - totalDraws >= 5000（已解锁/动画完成）：显示"抽奖 ×5000"，点击执行5000连抽
 */
export function MilestonePullButton({
  totalDraws,
  onDraw500,
  onDraw5000,
  onPlaySound,
  isDisabled = false,
  heightClass = 'h-10',
  textClass = 'text-sm',
  paddingClass = 'px-8',
}) {
  const [phase, setPhase] = useState(() =>
    totalDraws >= MILESTONE_THRESHOLD ? 'unlocked' : 'idle'
  )
  const [displayCount, setDisplayCount] = useState(() =>
    totalDraws >= MILESTONE_THRESHOLD ? 5000 : 500
  )
  const prevTotalDrawsRef = useRef(totalDraws)
  const animationFrameRef = useRef(null)
  const startTimeRef = useRef(null)

  // Detect milestone crossing
  useEffect(() => {
    const prev = prevTotalDrawsRef.current
    prevTotalDrawsRef.current = totalDraws

    if (prev < MILESTONE_THRESHOLD && totalDraws >= MILESTONE_THRESHOLD && phase === 'idle') {
      startCountAnimation()
    }
  }, [totalDraws, phase])

  const startCountAnimation = useCallback(() => {
    setPhase('animating')
    startTimeRef.current = performance.now()
    const duration = 2000

    const animate = (now) => {
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3)
      let count = Math.round(500 + 4500 * eased)
      count = Math.min(Math.round(count / 100) * 100, 5000)
      setDisplayCount(count)

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        finishAnimation()
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)
  }, [])

  const finishAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    setDisplayCount(5000)
    setPhase('unlocked')
  }, [])

  const handleClick = useCallback(() => {
    if (phase === 'animating') {
      finishAnimation()
      return
    }
    if (onPlaySound) onPlaySound()
    if (phase === 'unlocked') {
      onDraw5000()
    } else {
      onDraw500()
    }
  }, [phase, onDraw500, onDraw5000, onPlaySound, finishAnimation])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const isUpgraded = phase === 'unlocked' || phase === 'animating'
  const isAnimating = phase === 'animating'

  const gradient = isUpgraded
    ? 'conic-gradient(from 90deg at 50% 50%, #FF6B6B 0%, #B91C1C 50%, #FF6B6B 100%)'
    : 'conic-gradient(from 90deg at 50% 50%, #E2CBFF 0%, #393BB2 50%, #E2CBFF 100%)'

  return (
    <div className="relative inline-flex flex-col items-center">
      <motion.button
        onClick={handleClick}
        disabled={isDisabled && !isAnimating}
        animate={
          isAnimating
            ? { scale: [1, 1.08, 1] }
            : { scale: 1 }
        }
        transition={
          isAnimating
            ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
        className={`relative inline-flex ${heightClass} overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 ${
          isUpgraded ? 'focus:ring-red-400' : 'focus:ring-slate-400'
        } focus:ring-offset-2 focus:ring-offset-slate-50 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {/* Spinning gradient border */}
        <span
          className="absolute inset-[-1000%]"
          style={{
            background: gradient,
            animation: `spin ${isAnimating ? '0.5s' : '2s'} linear infinite`,
          }}
        />
        {/* Inner content */}
        <span
          className={`inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 ${paddingClass} py-1 ${textClass} font-bold text-white backdrop-blur-3xl hover:bg-slate-900 transition-all`}
        >
          抽奖 ×{displayCount}
        </span>
      </motion.button>
      {/* Skip hint during animation */}
      {isAnimating && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-5 text-[10px] text-gray-400 whitespace-nowrap pointer-events-none"
        >
          点击跳过
        </motion.span>
      )}
    </div>
  )
}
