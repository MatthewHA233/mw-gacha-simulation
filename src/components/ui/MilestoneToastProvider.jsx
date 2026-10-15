'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { MilestoneToast } from './MilestoneToast'

/**
 * Toast上下文
 */
const MilestoneToastContext = createContext(null)

/**
 * Toast管理器Provider
 * Steam 成就那样在右下角往上叠：新的从底部滑上来，旧的被推上去；关掉一条，上面的平滑落下补位
 */
export function MilestoneToastProvider({ children, maxToasts = 3, position = 'bottom-right' }) {
  const [toasts, setToasts] = useState([])
  const [shouldRotate, setShouldRotate] = useState(false)
  const resolveMapRef = useRef(new Map())  // 存储 toast id 到 resolve 函数的映射

  // 检测是否需要横屏旋转（与 GachaPage 逻辑一致）
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      // 当宽度小于高度时（接近1:1或更窄），触发横屏旋转
      const shouldRotateNow = width < height && width < 900
      setShouldRotate(shouldRotateNow)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 正在显示的成就（同步可读，供去重和超上限收起用）：[{ id, amount, promise }]
  const activeRef = useRef([])

  // 结束一条：移出 activeRef 并通知等它关闭的一方（带选项的成就会被队列 await）
  const finish = useCallback((id) => {
    activeRef.current = activeRef.current.filter((entry) => entry.id !== id)
    const resolve = resolveMapRef.current.get(id)
    if (resolve) {
      resolve()
      resolveMapRef.current.delete(id)
    }
  }, [])

  /**
   * 显示一条成就，返回在它关闭时 resolve 的 Promise
   * - 同一金额的成就正在显示：不重复弹，直接返回那一条的 Promise（防御，正常不会走到）
   * - 超过 maxToasts：最早那条收起并 resolve，免得等它关闭的队列卡死
   */
  const showToast = useCallback((milestone, { onButtonClick, duration = 5000 } = {}) => {
    const existing = activeRef.current.find((entry) => entry.amount === milestone.amount)
    if (existing) return existing.promise

    const id = Date.now() + Math.random()
    const promise = new Promise((resolve) => {
      resolveMapRef.current.set(id, resolve)
    })
    activeRef.current = [...activeRef.current, { id, amount: milestone.amount, promise }]
    while (activeRef.current.length > maxToasts) finish(activeRef.current[0].id)

    const keep = new Set(activeRef.current.map((entry) => entry.id))
    const toast = { id, milestone, onButtonClick, duration }
    setToasts((prev) => [...prev, toast].filter((item) => keep.has(item.id)))
    return promise
  }, [maxToasts, finish])

  const closeToast = useCallback((id) => {
    finish(id)
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [finish])

  const closeAll = useCallback(() => {
    resolveMapRef.current.forEach((resolve) => resolve())
    resolveMapRef.current.clear()
    activeRef.current = []
    setToasts([])
  }, [])

  return (
    <MilestoneToastContext.Provider value={{ showToast, closeToast, closeAll }}>
      {children}

      {/* 渲染所有Toast（堆叠显示） - 支持手机横屏旋转 - z-index 高于 VersionModal */}
      <div
        className="fixed pointer-events-none z-[10000]"
        style={shouldRotate ? {
          width: 'var(--app-height, 100vh)',
          height: '100vw',
          transform: 'rotate(90deg) translateY(-100%)',
          transformOrigin: 'top left',
          top: 0,
          left: 0
        } : {
          inset: 0
        }}
      >
        <div className={`
          absolute flex flex-col gap-2.5
          ${position.includes('top') ? 'top-3 md:top-4' : 'bottom-3 md:bottom-4'}
          ${position.includes('right') ? 'right-3 md:right-4 items-end' : 'left-3 md:left-4 items-start'}
          pointer-events-none
        `}>
          <AnimatePresence initial={false} mode="popLayout">
            {toasts.map((toast) => (
              <MilestoneToast
                key={toast.id}
                id={toast.id}
                milestone={toast.milestone}
                onClose={closeToast}
                onButtonClick={toast.onButtonClick}
                duration={toast.duration}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </MilestoneToastContext.Provider>
  )
}

/**
 * 使用Toast的Hook
 */
export function useMilestoneToast() {
  const context = useContext(MilestoneToastContext)

  if (!context) {
    throw new Error('useMilestoneToast must be used within MilestoneToastProvider')
  }

  return context
}
