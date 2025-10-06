import { motion } from 'framer-motion'

/**
 * 重置数据弹窗组件（紧凑版）
 */
export function ResetModal({ isOpen, onClose, onResetCurrent, onResetAll, activityName }) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          transition: {
            type: "spring",
            stiffness: 260,
            damping: 20,
          }
        }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        className="relative bg-black rounded-xl p-4 max-w-xs md:max-w-sm w-full shadow-2xl border border-red-900/30"
        onClick={e => e.stopPropagation()}
      >
        {/* 顶部装饰线条 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent rounded-full" />

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* 内容区 */}
        <div className="flex flex-col space-y-3 mt-1">
          {/* 标题行（图标+文字） */}
          <div className="flex items-center gap-2 justify-center">
            <div className="bg-red-950/50 p-1.5 rounded-lg border border-red-900/50">
              <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h3 className="text-base md:text-lg font-bold text-white">重置数据</h3>
              <p className="text-[10px] md:text-xs text-red-400">此操作不可撤销</p>
            </div>
          </div>

          {/* 说明文字 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-2">
            <p className="text-gray-400 text-[10px] md:text-xs leading-relaxed">
              将清除：筹码/人民币余额、抽奖记录、已获得物品
            </p>
          </div>

          {/* 按钮组 */}
          <div className="grid grid-cols-2 gap-2">
            {/* 重置当前 */}
            <button
              onClick={onResetCurrent}
              className="bg-gradient-to-b from-red-950 to-zinc-950 hover:from-red-900 hover:to-zinc-900 rounded-lg py-2 px-3 ring-1 ring-red-900/50 border border-red-900/30 transition-all"
            >
              <span className="text-xs md:text-sm font-bold text-red-400">重置当前</span>
              <p className="text-[9px] md:text-[10px] text-gray-500 mt-0.5 truncate">{activityName}</p>
            </button>

            {/* 取消 */}
            <button
              onClick={onClose}
              className="bg-zinc-950 hover:bg-zinc-900 rounded-lg py-2 px-3 ring-1 ring-white/10 transition-all"
            >
              <span className="text-xs md:text-sm text-white">取消</span>
            </button>
          </div>

          {/* 重置全部（单独一行） */}
          <button
            onClick={onResetAll}
            className="bg-gradient-to-b from-red-950 to-red-900/50 hover:from-red-900 hover:to-red-800/50 rounded-lg py-2 px-3 ring-1 ring-red-900/50 border border-red-900/30 transition-all flex items-center justify-center gap-1.5"
          >
            <svg className="w-3 h-3 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            <div>
              <span className="text-xs md:text-sm font-bold text-red-400">重置全部活动</span>
              <p className="text-[9px] md:text-[10px] text-red-600">清除所有活动数据</p>
            </div>
          </button>
        </div>

        {/* 底部装饰线条 */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent rounded-full" />
      </motion.div>
    </motion.div>
  )
}
