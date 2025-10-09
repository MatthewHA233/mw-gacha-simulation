import { motion } from 'framer-motion'
import { SquareItem } from '../SquareItem'
import { buildInfoBackgroundUrl } from '../../services/cdnService'

/**
 * 史诗/传说历史记录弹窗组件
 */
export function InfoModal({ isOpen, onClose, epicLegendaryHistory, itemScale = 1, activityId, totalDraws = 0 }) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full md:max-w-5xl max-h-[65vh] md:max-h-[85vh] overflow-y-auto rounded-lg"
        style={{
          backgroundImage: `url(${buildInfoBackgroundUrl(activityId)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center py-2 px-2 md:py-8 md:px-8">
          {/* 标题 */}
          <h2 className="text-base md:text-3xl font-bold text-white mb-2 md:mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            历史抽奖记录
          </h2>

          {/* 史诗和传说物品展示（按抽取顺序） - 小屏手机 */}
          <div className="sm:hidden mb-2 w-full max-w-full">
            {epicLegendaryHistory.length === 0 ? (
              <div className="text-white text-sm text-center py-4 bg-black/50 rounded-lg px-2">
                还未获得史诗或传说物品
              </div>
            ) : (
              <div className="flex flex-wrap gap-1 justify-center max-w-full">
                {epicLegendaryHistory.map((record, index) => (
                  <div key={index} className="relative mb-1">
                    <SquareItem
                      item={record.item}
                      size={60}
                      index={index}
                      drawNumber={record.drawNumber}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 史诗和传说物品展示（按抽取顺序） - 平板 */}
          <div className="hidden sm:block lg:hidden mb-2 w-full max-w-full">
            {epicLegendaryHistory.length === 0 ? (
              <div className="text-white text-sm text-center py-4 bg-black/50 rounded-lg px-2">
                还未获得史诗或传说物品
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 justify-center max-w-full">
                {epicLegendaryHistory.map((record, index) => (
                  <div key={index} className="relative mb-1">
                    <SquareItem
                      item={record.item}
                      size={90}
                      index={index}
                      drawNumber={record.drawNumber}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 史诗和传说物品展示（按抽取顺序） - 桌面端 */}
          <div
            className="hidden lg:block mb-6 w-full max-w-full"
            style={{ transform: `scale(${itemScale})`, transformOrigin: 'center' }}
          >
            {epicLegendaryHistory.length === 0 ? (
              <div className="text-white text-lg text-center py-6 bg-black/50 rounded-lg px-4">
                还未获得史诗或传说物品
              </div>
            ) : (
              <div className="flex flex-wrap gap-6 justify-center max-w-full">
                {epicLegendaryHistory.map((record, index) => (
                  <div key={index} className="relative mb-2">
                    <SquareItem
                      item={record.item}
                      size={120}
                      index={index}
                      drawNumber={record.drawNumber}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 总抽数和关闭按钮 */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* 总抽数显示 */}
            <div className="text-white text-xs md:text-base font-semibold bg-black/50 rounded-full px-2 py-1 md:px-4 md:py-2 border border-amber-500/30">
              总抽数: <span className="text-amber-400">{totalDraws}</span>
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="bg-slate-800 no-underline group cursor-pointer relative shadow-2xl shadow-zinc-900 rounded-full p-px text-xs md:text-sm font-semibold leading-6 text-white inline-block scale-75 md:scale-100"
            >
              <span className="absolute inset-0 overflow-hidden rounded-full">
                <span className="absolute inset-0 rounded-full bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
              </span>
              <div className="relative flex items-center justify-center z-10 rounded-full bg-zinc-950 py-0.5 px-3 md:py-1 md:px-5 ring-1 ring-white/10">
                <span>关闭</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
