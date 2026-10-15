'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * 按可用空间等比缩放：children 按原始（电脑大屏）尺寸排版，放不下时整体缩小、居中，不放大。
 *
 * 代替原来按断点手写的 scale-[0.65] translate-x-12 translate-y-20 …：那些值是按某个屏宽调出来的，
 * 手机竖屏旋转（Tailwind 只认竖屏窄边）、侧边栏展开（可用宽度变了）时就错位、被裁。
 * 这里量外框和内容的实际尺寸，窗口变化、侧边栏开合、内容变化都会重算。
 */
export function FitScale({ children, className = '', maxScale = 1 }) {
  const outerRef = useRef(null)
  const innerRef = useRef(null)
  const [scale, setScale] = useState(1)

  useIsoLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner || typeof ResizeObserver === 'undefined') return
    const update = () => {
      // offsetWidth / offsetHeight 是排版尺寸，不受自身 transform 影响
      const w = inner.offsetWidth
      const h = inner.offsetHeight
      if (!w || !h) return
      setScale(Math.min(maxScale, outer.clientWidth / w, outer.clientHeight / h))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(outer)
    observer.observe(inner)
    return () => observer.disconnect()
  }, [maxScale])

  return (
    <div ref={outerRef} className={`relative overflow-hidden ${className}`}>
      <div
        ref={innerRef}
        className="absolute left-1/2 top-1/2 w-max"
        style={{ transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center center' }}
      >
        {children}
      </div>
    </div>
  )
}
