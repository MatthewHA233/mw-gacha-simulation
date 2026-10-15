'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { SquareItem } from '../SquareItem'
import { CDN_BASE_URL } from '../../utils/constants'
import { IMG_WEBP } from '../../services/cdnService'
import { SKIP_UNLOCK_AFTER_MS } from '../../utils/constants'

/**
 * 双击快进提示：只在百连及以上、还有稀有奖励可快进时出现。
 * 挂在多连抽网格下方（绝对定位，出现 / 消失时网格不跳），三套布局和桌面缩放都跟着网格走；
 * 样式照结算背景里「点击继续」那种游戏内文字：不加框，白色细字 + 横幅同色的青色 » 轻轻呼吸。
 */
function SkipHint({ show, className = '' }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="skip-hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.3 } }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap ${className}`}
        >
          <svg className="skip-hint-chevron w-[1.1em] h-[1.1em] text-[#3ec8f5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 6l6 6-6 6M13 6l6 6-6 6" />
          </svg>
          <span className="tracking-wide text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">双击空白处 快进至下一个稀有奖励</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

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
  const lastTapRef = useRef(0)          // 上一次点按的时间，用来认双击
  const continueBlockedUntil = useRef(0) // 刚快进完的一小会儿不响应「继续」，防三连击直接越过刚停住的稀有物品
  const [timeUnlocked, setTimeUnlocked] = useState(false)

  // 结果弹窗开满 6 秒后也能快进（每次新的一轮抽奖重新计时）
  const isBigBatch = resultModal.drawType === 'multi100' || resultModal.drawType === 'multi500' || resultModal.drawType === 'multi5000'
  useEffect(() => {
    setTimeUnlocked(false)
    if (!resultModal.show || !isBigBatch) return undefined
    const timer = setTimeout(() => setTimeUnlocked(true), SKIP_UNLOCK_AFTER_MS)
    return () => clearTimeout(timer)
  }, [resultModal.show, resultModal.items, isBigBatch])

  if (!resultModal.show) return null

  // 能否快进：百连及以上、正在逐个出物品（没停在稀有物品上），且（剩余稀有 ≤ 3 —— 抽奖时算好的 canSkip —— 或已开满 6 秒）
  const canSkipNow = Boolean(isBigBatch && resultModal.isGenerating && !resultModal.isPaused && (resultModal.canSkip || timeUnlocked))

  // 双击识别放在捕获阶段：物品格子会拦点击（防单击误触继续），但双击落在格子上也要算快进
  const handleTapCapture = (event) => {
    const now = Date.now()
    if (now - lastTapRef.current < 320 && canSkipNow) {
      lastTapRef.current = 0
      continueBlockedUntil.current = now + 400
      event.stopPropagation()
      onSkipToNext?.()
      return
    }
    lastTapRef.current = now
  }

  // 单击（空白处）：停在稀有物品上就继续，出完了就关闭
  const handleClick = () => {
    if (Date.now() < continueBlockedUntil.current) return
    if (resultModal.isPaused) onContinueGeneration()
    else if (resultModal.isComplete) onClose()
  }

  const showSkipHint = canSkipNow

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed left-0 right-0 bottom-0 top-0 md:top-[60px] z-40 select-none"
      style={{
        backgroundImage: `url(${CDN_BASE_URL}/assets/ui-common/result-bg.png${IMG_WEBP})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onClickCapture={handleTapCapture}
      onClick={handleClick}
      // 双击快进时浏览器默认会选中光标下的文字（PC 上一按就蓝一片）：连击的那一下不让开始选区
      onMouseDown={(e) => { if (e.detail > 1) e.preventDefault() }}
    >
      {/* 物品展示区域 - 小屏手机 */}
      <div className="sm:hidden h-full flex items-center justify-center p-2 translate-y-[6px]">
        {resultModal.drawType === 'single' ? (
          <div onClick={e => e.stopPropagation()}>
            <SquareItem
              item={resultModal.displayedItems[0]}
              size={78}
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
                    size={50}
                    index={rowIndex * 5 + colIndex}
                    drawNumber={item.drawNumber}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1 relative" onClick={e => e.stopPropagation()}>
            {[0, 1].map(rowIndex => (
              <div key={rowIndex} className="flex gap-1 justify-center">
                {resultModal.displayedItems.slice(rowIndex * 10, rowIndex * 10 + 10).map((item, colIndex) => (
                  <SquareItem
                    key={rowIndex * 10 + colIndex}
                    item={item}
                    size={50}
                    index={rowIndex * 10 + colIndex}
                    drawNumber={item.drawNumber}
                  />
                ))}
              </div>
            ))}
            <SkipHint show={showSkipHint} className="mt-2 text-[10px]" />
          </div>
        )}
      </div>

      {/* 物品展示区域 - 平板 */}
      <div className="hidden sm:block lg:hidden h-full">
        <div className="h-full flex items-center justify-center p-4 translate-y-[6px]">
          {resultModal.drawType === 'single' ? (
            <div onClick={e => e.stopPropagation()}>
              <SquareItem
                item={resultModal.displayedItems[0]}
                size={96}
                index={0}
                drawNumber={resultModal.displayedItems[0]?.drawNumber}
              />
            </div>
          ) : resultModal.drawType === 'multi10' ? (
            <div className="flex flex-col gap-2.5" onClick={e => e.stopPropagation()}>
              {[0, 1].map(rowIndex => (
                <div key={rowIndex} className="flex gap-2.5 justify-center">
                  {resultModal.displayedItems.slice(rowIndex * 5, rowIndex * 5 + 5).map((item, colIndex) => (
                    <SquareItem
                      key={rowIndex * 5 + colIndex}
                      item={item}
                      size={72}
                      index={rowIndex * 5 + colIndex}
                      drawNumber={item.drawNumber}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 relative" onClick={e => e.stopPropagation()}>
              {[0, 1].map(rowIndex => (
                <div key={rowIndex} className="flex gap-2.5 justify-center">
                  {resultModal.displayedItems.slice(rowIndex * 10, rowIndex * 10 + 10).map((item, colIndex) => (
                    <SquareItem
                      key={rowIndex * 10 + colIndex}
                      item={item}
                      size={72}
                      index={rowIndex * 10 + colIndex}
                      drawNumber={item.drawNumber}
                    />
                  ))}
                </div>
              ))}
              <SkipHint show={showSkipHint} className="mt-3 text-xs" />
            </div>
          )}
        </div>
      </div>

      {/* 物品展示区域 - 桌面端 */}
      <div className="hidden lg:block h-full">
        <div className="h-full flex items-center justify-center p-8 translate-y-[14px]">
          <div style={{ transform: `scale(${itemScale})`, transformOrigin: 'center' }}>
            {resultModal.drawType === 'single' ? (
              <div onClick={e => e.stopPropagation()}>
                <SquareItem
                  item={resultModal.displayedItems[0]}
                  size={106}
                  index={0}
                  drawNumber={resultModal.displayedItems[0]?.drawNumber}
                />
              </div>
            ) : resultModal.drawType === 'multi10' ? (
              <div className="flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                {[0, 1].map(rowIndex => (
                  <div key={rowIndex} className="flex gap-4 justify-center">
                    {resultModal.displayedItems.slice(rowIndex * 5, rowIndex * 5 + 5).map((item, colIndex) => (
                      <SquareItem
                        key={rowIndex * 5 + colIndex}
                        item={item}
                        size={106}
                        index={rowIndex * 5 + colIndex}
                        drawNumber={item.drawNumber}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4 relative" onClick={e => e.stopPropagation()}>
                {[0, 1].map(rowIndex => (
                  <div key={rowIndex} className="flex gap-4 justify-center">
                    {resultModal.displayedItems.slice(rowIndex * 10, rowIndex * 10 + 10).map((item, colIndex) => (
                      <SquareItem
                        key={rowIndex * 10 + colIndex}
                        item={item}
                        size={106}
                        index={rowIndex * 10 + colIndex}
                        drawNumber={item.drawNumber}
                      />
                    ))}
                  </div>
                ))}
                <SkipHint show={showSkipHint} className="mt-4 text-base" />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
