import { motion } from 'framer-motion'

/**
 * 确认弹窗组件（危险操作二次确认）
 */
export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = '确认', cancelText = '取消' }) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: 1,
          scale: 1,
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 25,
          }
        }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative bg-gradient-to-b from-zinc-900 to-black rounded-xl p-4 max-w-[280px] md:max-w-xs w-full shadow-2xl border border-red-500/30"
        onClick={e => e.stopPropagation()}
      >
        {/* 顶部装饰线条 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent rounded-full" />

        {/* 内容 */}
        <div className="flex flex-col items-center space-y-3">
          {/* 警告图标 */}
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/20 blur-lg rounded-full" />
            <div className="relative bg-red-950/80 p-2 rounded-full border border-red-500/50">
              <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          </div>

          {/* 标题 */}
          <h3 className="text-sm md:text-base font-bold text-white text-center">{title}</h3>

          {/* 消息 */}
          <p className="text-[11px] md:text-xs text-gray-400 text-center leading-relaxed">{message}</p>

          {/* 按钮组 */}
          <div className="flex gap-2 w-full pt-1">
            {/* 取消 */}
            <button
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg py-2 px-3 ring-1 ring-white/10 transition-all"
            >
              <span className="text-xs md:text-sm text-white">{cancelText}</span>
            </button>

            {/* 确认 */}
            <button
              onClick={onConfirm}
              className="flex-1 bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-lg py-2 px-3 ring-1 ring-red-500/50 transition-all"
            >
              <span className="text-xs md:text-sm font-bold text-white">{confirmText}</span>
            </button>
          </div>
        </div>

        {/* 底部装饰线条 */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent rounded-full" />
      </motion.div>
    </motion.div>
  )
}
