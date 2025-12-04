'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { LEVEL_STYLES } from '@/data/milestoneConfig'

/**
 * Steam成就样式的里程碑Toast组件
 */
export function MilestoneToast({
  id,
  milestone,
  onClose,
  onButtonClick,
  duration = 5000,
  position = 'top-right'
}) {
  const [isVisible, setIsVisible] = useState(true)
  const [progress, setProgress] = useState(100)

  // 获取样式配置
  const finalStyle = LEVEL_STYLES[milestone.level] || LEVEL_STYLES.dense

  // 自动消失倒计时
  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev - (100 / (duration / 100))
        if (next <= 0) {
          setIsVisible(false)
          setTimeout(() => onClose(id), 300) // 等待退出动画
          return 0
        }
        return next
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isVisible, duration, id, onClose])

  // 关闭处理
  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => onClose(id), 300)
  }

  // 按钮点击处理
  const handleButtonClick = (buttonText) => {
    onButtonClick?.(milestone, buttonText)
    handleClose()
  }

  // 动画变体
  const variants = {
    initial: {
      x: position.includes('right') ? 400 : -400,
      opacity: 0,
      scale: 0.9
    },
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    },
    exit: {
      x: position.includes('right') ? 400 : -400,
      opacity: 0,
      scale: 0.9,
      transition: {
        duration: 0.3
      }
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          className="w-[95vw] max-w-[520px]"
        >
          {/* Toast主体 - 手机端整体缩小为65% */}
          <div
            className={`
              relative bg-gradient-to-br ${finalStyle.bgGradient}
              backdrop-blur-xl rounded-lg border-2 ${finalStyle.borderColor}
              shadow-2xl ${finalStyle.glowColor}
              overflow-hidden
              scale-[0.65] md:scale-100
            `}
            style={{
              transformOrigin: position.includes('right') ? 'top right' : 'top left'
            }}
          >
            {/* 发光效果 */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            {/* 内容区 */}
            <div className="relative p-3 md:p-4 flex items-start gap-2.5 md:gap-3">
              {/* 图标 */}
              <div className="flex-shrink-0">
                <div className={`relative w-10 md:w-12 h-10 md:h-12 rounded-lg ${finalStyle.iconBg} flex items-center justify-center`}>
                  {/* 图标发光 */}
                  <div className={`absolute inset-0 blur-md ${finalStyle.iconBg} opacity-50`} />

                  {/* 里程碑图标 */}
                  <svg
                    className={`relative w-6 md:w-7 h-6 md:h-7 ${finalStyle.iconColor}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>

                  {/* 金额标签 */}
                  <div className="absolute -bottom-0.5 md:-bottom-1 -right-0.5 md:-right-1 bg-black/80 rounded px-1 md:px-1.5 py-0.5 border border-white/20">
                    <span className="text-[9px] md:text-[10px] font-bold text-white leading-none">
                      ¥{milestone.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 文本内容 */}
              <div className="flex-1 min-w-0">
                {/* 标题 */}
                <h3 className="text-sm md:text-base font-bold text-white mb-1 line-clamp-2">
                  {milestone.title}
                </h3>

                {/* 内容 */}
                <p className="text-[11px] md:text-xs text-gray-300 leading-relaxed line-clamp-4 md:line-clamp-5">
                  {milestone.content}
                </p>

                {/* 按钮选项 */}
                {milestone.buttons && milestone.buttons.length > 0 && (
                  <div className="flex gap-1.5 md:gap-2 mt-2 md:mt-3">
                    {milestone.buttons.map((buttonText, index) => (
                      <button
                        key={index}
                        onClick={() => handleButtonClick(buttonText)}
                        className={`
                          flex-1 py-1.5 px-2 md:px-3 rounded-md text-[10px] md:text-xs font-medium
                          transition-all hover:scale-105 whitespace-nowrap
                          ${index === 0
                            ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                            : `bg-gradient-to-r ${finalStyle.bgGradient} hover:brightness-110 text-white border ${finalStyle.borderColor}`
                          }
                        `}
                      >
                        {buttonText}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 关闭按钮 */}
              <button
                onClick={handleClose}
                className="flex-shrink-0 w-5 md:w-6 h-5 md:h-6 rounded-full bg-black/40 hover:bg-black/60
                           flex items-center justify-center transition-colors group"
              >
                <svg
                  className="w-3 md:w-3.5 h-3 md:h-3.5 text-gray-400 group-hover:text-white transition-colors"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 进度条 */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
              <motion.div
                className={`h-full bg-gradient-to-r ${finalStyle.bgGradient} opacity-70`}
                initial={{ width: '100%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1, ease: 'linear' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
