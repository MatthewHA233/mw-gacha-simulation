'use client'

import { motion } from 'framer-motion'
import { useState, useRef } from 'react'
import { SquareItem } from '../SquareItem'
import { CDN_BASE_URL } from '../../utils/constants'
import { IMG_WEBP } from '../../services/cdnService'

/**
 * 抽奖结果展示弹窗组件
 */
export function ResultModal({
  resultModal,
  itemScale,
  onContinueGeneration,
  onSkipToNext,
  onClose
}) {
  if (!resultModal.show) return null

  const [isLocked, setIsLocked] = useState(false) // 防误触锁
  const lastClickTime = useRef(0)
  const lockTimeout = useRef(null)

  const handleClick = () => {
    // 如果被锁定（快进后0.5秒内），忽略所有点击
    if (isLocked) {
      return
    }

    const now = Date.now()
    const timeSinceLastClick = now - lastClickTime.current

    // 双击检测：只在 multi100 和 multi500 时启用，且只有剩余史诗/传说物品 ≤ 1 时才允许
    if (resultModal.canSkip &&
        (resultModal.drawType === 'multi100' || resultModal.drawType === 'multi500') &&
        resultModal.isGenerating &&
        !resultModal.isPaused &&
        timeSinceLastClick < 300) { // 300ms 内的连续点击视为双击

      // 触发快进
      if (onSkipToNext) {
        onSkipToNext()

        // 启动防误触锁
        setIsLocked(true)
        if (lockTimeout.current) {
          clearTimeout(lockTimeout.current)
        }
        lockTimeout.current = setTimeout(() => {
          setIsLocked(false)
        }, 1500) // 1.5秒后解锁
      }

      lastClickTime.current = 0 // 重置点击时间
      return
    }

    lastClickTime.current = now

    // 如果正在暂停（遇到史诗/传说），点击继续生成
    if (resultModal.isPaused) {
      onContinueGeneration()
    }
    // 如果生成完毕，点击关闭弹窗
    else if (resultModal.isComplete) {
      onClose()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed left-0 right-0 bottom-0 top-0 md:top-[60px] z-40"
      style={{
        backgroundImage: `url(${CDN_BASE_URL}/assets/ui-common/result-bg.png${IMG_WEBP})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onClick={handleClick}
    >
      {/* 双击快进提示 - 只在可以快进时显示 */}
      {resultModal.canSkip && resultModal.isGenerating && !resultModal.isPaused && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-amber-500/50 shadow-lg">
            <p className="text-sm md:text-base font-medium whitespace-nowrap">
              双击空白区域快进至下一个稀有奖励
            </p>
          </div>
        </motion.div>
      )}
      {/* 物品展示区域 - 小屏手机 */}
      <div className="sm:hidden h-full flex items-center justify-center p-2 translate-y-[11px]">
        {resultModal.drawType === 'single' ? (
          <div onClick={e => e.stopPropagation()}>
            <SquareItem
              item={resultModal.displayedItems[0]}
              size={80}
              index={0}
              drawNumber={resultModal.displayedItems[0]?.drawNumber}
            />
          </div>
        ) : resultModal.drawType === 'multi10' ? (
          <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
            {[0, 1].map(rowIndex => (
              <div key={rowIndex} className="flex gap-1 justify-center">
                {resultModal.displayedItems.slice(rowIndex * 5, rowIndex * 5 + 5).map((item, colIndex) => (
                  <SquareItem
                    key={rowIndex * 5 + colIndex}
                    item={item}
                    size={52}
                    index={rowIndex * 5 + colIndex}
                    drawNumber={item.drawNumber}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
            {[0, 1].map(rowIndex => (
              <div key={rowIndex} className="flex gap-1 justify-center">
                {resultModal.displayedItems.slice(rowIndex * 10, rowIndex * 10 + 10).map((item, colIndex) => (
                  <SquareItem
                    key={rowIndex * 10 + colIndex}
                    item={item}
                    size={52}
                    index={rowIndex * 10 + colIndex}
                    drawNumber={item.drawNumber}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 物品展示区域 - 平板 */}
      <div className="hidden sm:block lg:hidden h-full">
        <div className="h-full flex items-center justify-center p-4 translate-y-[11px]">
          {resultModal.drawType === 'single' ? (
            <div onClick={e => e.stopPropagation()}>
              <SquareItem
                item={resultModal.displayedItems[0]}
                size={100}
                index={0}
                drawNumber={resultModal.displayedItems[0]?.drawNumber}
              />
            </div>
          ) : resultModal.drawType === 'multi10' ? (
            <div className="flex flex-col gap-3" onClick={e => e.stopPropagation()}>
              {[0, 1].map(rowIndex => (
                <div key={rowIndex} className="flex gap-3 justify-center">
                  {resultModal.displayedItems.slice(rowIndex * 5, rowIndex * 5 + 5).map((item, colIndex) => (
                    <SquareItem
                      key={rowIndex * 5 + colIndex}
                      item={item}
                      size={78}
                      index={rowIndex * 5 + colIndex}
                      drawNumber={item.drawNumber}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3" onClick={e => e.stopPropagation()}>
              {[0, 1].map(rowIndex => (
                <div key={rowIndex} className="flex gap-3 justify-center">
                  {resultModal.displayedItems.slice(rowIndex * 10, rowIndex * 10 + 10).map((item, colIndex) => (
                    <SquareItem
                      key={rowIndex * 10 + colIndex}
                      item={item}
                      size={78}
                      index={rowIndex * 10 + colIndex}
                      drawNumber={item.drawNumber}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 物品展示区域 - 桌面端 */}
      <div className="hidden lg:block h-full">
        <div className="h-full flex items-center justify-center p-8 translate-y-[28px]">
          <div style={{ transform: `scale(${itemScale})`, transformOrigin: 'center' }}>
            {resultModal.drawType === 'single' ? (
              <div onClick={e => e.stopPropagation()}>
                <SquareItem
                  item={resultModal.displayedItems[0]}
                  size={120}
                  index={0}
                  drawNumber={resultModal.displayedItems[0]?.drawNumber}
                />
              </div>
            ) : resultModal.drawType === 'multi10' ? (
              <div className="flex flex-col gap-6" onClick={e => e.stopPropagation()}>
                {[0, 1].map(rowIndex => (
                  <div key={rowIndex} className="flex gap-6 justify-center">
                    {resultModal.displayedItems.slice(rowIndex * 5, rowIndex * 5 + 5).map((item, colIndex) => (
                      <SquareItem
                        key={rowIndex * 5 + colIndex}
                        item={item}
                        size={120}
                        index={rowIndex * 5 + colIndex}
                        drawNumber={item.drawNumber}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-6" onClick={e => e.stopPropagation()}>
                {[0, 1].map(rowIndex => (
                  <div key={rowIndex} className="flex gap-6 justify-center">
                    {resultModal.displayedItems.slice(rowIndex * 10, rowIndex * 10 + 10).map((item, colIndex) => (
                      <SquareItem
                        key={rowIndex * 10 + colIndex}
                        item={item}
                        size={120}
                        index={rowIndex * 10 + colIndex}
                        drawNumber={item.drawNumber}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
