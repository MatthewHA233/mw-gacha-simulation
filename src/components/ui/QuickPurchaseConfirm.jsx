'use client'

import { motion } from 'framer-motion'
import { useSound } from '../../hooks/useSound'

/**
 * 快捷购买确认弹窗
 * 显示在商店弹窗上层，让 VIP 用户一键购买最优方案
 */
export function QuickPurchaseConfirm({ isOpen, onConfirm, onCancel, purchase, currencyName }) {
  const { playButtonClick, playSound } = useSound()

  if (!isOpen || !purchase) return null

  // 构建购买明细
  const details = purchase.purchases.map(p => {
    const perUnit = Math.round(p.coins / p.quantity)
    return { perUnit, quantity: p.quantity, price: p.price }
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          transition: {
            type: "spring",
            stiffness: 350,
            damping: 25,
          }
        }}
        className="relative bg-gradient-to-b from-zinc-900 to-black rounded-xl p-4 max-w-[300px] md:max-w-sm w-full shadow-2xl border border-emerald-500/30"
        onClick={e => e.stopPropagation()}
      >
        {/* 顶部装饰线条 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent rounded-full" />

        <div className="flex flex-col items-center space-y-3">
          {/* 购物车图标 */}
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 blur-lg rounded-full" />
            <div className="relative bg-emerald-950/80 p-2 rounded-full border border-emerald-500/50">
              <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
          </div>

          {/* 标题 */}
          <h3 className="text-sm md:text-base font-bold text-white text-center">快捷购买</h3>

          {/* 购买明细 */}
          <div className="w-full bg-zinc-800/60 rounded-lg p-3 space-y-1.5">
            {details.map((d, i) => (
              <div key={i} className="flex justify-between items-center text-[11px] md:text-xs">
                <span className="text-gray-300">
                  {d.perUnit}{currencyName}套餐
                  <span className="text-emerald-400 ml-1">×{d.quantity}</span>
                </span>
                <span className="text-amber-400">¥{d.price}</span>
              </div>
            ))}
            {/* 分割线 */}
            <div className="border-t border-zinc-700 pt-1.5 mt-1.5 flex justify-between items-center">
              <span className="text-xs text-white font-medium">
                合计 <span className="text-emerald-400">{purchase.totalCoins}</span> {currencyName}
              </span>
              <span className="text-xs text-amber-400 font-bold">¥{purchase.totalPrice}</span>
            </div>
          </div>

          {/* 按钮组 */}
          <div className="flex gap-2 w-full pt-1">
            <button
              onClick={() => { playButtonClick(); onCancel(); }}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg py-2 px-3 ring-1 ring-white/10 transition-all"
            >
              <span className="text-xs md:text-sm text-white">取消</span>
            </button>
            <button
              onClick={() => { playSound('Buy_01_UI.Buy_01_UI.wav'); onConfirm(); }}
              className="flex-1 bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 rounded-lg py-2 px-3 ring-1 ring-emerald-500/50 transition-all"
            >
              <span className="text-xs md:text-sm font-bold text-white">确认购买</span>
            </button>
          </div>
        </div>

        {/* 底部装饰线条 */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent rounded-full" />
      </motion.div>
    </motion.div>
  )
}
