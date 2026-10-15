'use client'

import { animate, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { CeremonyCanvas } from './ceremony/CeremonyCanvas'
import { Medallion } from './ceremony/Medallion'

/**
 * 带选项的里程碑：全屏仪式（2026-10-15 第三版，号主要「SVG + Canvas 动画，不要廉价感」）。
 *
 *   Canvas（ceremony/engine.js + scenes.js）  物理粒子：拖尾火花、3D 翻面的碎片 / 彩纸、立体金币、二次炸开的烟花、
 *                                             冲击波、上千粒子沿弧线飞来聚成标题
 *   SVG（ceremony/Medallion.jsx）            钞票雕版式的扭索纹、刻度环、环形微缩字、裂纹；圆环描线画出，扭索纹转着浮现，之后各层慢转
 *   DOM                                      标题遮罩上滑、金额从 0 滚到目标、「通往王座」刻度尺
 *
 * 只在左下角勋章区、屏幕左右窄带、上方两角出效果，中间的抽奖结果不挡；整层不拦点击。show 秒后淡出，
 * 右下角带选项的卡片留着等玩家选。
 *
 * 「万氪之王」三档逐级加码：
 *   伪神 20 万   4.6s  徽章裂开、玻璃碎片带棱光翻滚崩落、青粉色差火花与冲击波、两侧信号错位条；标题色差重影
 *   半神 50 万   5.6s  左金右紫两道细粉光柱升腾、分色火花；六股扭索纹；粒子就近聚成标题；通往王座 50%
 *   王   100 万  7.2s  金粉如雪、两侧金币雨、徽章砸下三道冲击波、上方两角七发烟花；两层扭索纹 + 微缩字环 + 双线外环；
 *                      上千金色粒子从两侧飞来聚成金字并扫过金箔光；通往王座 100%「王座已就位」再震一圈
 */

const THEMES = {
  1000: { scene: 'silver', level: 0, color: '#e4ecf6' },                                         // 四位数俱乐部
  3000: { scene: 'confetti', level: 0, color: '#7ff0b8' },                                       // 满池达成
  16499: { scene: 'rgb', level: 0, color: '#3dd6ff', rgb: true },                                // 旗舰显卡
  100000: { scene: 'alarm', level: 0, color: '#ffb35c', hazard: true },                          // 系统强制干预
  200000: { scene: 'fake', level: 1, color: '#ff7ad9', show: 4.6 },                              // 伪神
  500000: { scene: 'demi', level: 2, color: '#ffd86b', show: 5.6, tone: 'white', pct: 50 },      // 半神
  1000000: { scene: 'king', level: 3, color: '#ffd86b', show: 7.2, tone: 'gold', pct: 100 },     // 王
}
const LAND = [0.45, 0.45, 0.45, 0.65]   // 徽章落定时刻，画布的冲击波按这个对齐
const TEXT_DONE = [0.75, 0.75, 1.9, 2.8] // 标题出齐的时刻（半神 / 王 = scenes.js 里聚字粒子全部到位），细线 / 金额 / 刻度尺接在后面
const EASE = [0.22, 1, 0.36, 1]
const TITLE_BASE = 'inline-block whitespace-nowrap font-bold tracking-[0.06em]'

// 金额从 0 滚到目标值
function CountUp({ value, delay, duration, color, rgb }) {
  const ref = useRef(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    const controls = animate(0, value, {
      delay, duration, ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { node.textContent = `¥${Math.round(v).toLocaleString()}` },
    })
    return () => controls.stop()
  }, [value, delay, duration])
  return (
    <motion.span ref={ref} className={`mt-0.5 md:mt-2 block text-xs md:text-lg font-semibold tabular-nums tracking-wider ${rgb ? 'ceremony-hue' : ''}`}
      style={{ color }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay, duration: 0.3 }}>
      ¥0
    </motion.span>
  )
}

// 标题：半神 / 王的字由画布上的粒子聚成，这里只占位（透明，给画布量字体和位置）；其余从遮罩里滑上来，伪神再带色差重影
function Title({ text, level, onCanvas, sizeClass, titleRef }) {
  if (onCanvas) {
    return <h2 ref={titleRef} className={`${TITLE_BASE} ${sizeClass}`} style={{ opacity: 0 }}>{text}</h2>
  }
  return (
    <div className="relative overflow-hidden pb-1">
      {level === 1 && ['#4fe3ff', '#ff7ad9'].map((color, i) => (
        <motion.span key={color} className={`absolute left-0 top-0 ${TITLE_BASE} ${sizeClass}`} style={{ color }}
          initial={{ x: 0, opacity: 0 }}
          animate={{ x: i ? [5, 0, 0, 2.5, 0] : [-5, 0, 0, -2.5, 0], opacity: [0.7, 0, 0, 0.75, 0] }}
          transition={{ delay: 0.6, duration: 2.4, times: [0, 0.22, 0.6, 0.63, 0.69] }}>
          {text}
        </motion.span>
      ))}
      <motion.h2 className={`relative text-white ${TITLE_BASE} ${sizeClass} [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]`}
        initial={{ y: '115%' }} animate={{ y: '0%' }} transition={{ delay: 0.35, duration: 0.7, ease: EASE }}>
        {text}
      </motion.h2>
    </div>
  )
}

// 标题下的细线：描出来，末端一颗菱点；半神 / 王再多一根短的副线
function Hairline({ color, double, delay }) {
  return (
    <svg viewBox="0 0 300 14" className="mt-1 md:mt-2 block w-32 md:w-72 h-auto overflow-visible" aria-hidden="true">
      <motion.path d="M0 6H286" stroke={color} strokeWidth="1.3" fill="none"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay, duration: 0.7, ease: EASE }} />
      {double && (
        <motion.path d="M0 10.5H170" stroke={color} strokeWidth="0.7" fill="none"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.6 }} transition={{ delay: delay + 0.15, duration: 0.7, ease: EASE }} />
      )}
      <motion.path d="M293 1.5L297.5 6L293 10.5L288.5 6Z" fill={color}
        initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: delay + 0.6, duration: 0.3 }} />
    </svg>
  )
}

// 「通往王座」刻度尺：21 道刻度、菱形游标滑到 pct
function ThroneRuler({ pct, color, delay }) {
  const end = (pct / 100) * 300
  const slide = { delay, duration: 0.9, ease: EASE }
  return (
    <motion.div className="mt-1 md:mt-3.5 w-40 md:w-80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay - 0.25, duration: 0.4 }}>
      <div className="flex items-baseline justify-between text-[9px] md:text-xs font-semibold tracking-[0.25em] md:tracking-[0.3em] text-white/85">
        <span>通往王座</span>
        <motion.span style={{ color }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 0.95, duration: 0.3 }}>
          {pct >= 100 ? '王座已就位' : `${pct}%`}
        </motion.span>
      </div>
      <svg viewBox="-6 0 312 18" className="mt-1 block w-full h-auto overflow-visible" aria-hidden="true">
        <path d="M0 9H300" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        {Array.from({ length: 21 }, (_, i) => (
          <path key={i} d={`M${i * 15} ${i % 5 === 0 ? 2.5 : 5.5}V9`} stroke="rgba(255,255,255,0.6)" strokeWidth={i % 5 === 0 ? 1 : 0.7} />
        ))}
        <motion.path d="M0 9H300" stroke={color} strokeWidth="2.6" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: pct / 100 }} transition={slide} />
        <motion.path d="M0 3.5L4.5 9L0 14.5L-4.5 9Z" fill={color} stroke="#2a2433" strokeWidth="0.8" initial={{ x: 0 }} animate={{ x: end }} transition={slide} />
      </svg>
    </motion.div>
  )
}

function HazardTape({ amount }) {
  return (
    <motion.div className="ceremony-hazard mt-1 md:mt-2 inline-block p-[2px] md:p-[3px]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
      <span className="block bg-[#ffd166] px-2 md:px-2.5 py-0.5 text-[9px] md:text-xs font-black tracking-widest text-black">
        系统强制干预 · ¥{amount.toLocaleString()}
      </span>
    </motion.div>
  )
}

export function MilestoneCeremony({ milestone }) {
  const rootRef = useRef(null)
  const badgeRef = useRef(null)
  const titleRef = useRef(null)
  const theme = THEMES[milestone.amount] || THEMES[1000]
  const { level, color } = theme
  const show = theme.show || 3.8
  const onCanvas = Boolean(theme.tone)
  const title = milestone.title.replace(/^【|】$/g, '')
  // 手机：文字块比勋章高，底边对齐（items-end）+ 字号小一档，免得顶上的小字压到结果格子最后一行
  const titleSize = level === 3 ? 'text-xl md:text-5xl 2xl:text-6xl' : 'text-lg md:text-4xl 2xl:text-5xl'
  const textDone = TEXT_DONE[level]

  return (
    <motion.div ref={rootRef} className="pointer-events-none absolute inset-0 overflow-hidden" initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }} aria-hidden="true">
      <CeremonyCanvas scene={theme.scene} rootRef={rootRef} badgeRef={badgeRef} titleRef={titleRef} titleTone={theme.tone} land={LAND[level]} show={show} />

      <motion.div className="absolute left-[3%] bottom-[3%] md:bottom-[5%] flex items-end md:items-center gap-2.5 md:gap-6"
        initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: show, times: [0, 0.04, 0.9, 1] }}>
        <Medallion ref={badgeRef} amount={milestone.amount} level={level} color={color} rgb={theme.rgb} />
        <div className="min-w-0">
          <motion.div className="text-[9px] md:text-xs font-semibold tracking-[0.45em] md:tracking-[0.55em] text-white/85"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }}>
            {level === 3 ? '传说成就' : '重大成就'}
          </motion.div>
          <div className="mt-0.5 md:mt-2">
            <Title text={title} level={level} onCanvas={onCanvas} sizeClass={titleSize} titleRef={titleRef} />
          </div>
          <Hairline color={color} double={level >= 2} delay={textDone - 0.15} />
          {theme.hazard
            ? <HazardTape amount={milestone.amount} />
            : <CountUp value={milestone.amount} delay={textDone} duration={level === 3 ? 1.4 : 1} color={color} rgb={theme.rgb} />}
          {theme.pct && <ThroneRuler pct={theme.pct} color={color} delay={textDone + 0.15} />}
        </div>
      </motion.div>
    </motion.div>
  )
}
