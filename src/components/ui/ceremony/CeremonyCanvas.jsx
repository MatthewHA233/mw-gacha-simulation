'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { Scene } from './engine'
import { SCENES } from './scenes'
import { rasterizeTitle } from './titleRaster'

/**
 * 仪式的全屏粒子画布：量好徽章 / 标题在仪式层里的位置，按分镜（scenes.js）跑粒子，show 秒后随勋章一起淡出并停帧。
 * 位置用 offsetLeft/Top 链算，不受 framer 的 transform 和手机伪横屏的 rotate(90deg) 影响。
 */

export function localBox(el, root) {
  let x = 0
  let y = 0
  let node = el
  while (node && node !== root) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

export function CeremonyCanvas({ scene: sceneName, rootRef, badgeRef, titleRef, titleTone, land, show }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const run = SCENES[sceneName]
    if (!root || !canvas || !badgeRef.current || !run) return undefined
    let raf = 0
    let stopped = false
    const mountedAt = performance.now()

    const start = () => {
      const w = root.clientWidth
      const h = root.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      const ctx = canvas.getContext('2d')
      const badge = localBox(badgeRef.current, root)
      const k = clamp((w * h) / (1920 * 1080), 0.35, 1)
      const anchors = {
        w, h, k, s: clamp(Math.min(w, h) / 1000, 0.5, 1.2), land,
        bx: badge.x + badge.w / 2, by: badge.y + badge.h / 2, bs: badge.w,
        title: titleTone && titleRef.current
          ? rasterizeTitle(titleRef.current, localBox(titleRef.current, root), { tone: titleTone, max: Math.round(1500 * k + 250), gap: k < 0.6 ? 2 : 2.4 })
          : null,
      }
      const scene = new Scene(w, h)
      run(scene, anchors)
      // 等字体、量位置、栅格化花掉的时间直接快进补上，画布和 DOM 动画（挂载即开始）对齐
      for (let behind = (performance.now() - mountedAt) / 1000; behind > 0; behind -= 1 / 60) scene.step(Math.min(1 / 60, behind))

      let last = performance.now()
      const frame = (now) => {
        if (stopped) return
        scene.step(Math.min(0.1, (now - last) / 1000))
        last = now
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)
        scene.draw(ctx)
        if (scene.t < show + 0.6) raf = requestAnimationFrame(frame)
      }
      raf = requestAnimationFrame(frame)
    }

    // 等一帧（标题排好版）+ 字体就绪，再量位置、栅格化标题
    const first = requestAnimationFrame(() => {
      const ready = document.fonts?.ready ?? Promise.resolve()
      ready.then(() => !stopped && start())
    })
    return () => {
      stopped = true
      cancelAnimationFrame(first)
      cancelAnimationFrame(raf)
    }
  }, [sceneName, rootRef, badgeRef, titleRef, titleTone, land, show])

  return (
    <motion.canvas ref={canvasRef} className="absolute inset-0 w-full h-full"
      initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: show, times: [0, 0.9, 1] }} />
  )
}
