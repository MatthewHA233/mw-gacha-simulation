'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

const MILESTONE_THRESHOLD = 2500

// Pre-computed sparkle directions
const SPARKLES = Array.from({ length: 10 }, (_, i) => ({
  angle: (i / 10) * Math.PI * 2,
  dist: 90 + (i % 3) * 35,
  delay: 0.3 + i * 0.06,
  size: i % 2 === 0 ? 6 : 4,
}))

/**
 * 里程碑抽奖按钮：累计抽数达到5000时，500抽按钮通过动画过渡为5000抽
 *
 * - totalDraws < 5000：显示"抽奖 ×500"，点击执行500连抽
 * - totalDraws 首次达到5000：按钮居中放大 + 特效 + 数字滚动（500→5000）→ 淡出回位
 * - totalDraws >= 5000（已解锁）：显示"抽奖 ×5000"，点击执行5000连抽
 */
export function MilestonePullButton({
  totalDraws,
  onDraw500,
  onDraw5000,
  onPlaySound,
  isDisabled = false,
  resultModalOpen = false,
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
  const prevResultModalRef = useRef(resultModalOpen)
  const animationFrameRef = useRef(null)
  const startTimeRef = useRef(null)
  const [pendingAnimation, setPendingAnimation] = useState(false)
  const delayTimerRef = useRef(null)
  const countTimerRef = useRef(null)
  const buttonRef = useRef(null)
  const [mounted, setMounted] = useState(false)
  const [shouldRotate, setShouldRotate] = useState(false)
  const [slideTarget, setSlideTarget] = useState({ x: 0, y: 0 })

  useEffect(() => { setMounted(true) }, [])

  // Detect mobile portrait rotation (same logic as GachaPage / MilestoneToastProvider)
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      setShouldRotate(w < h && w < 900)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Detect milestone crossing — only mark as pending, never schedule directly
  useEffect(() => {
    const prev = prevTotalDrawsRef.current
    prevTotalDrawsRef.current = totalDraws

    if (prev < MILESTONE_THRESHOLD && totalDraws >= MILESTONE_THRESHOLD && phase === 'idle') {
      setPendingAnimation(true)
    }
  }, [totalDraws, phase])

  // Schedule animation only when result modal transitions from open → closed
  // This ensures the animation plays AFTER the user sees and dismisses their draw results
  useEffect(() => {
    const wasOpen = prevResultModalRef.current
    prevResultModalRef.current = resultModalOpen

    if (wasOpen && !resultModalOpen && pendingAnimation && phase === 'idle') {
      delayTimerRef.current = setTimeout(() => {
        setPendingAnimation(false)
        beginAnimation()
      }, 1000)
    }
    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current)
    }
  }, [resultModalOpen, pendingAnimation, phase])

  const beginAnimation = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const bx = rect.left + rect.width / 2
    const by = rect.top + rect.height / 2
    const w = window.innerWidth
    const h = window.innerHeight
    const rotated = w < h && w < 900

    // Convert viewport coords → offset from portal center
    // Rotated portal: local coords = (viewportY, viewportWidth - viewportX)
    // Non-rotated portal: local coords = (viewportX, viewportY)
    const offsetX = rotated ? (by - h / 2) : (bx - w / 2)
    const offsetY = rotated ? (w / 2 - bx) : (by - h / 2)
    setSlideTarget({ x: offsetX, y: offsetY })

    setPhase('animating')
    countTimerRef.current = setTimeout(() => startCountAnimation(), 700)
  }, [])

  const startCountAnimation = useCallback(() => {
    startTimeRef.current = performance.now()
    const duration = 2000

    const tick = (now) => {
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      let count = Math.round(500 + 4500 * eased)
      count = Math.min(Math.round(count / 100) * 100, 5000)
      setDisplayCount(count)

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick)
      } else {
        animationFrameRef.current = null
        countTimerRef.current = setTimeout(() => setPhase('sliding'), 400)
      }
    }

    animationFrameRef.current = requestAnimationFrame(tick)
  }, [])

  const handleClick = useCallback(() => {
    if (phase === 'animating' || phase === 'sliding') return
    if (onPlaySound) onPlaySound()
    if (phase === 'unlocked') {
      onDraw5000()
    } else {
      onDraw500()
    }
  }, [phase, onDraw500, onDraw5000, onPlaySound])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current)
      if (countTimerRef.current) clearTimeout(countTimerRef.current)
    }
  }, [])

  const isAnimPhase = phase === 'animating' || phase === 'sliding'
  const isUpgraded = phase === 'unlocked' || isAnimPhase

  const rainbowGradient = 'conic-gradient(from 90deg at 50% 50%, #ff2d2d, #ff7f00, #ffd700, #00e68a, #00bfff, #a855f7, #ff2d2d)'
  const purpleGradient = 'conic-gradient(from 90deg at 50% 50%, #E2CBFF 0%, #393BB2 50%, #E2CBFF 100%)'
  const gradient = isUpgraded ? rainbowGradient : purpleGradient

  // Shared button structure — identical for normal & animated versions
  const btnOuter = `relative inline-flex ${heightClass} overflow-hidden rounded-full p-[1px] focus:outline-none`
  const btnInner = `inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 ${paddingClass} py-1 ${textClass} font-bold text-white whitespace-nowrap backdrop-blur-3xl hover:bg-slate-900 transition-colors`

  // Rotation styles for portal container (matches GachaPage / MilestoneToastProvider)
  const portalStyle = shouldRotate
    ? {
        position: 'fixed',
        width: '100vh',
        height: '100vw',
        transform: 'rotate(90deg) translateY(-100%)',
        transformOrigin: 'top left',
        top: 0,
        left: 0,
        zIndex: 9998,
      }
    : {
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
      }

  return (
    <>
      <div className="relative inline-flex flex-col items-center">
        {/* Normal button — hidden (keeps layout) during animation, pulse on unlock */}
        <motion.button
          ref={buttonRef}
          onClick={handleClick}
          disabled={isDisabled || isAnimPhase}
          className={`${btnOuter} focus:ring-2 ${
            isUpgraded ? 'focus:ring-purple-400' : 'focus:ring-slate-400'
          } focus:ring-offset-2 focus:ring-offset-slate-50 disabled:opacity-50 disabled:cursor-not-allowed`}
          style={{
            visibility: isAnimPhase ? 'hidden' : 'visible',
            filter: isUpgraded && !isAnimPhase ? 'drop-shadow(0 0 8px rgba(168,85,247,0.5))' : undefined,
          }}
        >
          <span
            className="absolute inset-[-1000%]"
            style={{
              background: gradient,
              animation: `spin ${isUpgraded ? '3s' : '2s'} linear infinite`,
            }}
          />
          <span className={btnInner}>
            抽奖 ×{displayCount}
          </span>
        </motion.button>
      </div>

      {/* ── Animation overlay (portal with rotation-aware container) ── */}
      {isAnimPhase && mounted && createPortal(
        <div style={portalStyle}>
          {/* Full-screen flex centering */}
          <div className="w-full h-full flex items-center justify-center" style={{ position: 'relative' }}>
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'sliding' ? 0 : 1 }}
              transition={{ duration: phase === 'sliding' ? 0.6 : 0.4 }}
            />

            {/* ── Effects layer ── */}
            <AnimatePresence>
              {phase === 'animating' && (
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
                  {/* Radial glow */}
                  <motion.div
                    className="absolute rounded-full"
                    style={{
                      left: '50%', top: '50%',
                      background: 'radial-gradient(circle, rgba(168,85,247,0.35) 0%, rgba(255,215,0,0.15) 40%, transparent 70%)',
                    }}
                    initial={{ width: 60, height: 60, x: '-50%', y: '-50%', opacity: 0 }}
                    animate={{ width: 360, height: 360, x: '-50%', y: '-50%', opacity: [0, 1, 0.7] }}
                    transition={{ duration: 2.5, ease: 'easeOut' }}
                  />

                  {/* Expanding rings */}
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={`ring-${i}`}
                      className="absolute rounded-full"
                      style={{
                        left: '50%', top: '50%',
                        border: '2px solid',
                        borderColor: i === 0 ? 'rgba(168,85,247,0.5)' : i === 1 ? 'rgba(255,215,0,0.4)' : 'rgba(0,191,255,0.35)',
                      }}
                      initial={{ width: 30, height: 30, x: '-50%', y: '-50%', opacity: 0.9 }}
                      animate={{ width: 280, height: 280, x: '-50%', y: '-50%', opacity: 0 }}
                      transition={{ duration: 1.4, delay: 0.2 + i * 0.35, ease: 'easeOut' }}
                    />
                  ))}

                  {/* Sparkle particles */}
                  {SPARKLES.map((s, i) => (
                    <motion.div
                      key={`sp-${i}`}
                      className="absolute rounded-full"
                      style={{
                        left: '50%', top: '50%',
                        width: s.size, height: s.size,
                        background: i % 3 === 0 ? '#ffd700' : i % 3 === 1 ? '#a855f7' : '#00bfff',
                        boxShadow: `0 0 6px ${i % 3 === 0 ? '#ffd700' : i % 3 === 1 ? '#a855f7' : '#00bfff'}`,
                      }}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{
                        x: Math.cos(s.angle) * s.dist,
                        y: Math.sin(s.angle) * s.dist,
                        opacity: 0, scale: 0,
                      }}
                      transition={{ duration: 1.0, delay: s.delay, ease: 'easeOut' }}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>

            {/* ── Centered animated button clone ── */}
            <motion.div
              style={{
                zIndex: 10000,
                pointerEvents: 'none',
                filter: 'drop-shadow(0 0 14px rgba(168,85,247,0.6))',
              }}
              initial={{ scale: 0.5, opacity: 0, x: 0, y: 0 }}
              animate={
                phase === 'animating'
                  ? { scale: 1.8, opacity: 1, x: 0, y: 0 }
                  : { scale: 1, opacity: 1, x: slideTarget.x, y: slideTarget.y }
              }
              transition={
                phase === 'animating'
                  ? { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
                  : { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
              }
              onAnimationComplete={() => {
                if (phase === 'sliding') setPhase('unlocked')
              }}
            >
              <div className={btnOuter}>
                <span
                  className="absolute inset-[-1000%]"
                  style={{ background: rainbowGradient, animation: 'spin 0.5s linear infinite' }}
                />
                <span className={btnInner}>
                  抽奖 ×{displayCount}
                </span>
              </div>
            </motion.div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
