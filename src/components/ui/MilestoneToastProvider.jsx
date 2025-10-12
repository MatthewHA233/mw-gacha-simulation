import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { MilestoneToast } from './MilestoneToast'

/**
 * Toast上下文
 */
const MilestoneToastContext = createContext(null)

/**
 * Toast管理器Provider
 * 支持多个Toast堆叠显示（类似Steam成就）
 */
export function MilestoneToastProvider({ children, maxToasts = 3, position = 'top-right' }) {
  const [toasts, setToasts] = useState([])
  const [shouldRotate, setShouldRotate] = useState(false)

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

  /**
   * 显示新Toast
   * @param {object} milestone - 里程碑配置对象
   * @param {function} onButtonClick - 按钮点击回调
   * @param {number} duration - 显示时长（毫秒）
   */
  const showToast = useCallback((milestone, { onButtonClick, duration = 5000 } = {}) => {
    const id = Date.now() + Math.random()

    setToasts((prev) => {
      const newToasts = [
        ...prev,
        {
          id,
          milestone,
          onButtonClick,
          duration
        }
      ]

      // 限制最大Toast数量，移除最早的
      if (newToasts.length > maxToasts) {
        return newToasts.slice(newToasts.length - maxToasts)
      }

      return newToasts
    })

    return id
  }, [maxToasts])

  /**
   * 关闭指定Toast
   */
  const closeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  /**
   * 关闭所有Toast
   */
  const closeAll = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <MilestoneToastContext.Provider value={{ showToast, closeToast, closeAll }}>
      {children}

      {/* 渲染所有Toast（堆叠显示） - 支持手机横屏旋转 - z-index 高于 VersionModal */}
      <div
        className="fixed pointer-events-none z-[10000]"
        style={shouldRotate ? {
          width: '100vh',
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
          absolute
          ${position.includes('top') ? 'top-4' : 'bottom-4'}
          ${position.includes('right') ? 'right-4' : 'left-4'}
          flex flex-col gap-3
          pointer-events-none
        `}>
          {toasts.map((toast, index) => (
            <div
              key={toast.id}
              className="pointer-events-auto"
              style={{
                // 堆叠时稍微偏移，营造层叠效果
                transform: `translateY(${index * -2}px)`,
                zIndex: 10000 + index
              }}
            >
              <MilestoneToast
                id={toast.id}
                milestone={toast.milestone}
                onClose={closeToast}
                onButtonClick={toast.onButtonClick}
                duration={toast.duration}
                position={position}
              />
            </div>
          ))}
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
