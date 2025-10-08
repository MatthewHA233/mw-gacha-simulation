import { motion } from 'framer-motion'
import { SquareItem } from '../SquareItem'
import { CDN_BASE_URL } from '../../utils/constants'

/**
 * 抽奖结果展示弹窗组件
 */
export function ResultModal({
  resultModal,
  itemScale,
  onContinueGeneration,
  onClose
}) {
  if (!resultModal.show) return null

  const handleClick = () => {
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
        backgroundImage: `url(${CDN_BASE_URL}/assets/ui-common/result-bg.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onClick={handleClick}
    >
      {/* 物品展示区域 */}
      <div className="h-full flex items-center justify-center p-8 translate-y-[11px] md:translate-y-[28px]">
        {/* 响应式缩放容器 */}
        <div style={{ transform: `scale(${itemScale})`, transformOrigin: 'center' }}>
          {resultModal.drawType === 'single' ? (
            // 单抽：居中显示单个物品
            <div onClick={e => e.stopPropagation()}>
              <SquareItem
                item={resultModal.displayedItems[0]}
                size={120}
                index={0}
                drawNumber={resultModal.displayedItems[0]?.drawNumber}
              />
            </div>
          ) : resultModal.drawType === 'multi10' ? (
            // 10连抽：5个一排，两排
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
            // 100连和500连：10个一排，最多显示两排（史诗/传说在前）
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
    </motion.div>
  )
}
