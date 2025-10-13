import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
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

  /**
   * 显示新Toast
   * @param {object} milestone - 里程碑配置对象
   * @param {function} onButtonClick - 按钮点击回调
   * @param {number} duration - 显示时长（毫秒）
   * @returns {Promise} 在 Toast 关闭时 resolve
   */
  const showToast = useCallback((milestone, { onButtonClick, duration = 5000 } = {}) => {
    const id = Date.now() + Math.random()

    // 创建 Promise，在 Toast 关闭时 resolve
    const promise = new Promise((resolve) => {
      resolveMapRef.current.set(id, resolve)
    })

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

    return promise
  }, [maxToasts])

  /**
   * 关闭指定Toast
   */
  const closeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))

    // 调用对应的 resolve 函数
    const resolve = resolveMapRef.current.get(id)
    if (resolve) {
      resolve()
      resolveMapRef.current.delete(id)
    }
  }, [])

  /**
   * 关闭所有Toast
   */
  const closeAll = useCallback(() => {
    // 调用所有待解决的 resolve 函数
    resolveMapRef.current.forEach((resolve) => resolve())
    resolveMapRef.current.clear()

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
          pointer-events-none
        `}>
          {toasts.map((toast, index) => (
            <div
              key={toast.id}
              className="absolute top-0 right-0 pointer-events-auto"
              style={{
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
