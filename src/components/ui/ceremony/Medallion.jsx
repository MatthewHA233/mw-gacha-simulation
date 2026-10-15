'use client'

import { motion } from 'framer-motion'
import { forwardRef, useId } from 'react'
import { AchievementIcon } from '../AchievementIcon'
import { TAU } from './engine'

/**
 * 仪式左下角的勋章：徽章本体 + 背后一套 SVG 精细线稿，逐级加层。
 *   全部      细圆环（描线画出）
 *   伪神起    刻度环；钞票雕版式的扭索纹（几条错相位的正弦圆交织），伪神的这圈是断的、带青色错位重影；徽章被一道裂纹划开
 *   半神起    扭索纹六股金紫交织
 *   王        两层扭索纹（八股 + 外圈细密四股）、一圈环形微缩字「万氪之王 · ¥1,000,000」、双线外环与八颗菱点；徽章从高处砸下
 * 坐标系：徽章半边长 = 50，SVG 半边长 VB。
 * 性能：每个会转的层是一张独立的 <svg>（.ceremony-rotor 转的是这个 HTML 元素，走合成层，不重绘）；
 * 复杂的扭索纹不做描线动画（逐帧重绘几千个点太贵），用「转着放大浮现」进场；描线动画只给圆环 / 刻度这种简单路径。
 * 线稿超出徽章的部分用外边距（MARGIN）让出来，整块排版时不会被屏幕边裁掉、也不压右边的标题。
 */

const VB = 104
const VIEWBOX = `${-VB} ${-VB} ${VB * 2} ${VB * 2}`
const EASE_DRAW = [0.3, 0, 0.15, 1]

function wavePath(R, A, k, phase, from = 0, to = TAU) {
  const steps = Math.round(k * 16 * ((to - from) / TAU))
  const parts = []
  for (let i = 0; i <= steps; i += 1) {
    const th = from + ((to - from) * i) / steps
    const r = R + A * Math.sin(k * th + phase)
    parts.push(`${i ? 'L' : 'M'}${(r * Math.cos(th)).toFixed(2)} ${(r * Math.sin(th)).toFixed(2)}`)
  }
  return parts.join('')
}

const circlePath = (r) => `M${r} 0A${r} ${r} 0 1 1 ${-r} 0A${r} ${r} 0 1 1 ${r} 0`

function ticksPath(r1, r2, rMajor, count, majorEvery) {
  return Array.from({ length: count }, (_, i) => {
    const th = (i / count) * TAU
    const outer = i % majorEvery === 0 ? rMajor : r2
    return `M${(r1 * Math.cos(th)).toFixed(2)} ${(r1 * Math.sin(th)).toFixed(2)}L${(outer * Math.cos(th)).toFixed(2)} ${(outer * Math.sin(th)).toFixed(2)}`
  }).join('')
}

// 描线画出：pathLength 0 → 1（opacity 是画完后的透明度，不能再写成属性，否则被动画覆盖）
const drawOn = (delay, duration = 1, opacity = 1) => ({
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity },
  transition: { pathLength: { delay, duration, ease: EASE_DRAW }, opacity: { delay, duration: 0.15 } },
})

// 一层线稿：外层 div 负责进场（透明度 / 缩放 / 旋入，合成层动画），内层 svg 负责常转
function Layer({ spin, reveal, children }) {
  const svg = (
    <svg viewBox={VIEWBOX} overflow="visible" aria-hidden="true" className={`absolute inset-0 w-full h-full ${spin || ''}`} style={spin ? { willChange: 'transform' } : undefined}>
      <g transform="rotate(-90)">{children}</g>
    </svg>
  )
  if (!reveal) return svg
  return (
    <motion.div className="absolute inset-0" style={{ willChange: 'transform, opacity' }}
      initial={{ opacity: 0, scale: 0.86, rotate: reveal.turn }} animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ delay: reveal.delay, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}>
      {svg}
    </motion.div>
  )
}

// 每档的扭索纹：R 基准半径、A 振幅、k 波数、n 股数（相位均分）、颜色轮换
const GUILLOCHE = {
  1: [{ R: 73, A: 4.5, k: 15, n: 3, colors: ['#ff9be0'], opacity: 0.8, from: 0.55, to: TAU - 0.12, ghost: '#4fe3ff' }],
  2: [{ R: 73, A: 5, k: 16, n: 6, colors: ['#ffd86b', '#c9bbf0'], opacity: 0.75 }],
  3: [
    { R: 73, A: 5, k: 20, n: 8, colors: ['#ffd86b', '#fff3c4'], opacity: 0.7 },
    { R: 85, A: 2.4, k: 40, n: 4, colors: ['#ffe9a8'], opacity: 0.55, reverse: true },
  ],
}

function GuillocheBand({ band }) {
  const strands = Array.from({ length: band.n }, (_, i) => wavePath(band.R, band.A, band.k, (i / band.n) * TAU, band.from, band.to))
  return (
    <>
      {band.ghost && (
        <g transform="translate(1.6 0.6)" opacity="0.5">
          {strands.map((d, i) => <path key={i} d={d} fill="none" stroke={band.ghost} strokeWidth="0.5" />)}
        </g>
      )}
      <g opacity={band.opacity}>
        {strands.map((d, i) => <path key={i} d={d} fill="none" stroke={band.colors[i % band.colors.length]} strokeWidth="0.55" />)}
      </g>
    </>
  )
}

// 王：沿圆环排的微缩字（钞票 / 硬币边缘那种）
function MicroText({ id }) {
  const r = 92
  const text = Array.from({ length: 7 }, () => '万氪之王 · ¥1,000,000 · ').join('')
  return (
    <>
      <path id={id} d={circlePath(r)} fill="none" />
      <text fill="#ffe9a8" fontSize="4.8" fontWeight="600" opacity="0.85">
        <textPath href={`#${id}`} textLength={TAU * r - 4} lengthAdjust="spacing">{text}</textPath>
      </text>
    </>
  )
}

// 王：双线外环 + 八颗菱点
function OuterRing({ t0 }) {
  return (
    <>
      <motion.path d={circlePath(98)} fill="none" stroke="#ffd86b" strokeWidth="0.8" {...drawOn(t0 + 0.1, 0.8)} />
      <motion.path d={circlePath(100.5)} fill="none" stroke="#ffd86b" strokeWidth="0.4" {...drawOn(t0 + 0.18, 0.8, 0.7)} />
      {Array.from({ length: 8 }, (_, i) => {
        const th = (i / 8) * TAU
        return (
          <g key={i} transform={`translate(${(99.25 * Math.cos(th)).toFixed(2)} ${(99.25 * Math.sin(th)).toFixed(2)}) rotate(${(th * 180) / Math.PI + 90})`}>
            <motion.path d="M0 -3.2L2 0L0 3.2L-2 0Z" fill="#fff3c4" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: t0 + 0.7 + i * 0.05, duration: 0.3 }} />
          </g>
        )
      })}
    </>
  )
}

// 伪神：徽章上划开的裂纹（暗色衬底 + 白色裂口）
function Crack() {
  const d = 'M4.7 -45.3L-4.7 -20.3L7.8 -7.8L-7.8 14.1L3.1 45.3'
  return (
    <svg viewBox="-50 -50 100 100" className="absolute inset-0 w-full h-full" aria-hidden="true">
      <motion.path d={d} fill="none" stroke="#2a1530" strokeWidth="4.2" strokeLinejoin="round" strokeLinecap="round" {...drawOn(0.72, 0.22)} />
      <motion.path d={d} fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" {...drawOn(0.72, 0.22)} />
    </svg>
  )
}

// 手机（不到 md）统一 52px：手机结果格子 50px × 两行占满中间，勋章连同线稿要收在左下角的空当里，也别太占屏
const BADGE_SIZE = [
  'w-[52px] h-[52px] md:w-24 md:h-24 2xl:w-32 2xl:h-32',
  'w-[52px] h-[52px] md:w-24 md:h-24 2xl:w-32 2xl:h-32',
  'w-[52px] h-[52px] md:w-28 md:h-28 2xl:w-36 2xl:h-36',
  'w-[52px] h-[52px] md:w-28 md:h-28 2xl:w-40 2xl:h-40',
]
// 线稿伸出徽章外的距离 ≈ 徽章边长 × (最外圈半径 / 50 - 1) / 2：零档 0.13、伪神 / 半神 0.29、王 0.51
const MARGIN = ['m-1.5 md:m-4', 'm-4 md:m-7 2xl:m-9', 'm-4 md:m-8 2xl:m-10', 'm-7 md:m-14 2xl:m-20']

export const Medallion = forwardRef(function Medallion({ amount, level, color, rgb }, ref) {
  const uid = useId().replace(/:/g, '')
  const t0 = level === 3 ? 0.55 : 0   // 王：线稿等徽章砸下（0.65s）时一起炸开
  const bands = GUILLOCHE[level] || []
  const entrance = level === 3
    ? { initial: { scale: 1.8, opacity: 0 }, animate: { scale: [1.8, 0.94, 1], opacity: [0, 1, 1] }, transition: { delay: 0.3, duration: 0.5, times: [0, 0.7, 1], ease: ['easeIn', 'easeOut'] } }
    : { initial: { scale: 0.55, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { delay: 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] } }

  return (
    <div ref={ref} className={`relative shrink-0 ${BADGE_SIZE[level]} ${MARGIN[level]}`}>
      <div className={`absolute left-1/2 top-1/2 w-[208%] h-[208%] -translate-x-1/2 -translate-y-1/2 ${rgb ? 'ceremony-hue' : ''}`}>
        <Layer>
          <motion.path d={circlePath(56)} fill="none" stroke={color} strokeWidth="0.9" {...drawOn(t0 + 0.05, 0.6)} />
          {level === 0 && <motion.path d={ticksPath(58.5, 60.5, 63, 24, 6)} fill="none" stroke={color} strokeWidth="0.6" {...drawOn(0.15, 0.7, 0.8)} />}
          {level === 3 && <OuterRing t0={t0} />}
        </Layer>
        {level >= 1 && (
          <Layer spin="ceremony-rotor-slow">
            <motion.path d={ticksPath(58.5, 61, 64.5, 120, 10)} fill="none" stroke={color} strokeWidth="0.5" {...drawOn(t0 + 0.15, 0.8, 0.85)} />
          </Layer>
        )}
        {bands.map((band, b) => (
          <Layer key={b} spin={band.reverse ? 'ceremony-rotor-reverse' : 'ceremony-rotor'} reveal={{ delay: t0 + 0.2 + b * 0.15, turn: band.reverse ? 40 : -40 }}>
            <GuillocheBand band={band} />
          </Layer>
        ))}
        {level === 3 && (
          <Layer spin="ceremony-rotor-reverse" reveal={{ delay: t0 + 0.5, turn: 25 }}>
            <MicroText id={`ceremony-micro-${uid}`} />
          </Layer>
        )}
      </div>

      <motion.div className="relative w-full h-full" {...entrance}>
        <div className="relative w-full h-full overflow-hidden rounded-[18%]">
          <AchievementIcon amount={amount} size={192} className="w-full h-full" />
          {level >= 1 && (
            <motion.div className="absolute left-0 inset-y-[-20%] w-[30%] bg-white/30" style={{ skewX: -18 }}
              initial={{ x: '-170%' }} animate={{ x: '470%' }} transition={{ delay: level === 3 ? 1.1 : 0.9, duration: 0.75, ease: [0.4, 0, 0.2, 1] }} />
          )}
        </div>
        {level === 1 && <Crack />}
      </motion.div>
    </div>
  )
})
