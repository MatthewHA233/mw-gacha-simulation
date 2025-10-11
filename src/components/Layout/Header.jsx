import { motion } from 'framer-motion'
import { CDN_BASE_URL } from '../../utils/constants'
import { buildCurrencyIconUrl } from '../../services/cdnService'
import { useEffect } from 'react'
import { useSound } from '../../hooks/useSound'
import { useNavigate } from 'react-router-dom'

/**
 * 抽卡页面顶部导航栏组件（公共组件）
 */
export function Header({
  activityId,
  activityConfig,
  sidebarOpen,
  onToggleSidebar,
  onOpenInfo,
  onOpenSponsor,
  onOpenShop,
  onResetData,
  onAddCommonKeys,
  onAddBatteries,
  gameState,
  activityName = '暗影交易',
  activityNameEn = 'Deal with the Shadow',
  isModalOpen = false
}) {
  const { playButtonClick } = useSound()
  const navigate = useNavigate()

  // 当弹窗打开时，自动收缩侧边栏
  useEffect(() => {
    if (isModalOpen && sidebarOpen) {
      onToggleSidebar()
    }
  }, [isModalOpen])
  // 动态生成货币图标 URL（优先使用activityConfig，fallback到activityId）
  const currencyIconUrl = buildCurrencyIconUrl('currency_gachacoins', activityConfig || activityId)

  // 判断是否为旗舰宝箱类
  const isFlagshipGacha = activityConfig?.gacha_type === '旗舰宝箱类'

  // 判断是否为机密货物类
  const isCargoGacha = activityConfig?.gacha_type === '机密货物类'

  // 获取所有物品列表（包括旗舰和普通宝箱）
  const getAllItems = () => {
    const items = []
    if (gameState.items) items.push(...gameState.items)
    if (gameState.items_else) items.push(...gameState.items_else)
    return items
  }

  // 计算艺术硬币总数
  const getArtstormTotal = () => {
    let total = 0
    getAllItems().forEach(item => {
      if (item.name.includes('艺术硬币')) {
        const match = item.name.match(/^(\d+)\s/)
        const quantity = match ? parseInt(match[1]) : 0
        total += item.obtained * quantity
      }
    })
    return total
  }

  // 计算黄金总数
  const getGoldTotal = () => {
    let total = 0
    getAllItems().forEach(item => {
      if (item.name.includes('黄金')) {
        const match = item.name.match(/^(\d+)\s/)
        const quantity = match ? parseInt(match[1]) : 0
        total += item.obtained * quantity
      }
    })
    return total
  }

  // 计算美金总数
  const getSoftTotal = () => {
    let total = 0
    getAllItems().forEach(item => {
      if (item.name.includes('美金')) {
        const match = item.name.match(/^([\d\s]+)\s*美金/)
        if (match) {
          const quantity = parseInt(match[1].replace(/\s/g, ''))
          total += item.obtained * quantity
        }
      }
    })
    return total
  }

  // 计算升级芯片总数
  const getUpgradesTotal = () => {
    let total = 0
    getAllItems().forEach(item => {
      if (item.name.includes('升级芯片')) {
        const match = item.name.match(/^(\d+)\s/)
        const quantity = match ? parseInt(match[1]) : 0
        total += item.obtained * quantity
      }
    })
    return total
  }

  // 计算钥匙总数（普通宝箱钥匙） - 从物品奖励中累计
  const getCommonKeyTotal = () => {
    let total = 0
    getAllItems().forEach(item => {
      if (item.name.includes('钥匙') && !item.name.includes('旗舰')) {
        const match = item.name.match(/^(\d+)\s/)
        const quantity = match ? parseInt(match[1]) : 0
        total += item.obtained * quantity
      }
    })
    return total
  }

  // 计算旗舰钥匙总数 - 从物品奖励中累计
  const getPremiumKeyTotal = () => {
    let total = 0
    getAllItems().forEach(item => {
      if (item.name.includes('旗舰钥匙')) {
        const match = item.name.match(/^(\d+)\s/)
        const quantity = match ? parseInt(match[1]) : 0
        total += item.obtained * quantity
      }
    })
    return total
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between px-4 py-1 md:py-3 bg-gradient-to-b from-black/80 to-black/40">
        {/* 左侧：返回按钮 + 标题 */}
        <div className="flex items-center gap-4">
          {/* 侧边栏切换按钮 */}
          <motion.button
            onClick={isModalOpen ? undefined : () => { playButtonClick(); onToggleSidebar(); }}
            className={`relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center transition-colors ${
              isModalOpen
                ? 'text-white/30 cursor-not-allowed'
                : 'text-white/80 hover:text-white'
            }`}
            whileHover={isModalOpen ? {} : { scale: 1.1 }}
            whileTap={isModalOpen ? {} : { scale: 0.95 }}
          >
            {sidebarOpen ? (
              <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            ) : (
              <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            )}
          </motion.button>

          {/* 武库舰抽奖链接 - 只在主页(be97)显示 */}
          {activityId === 'be97' && (
            <motion.button
              onClick={() => {
                playButtonClick();
                navigate('/gacha/flagship/la96');
              }}
              className="p-[2px] relative"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg" />
              <div className="px-2 py-1 md:px-3 md:py-1.5 bg-black rounded-[6px] relative group transition duration-200 text-white hover:bg-transparent flex items-center gap-1.5 md:gap-2">
                <img
                  src={`${CDN_BASE_URL}/assets/contentseparated_assets_content/textures/sprites/units_ships/Monitor.png`}
                  alt="武库舰"
                  className="w-7 h-7 md:w-10 md:h-10 object-contain"
                />
                <span className="text-xs md:text-sm font-bold">武库舰抽奖！</span>
              </div>
            </motion.button>
          )}

          {/* 标题 */}
          <div>
            <h1 className="text-white text-sm md:text-lg font-bold">{activityName}</h1>
            <p className="text-cyan-400 text-[8px] md:text-xs">{activityNameEn}</p>
          </div>
        </div>

        {/* 右侧：信息按钮 + 赞助按钮 + 货币显示 */}
        <div className="flex items-center gap-4">
          {/* 信息按钮 */}
          <button
            onClick={() => { playButtonClick(); onOpenInfo(); }}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <circle cx="12" cy="8" r="0.5" fill="currentColor" />
            </svg>
          </button>

          {/* 赞助按钮 */}
          <button
            onClick={() => { playButtonClick(); onOpenSponsor(); }}
            className="text-white/80 hover:text-yellow-400 transition-colors"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>

          {/* 重置数据按钮 */}
          <button
            onClick={() => { playButtonClick(); onResetData(); }}
            className="text-white/80 hover:text-red-400 transition-colors"
            title="重置本活动数据"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          </button>

          {/* 货币显示 */}
          <div className="flex items-center gap-1.5 md:gap-2">
            {/* 筹码类：筹码 */}
            {!isFlagshipGacha && !isCargoGacha && (
              <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 rounded-full px-2 py-0.5 md:px-3 md:py-1.5 border border-cyan-500/30">
                <img
                  src={currencyIconUrl}
                  alt="筹码"
                  className="w-5 h-5 md:w-6 md:h-6"
                />
                <span className="text-cyan-400 font-bold text-xs md:text-sm">{gameState.currency}</span>
                {/* 加号按钮 */}
                <button
                  onClick={() => { playButtonClick(); onOpenShop(); }}
                  className="ml-0.5 md:ml-1 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 rounded-full text-white text-base md:text-lg font-bold transition-colors"
                >
                  +
                </button>
              </div>
            )}

            {/* 机密货物类：无人机电池 */}
            {isCargoGacha && (
              <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 rounded-full px-2 py-0.5 md:px-3 md:py-1.5 border border-blue-500/30">
                <img
                  src={buildCurrencyIconUrl('bigevent_currency_gacha_gameplay', activityConfig)}
                  alt="无人机电池"
                  className="w-5 h-5 md:w-6 md:h-6"
                />
                <span className="text-blue-400 font-bold text-xs md:text-sm">{gameState.commonCurrency || 0}</span>
                {/* 加号按钮 - 直接添加电池 */}
                {onAddBatteries && (
                  <button
                    onClick={onAddBatteries}
                    className="ml-0.5 md:ml-1 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center bg-blue-500 hover:bg-blue-400 rounded-full text-white text-base md:text-lg font-bold transition-colors"
                  >
                    +
                  </button>
                )}
              </div>
            )}

            {/* 机密货物类：授权密钥 */}
            {isCargoGacha && (
              <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 rounded-full px-2 py-0.5 md:px-3 md:py-1.5 border border-emerald-500/30">
                <img
                  src={buildCurrencyIconUrl('bigevent_currency_gacha_rm', activityConfig)}
                  alt="授权密钥"
                  className="w-5 h-5 md:w-6 md:h-6"
                />
                <span className="text-emerald-400 font-bold text-xs md:text-sm">{gameState.currency || 0}</span>
                {/* 加号按钮 */}
                <button
                  onClick={() => { playButtonClick(); onOpenShop(); }}
                  className="ml-0.5 md:ml-1 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 rounded-full text-white text-base md:text-lg font-bold transition-colors"
                >
                  +
                </button>
              </div>
            )}

            {/* 旗舰宝箱类：普通钥匙 */}
            {isFlagshipGacha && (
              <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 rounded-full px-2 py-0.5 md:px-3 md:py-1.5 border border-gray-500/30">
                <img
                  src={buildCurrencyIconUrl('currency_common_lootboxkey', activityConfig)}
                  alt="钥匙"
                  className="w-5 h-5 md:w-6 md:h-6"
                />
                <span className="text-gray-300 font-bold text-xs md:text-sm">{gameState.commonCurrency || 0}</span>
                {/* 加号按钮 */}
                {onAddCommonKeys && (
                  <button
                    onClick={() => { playButtonClick(); onAddCommonKeys(); }}
                    className="ml-0.5 md:ml-1 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center bg-gray-500 hover:bg-gray-400 rounded-full text-white text-base md:text-lg font-bold transition-colors"
                  >
                    +
                  </button>
                )}
              </div>
            )}

            {/* 旗舰宝箱类：旗舰钥匙 */}
            {isFlagshipGacha && (
              <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 rounded-full px-2 py-0.5 md:px-3 md:py-1.5 border border-amber-500/30">
                <img
                  src={buildCurrencyIconUrl('currency_premium_lootboxkey', activityConfig)}
                  alt="旗舰钥匙"
                  className="w-5 h-5 md:w-6 md:h-6"
                />
                <span className="text-amber-400 font-bold text-xs md:text-sm">{gameState.currency}</span>
                {/* 加号按钮 */}
                <button
                  onClick={() => { playButtonClick(); onOpenShop(); }}
                  className="ml-0.5 md:ml-1 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center bg-amber-500 hover:bg-amber-400 rounded-full text-white text-base md:text-lg font-bold transition-colors"
                >
                  +
                </button>
              </div>
            )}

            {/* 人民币 */}
            <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 rounded-full px-2 py-0.5 md:px-3 md:py-1.5 border border-red-500/30">
              <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                <path d="M531.456 529.408c-18.432 0-34.816-16.384-34.816-33.792v-17.408-16.384V428.032h-95.232c-9.216 0-17.408-3.072-23.552-10.24-7.168-7.168-10.24-17.408-10.24-25.6 1.024-19.456 16.384-34.816 33.792-34.816h94.208v-1.024-29.696h-95.232c-18.432 0-33.792-16.384-33.792-33.792 0-9.216 3.072-18.432 10.24-25.6s14.336-10.24 23.552-10.24h61.44l-1.024-2.048c-12.288-20.48-24.576-41.984-35.84-62.464l-1.024-2.048c-13.312-22.528-27.648-45.056-40.96-67.584-3.072-6.144-13.312-21.504-1.024-35.84 7.168-9.216 18.432-13.312 30.72-13.312 4.096 0 9.216 1.024 12.288 2.048 14.336 6.144 23.552 19.456 28.672 28.672 17.408 30.72 33.792 60.416 51.2 90.112l27.648 49.152 20.48-35.84 17.408-29.696c12.288-22.528 25.6-45.056 38.912-67.584 4.096-9.216 12.288-18.432 20.48-24.576 6.144-4.096 13.312-8.192 20.48-8.192 14.336 0 29.696 9.216 34.816 22.528 3.072 8.192 1.024 18.432-2.048 23.552-17.408 29.696-33.792 59.392-51.2 87.04l-12.288 21.504-17.408 30.72h61.44c18.432 0 32.768 16.384 32.768 34.816 0 20.48-14.336 34.816-32.768 34.816h-94.208v-1.024 28.672-2.048h94.208c17.408 0 30.72 11.264 33.792 27.648 4.096 16.384-6.144 34.816-20.48 41.984-3.072 2.048-8.192 2.048-11.264 2.048h-96.256v20.48c-1.024 17.408 0 30.72 0 44.032 1.024 7.168-2.048 16.384-9.216 21.504-8.192 7.168-19.456 13.312-28.672 13.312z" fill="#d81e06"/>
                <path d="M789.504 776.192m-32.768 0a32.768 32.768 0 1 0 65.536 0 32.768 32.768 0 1 0-65.536 0Z" fill="#d81e06"/>
                <path d="M928.768 642.048c-16.384-33.792-51.2-56.32-89.088-56.32-12.288 0-23.552 2.048-33.792 6.144L675.84 640l-1.024-1.024c-11.264-31.744-39.936-55.296-74.752-60.416l-39.936-6.144c-33.792-5.12-66.56-13.312-95.232-25.6-31.744-12.288-63.488-17.408-97.28-17.408-46.08 0-94.208 12.288-135.168 34.816L184.32 592.896v-1.024c-5.12 2.048-103.424 51.2-95.232 160.768 5.12 70.656 29.696 118.784 67.584 135.168 8.192 4.096 18.432 6.144 30.72 6.144 16.384 0 35.84-5.12 58.368-21.504 12.288-3.072 23.552-5.12 34.816-5.12 22.528 0 45.056 5.12 64.512 14.336l8.192 4.096c45.056 21.504 96.256 32.768 147.456 32.768 55.296 0 107.52-13.312 153.6-36.864l78.848-40.96c11.264-5.12 19.456-16.384 19.456-30.72 0-18.432-15.36-33.792-33.792-33.792-6.144 0-12.288 2.048-17.408 5.12l-79.872 39.936C582.656 840.704 542.72 849.92 500.736 849.92c-40.96 0-79.872-9.216-116.736-26.624l-7.168-4.096c-29.696-14.336-62.464-21.504-95.232-21.504-24.576 0-51.2 5.12-77.824 14.336l-21.504 8.192c-8.192-8.192-19.456-31.744-22.528-75.776-3.072-43.008 22.528-70.656 40.96-83.968h1.024l68.608-37.888c29.696-18.432 64.512-27.648 101.376-27.648 25.6 0 50.176 4.096 71.68 13.312 32.768 12.288 69.632 22.528 109.568 28.672l39.936 6.144c13.312 2.048 22.528 13.312 22.528 25.6 0 15.36-11.264 26.624-26.624 26.624l-168.96 6.144c-10.24 0-18.432 4.096-24.576 10.24-7.168 8.192-10.24 16.384-9.216 23.552 0 9.216 3.072 17.408 10.24 24.576 8.192 7.168 16.384 10.24 23.552 10.24l166.912-2.048c34.816 0 67.584-20.48 83.968-51.2v-1.024l159.744-59.392 9.216-1.024c10.24 0 19.456 6.144 25.6 15.36l3.072 12.288c0 10.24-6.144 19.456-15.36 23.552l-4.096 2.048c-10.24 6.144-16.384 16.384-16.384 28.672 0 18.432 14.336 32.768 32.768 32.768 6.144 0 12.288-2.048 17.408-5.12l1.024-1.024c31.744-15.36 53.248-50.176 53.248-84.992 0-11.264-3.072-24.576-8.192-36.864z" fill="#d81e06"/>
              </svg>
              <span className="text-red-400 font-bold text-xs md:text-sm">{gameState.rmb}</span>
            </div>

            {/* 艺术硬币 */}
            <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 rounded-full px-2 py-0.5 md:px-3 md:py-1.5 border border-purple-500/30">
              <img
                src={`${CDN_BASE_URL}/assets/common-items/Artstorm.png`}
                alt="艺术硬币"
                className="w-5 h-5 md:w-6 md:h-6"
              />
              <span className="text-purple-400 font-bold text-xs md:text-sm">
                {getArtstormTotal()}
              </span>
            </div>

            {/* 旗舰宝箱类：美金 */}
            {isFlagshipGacha && (
              <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 rounded-full px-2 py-0.5 md:px-3 md:py-1.5 border border-green-500/30">
                <img
                  src={`${CDN_BASE_URL}/assets/contentseparated_assets_content/textures/sprites/currency/Soft.png`}
                  alt="美金"
                  className="w-5 h-5 md:w-6 md:h-6"
                />
                <span className="text-green-400 font-bold text-xs md:text-sm">
                  {getSoftTotal()}
                </span>
              </div>
            )}

            {/* 黄金 */}
            <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 rounded-full px-2 py-0.5 md:px-3 md:py-1.5 border border-yellow-500/30">
              <img
                src={`${CDN_BASE_URL}/assets/common-items/Hard.png`}
                alt="黄金"
                className="w-5 h-5 md:w-6 md:h-6"
              />
              <span className="text-yellow-400 font-bold text-xs md:text-sm">
                {getGoldTotal()}
              </span>
            </div>

            {/* 旗舰宝箱类：升级芯片 */}
            {isFlagshipGacha && (
              <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 rounded-full px-2 py-0.5 md:px-3 md:py-1.5 border border-blue-500/30">
                <img
                  src={`${CDN_BASE_URL}/assets/contentseparated_assets_content/textures/sprites/currency/Upgrades.png`}
                  alt="升级芯片"
                  className="w-5 h-5 md:w-6 md:h-6"
                />
                <span className="text-blue-400 font-bold text-xs md:text-sm">
                  {getUpgradesTotal()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
