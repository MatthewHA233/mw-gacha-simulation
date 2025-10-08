import { motion } from 'framer-motion'
import { buildCurrencyIconUrl } from '../../services/cdnService'

/**
 * 充值商店弹窗组件
 */
export function ShopModal({ isOpen, onClose, shopPackages, onBuyPackage, onUpdateQuantity, activityConfig }) {
  if (!isOpen) return null

  const currencyIconUrl = buildCurrencyIconUrl('currency_gachacoins', activityConfig)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
      onClick={onClose}
    >
      {/* 商品展示区域 */}
      <div className="flex gap-6 px-8 scale-[0.6] md:scale-100" onClick={e => e.stopPropagation()}>
        {shopPackages.map((pkg, index) => (
          <div
            key={pkg.id}
            className="relative w-60 bg-gradient-to-b from-slate-800/90 to-slate-900/90 rounded-lg overflow-hidden border border-slate-600/50 hover:border-cyan-400/60 transition-all cursor-pointer group shadow-lg"
            onClick={() => onBuyPackage(pkg)}
          >
            {/* 顶部标签 */}
            <div className="bg-gradient-to-r from-slate-700/80 to-slate-600/80 px-3 py-1 text-white text-sm font-bold border-b border-slate-500/30">
              {pkg.id === 1 ? '一组筹码' : pkg.id === 2 ? '一盒筹码' : pkg.id === 3 ? '一箱筹码' : '两箱筹码'}
            </div>

            {/* 商品图片 */}
            <div className="relative p-6 flex items-center justify-center h-48">
              {/* 135筹码档位：左侧±1控制按钮 */}
              {pkg.id === 3 && (
                <div
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 items-center"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => onUpdateQuantity(pkg.quantity + 1)}
                    className="w-8 h-8 bg-slate-700/80 hover:bg-slate-600 rounded text-white text-xs font-bold transition-colors border border-slate-500/50"
                  >
                    ▲
                  </button>
                  <div className="text-gray-300 text-xs font-bold">±1</div>
                  <button
                    onClick={() => onUpdateQuantity(pkg.quantity - 1)}
                    className="w-8 h-8 bg-slate-700/80 hover:bg-slate-600 rounded text-white text-xs font-bold transition-colors border border-slate-500/50"
                  >
                    ▼
                  </button>
                </div>
              )}

              <img
                src={pkg.image}
                alt={`${pkg.coins}筹码`}
                className="max-h-full object-contain group-hover:scale-110 transition-transform"
              />

              {/* 135筹码档位：右侧±5控制按钮 */}
              {pkg.id === 3 && (
                <div
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 items-center"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => onUpdateQuantity(pkg.quantity + 5)}
                    className="w-8 h-8 bg-slate-700/80 hover:bg-slate-600 rounded text-white text-xs font-bold transition-colors border border-slate-500/50"
                  >
                    ▲
                  </button>
                  <div className="text-gray-300 text-xs font-bold">±5</div>
                  <button
                    onClick={() => onUpdateQuantity(pkg.quantity - 5)}
                    className="w-8 h-8 bg-slate-700/80 hover:bg-slate-600 rounded text-white text-xs font-bold transition-colors border border-slate-500/50"
                  >
                    ▼
                  </button>
                </div>
              )}

              {/* 折扣角标 */}
              {pkg.discount && (
                <div className="absolute top-2 right-2 bg-gradient-to-br from-red-600 to-red-700 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                  {pkg.discount}
                </div>
              )}

              {/* 135筹码档位：显示当前数量 */}
              {pkg.id === 3 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/80 text-cyan-400 text-xs font-bold px-3 py-1 rounded-full border border-slate-500/50">
                  数量: {pkg.quantity}
                </div>
              )}
            </div>

            {/* 底部信息条 */}
            <div className="bg-gradient-to-b from-slate-800/80 to-slate-900/80 px-4 py-3 border-t border-slate-600/50">
              {/* 筹码数量 */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <img
                  src={currencyIconUrl}
                  alt="筹码"
                  className="w-5 h-5"
                />
                <span className="text-white font-bold text-lg">{pkg.coins}</span>
              </div>
              {/* 价格 */}
              <div className="flex items-center justify-center gap-1">
                <svg className="w-4 h-4" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                  <path d="M531.456 529.408c-18.432 0-34.816-16.384-34.816-33.792v-17.408-16.384V428.032h-95.232c-9.216 0-17.408-3.072-23.552-10.24-7.168-7.168-10.24-17.408-10.24-25.6 1.024-19.456 16.384-34.816 33.792-34.816h94.208v-1.024-29.696h-95.232c-18.432 0-33.792-16.384-33.792-33.792 0-9.216 3.072-18.432 10.24-25.6s14.336-10.24 23.552-10.24h61.44l-1.024-2.048c-12.288-20.48-24.576-41.984-35.84-62.464l-1.024-2.048c-13.312-22.528-27.648-45.056-40.96-67.584-3.072-6.144-13.312-21.504-1.024-35.84 7.168-9.216 18.432-13.312 30.72-13.312 4.096 0 9.216 1.024 12.288 2.048 14.336 6.144 23.552 19.456 28.672 28.672 17.408 30.72 33.792 60.416 51.2 90.112l27.648 49.152 20.48-35.84 17.408-29.696c12.288-22.528 25.6-45.056 38.912-67.584 4.096-9.216 12.288-18.432 20.48-24.576 6.144-4.096 13.312-8.192 20.48-8.192 14.336 0 29.696 9.216 34.816 22.528 3.072 8.192 1.024 18.432-2.048 23.552-17.408 29.696-33.792 59.392-51.2 87.04l-12.288 21.504-17.408 30.72h61.44c18.432 0 32.768 16.384 32.768 34.816 0 20.48-14.336 34.816-32.768 34.816h-94.208v-1.024 28.672-2.048h94.208c17.408 0 30.72 11.264 33.792 27.648 4.096 16.384-6.144 34.816-20.48 41.984-3.072 2.048-8.192 2.048-11.264 2.048h-96.256v20.48c-1.024 17.408 0 30.72 0 44.032 1.024 7.168-2.048 16.384-9.216 21.504-8.192 7.168-19.456 13.312-28.672 13.312z" fill="#d81e06"/>
                  <path d="M789.504 776.192m-32.768 0a32.768 32.768 0 1 0 65.536 0 32.768 32.768 0 1 0-65.536 0Z" fill="#d81e06"/>
                  <path d="M928.768 642.048c-16.384-33.792-51.2-56.32-89.088-56.32-12.288 0-23.552 2.048-33.792 6.144L675.84 640l-1.024-1.024c-11.264-31.744-39.936-55.296-74.752-60.416l-39.936-6.144c-33.792-5.12-66.56-13.312-95.232-25.6-31.744-12.288-63.488-17.408-97.28-17.408-46.08 0-94.208 12.288-135.168 34.816L184.32 592.896v-1.024c-5.12 2.048-103.424 51.2-95.232 160.768 5.12 70.656 29.696 118.784 67.584 135.168 8.192 4.096 18.432 6.144 30.72 6.144 16.384 0 35.84-5.12 58.368-21.504 12.288-3.072 23.552-5.12 34.816-5.12 22.528 0 45.056 5.12 64.512 14.336l8.192 4.096c45.056 21.504 96.256 32.768 147.456 32.768 55.296 0 107.52-13.312 153.6-36.864l78.848-40.96c11.264-5.12 19.456-16.384 19.456-30.72 0-18.432-15.36-33.792-33.792-33.792-6.144 0-12.288 2.048-17.408 5.12l-79.872 39.936C582.656 840.704 542.72 849.92 500.736 849.92c-40.96 0-79.872-9.216-116.736-26.624l-7.168-4.096c-29.696-14.336-62.464-21.504-95.232-21.504-24.576 0-51.2 5.12-77.824 14.336l-21.504 8.192c-8.192-8.192-19.456-31.744-22.528-75.776-3.072-43.008 22.528-70.656 40.96-83.968h1.024l68.608-37.888c29.696-18.432 64.512-27.648 101.376-27.648 25.6 0 50.176 4.096 71.68 13.312 32.768 12.288 69.632 22.528 109.568 28.672l39.936 6.144c13.312 2.048 22.528 13.312 22.528 25.6 0 15.36-11.264 26.624-26.624 26.624l-168.96 6.144c-10.24 0-18.432 4.096-24.576 10.24-7.168 8.192-10.24 16.384-9.216 23.552 0 9.216 3.072 17.408 10.24 24.576 8.192 7.168 16.384 10.24 23.552 10.24l166.912-2.048c34.816 0 67.584-20.48 83.968-51.2v-1.024l159.744-59.392 9.216-1.024c10.24 0 19.456 6.144 25.6 15.36l3.072 12.288c0 10.24-6.144 19.456-15.36 23.552l-4.096 2.048c-10.24 6.144-16.384 16.384-16.384 28.672 0 18.432 14.336 32.768 32.768 32.768 6.144 0 12.288-2.048 17.408-5.12l1.024-1.024c31.744-15.36 53.248-50.176 53.248-84.992 0-11.264-3.072-24.576-8.192-36.864z" fill="#d81e06"/>
                </svg>
                <span className="text-red-400 font-bold text-sm">{pkg.price}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
