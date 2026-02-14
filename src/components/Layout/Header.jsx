'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CDN_BASE_URL } from '../../utils/constants'
import { buildCurrencyIconUrl, loadActivityIndex } from '../../services/cdnService'
import { useEffect, useState } from 'react'
import { useSound } from '../../hooks/useSound'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'
import { Crown } from 'lucide-react'
import { MembershipModal } from '../ui/MembershipModal'

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
  const router = useRouter()
  const [firstActivityId, setFirstActivityId] = useState(null)
  const { user, isPremium, isMember, membership, logout, isActivated, userAccount, allMemberships, totalRemainingDays, bindPass } = useAuth()
  const [showMembershipModal, setShowMembershipModal] = useState(false)
  const [membershipInitialStep, setMembershipInitialStep] = useState('select')
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showBindPassInput, setShowBindPassInput] = useState(false)
  const [bindPassCode, setBindPassCode] = useState('')
  const [bindPassLoading, setBindPassLoading] = useState(false)
  const [bindPassError, setBindPassError] = useState('')
  const [bindPassSuccess, setBindPassSuccess] = useState('')

  const openMembership = (step = 'select') => {
    setMembershipInitialStep(step)
    setShowMembershipModal(true)
  }

  // 手机端 H5 支付回来后自动打开弹窗恢复轮询
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pending_mobile_payment')
      if (!raw) return
      const pending = JSON.parse(raw)
      if (Date.now() - pending.timestamp > 10 * 60 * 1000) {
        localStorage.removeItem('pending_mobile_payment')
        return
      }
      setShowMembershipModal(true)
    } catch {
      localStorage.removeItem('pending_mobile_payment')
    }
  }, [])

  const handleBindPass = async () => {
    if (!bindPassCode.trim() || bindPassLoading) return
    setBindPassLoading(true)
    setBindPassError('')
    setBindPassSuccess('')
    try {
      const result = await bindPass(bindPassCode.trim())
      setBindPassSuccess(result.message || '绑定成功')
      setBindPassCode('')
      setTimeout(() => { setShowBindPassInput(false); setBindPassSuccess('') }, 1500)
    } catch (err) {
      setBindPassError(err.message || '绑定失败')
    } finally {
      setBindPassLoading(false)
    }
  }

  // 加载第一个活动ID
  useEffect(() => {
    const loadFirstActivity = async () => {
      try {
        const data = await loadActivityIndex()
        if (data.activities && data.activities.length > 0) {
          setFirstActivityId(data.activities[0].id)
        }
      } catch (error) {
        console.error('[Header] Failed to load activity index:', error)
      }
    }
    loadFirstActivity()
  }, [])

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

  // 判断是否为机密货物类或无人机补给类
  const isCargoGacha = activityConfig?.gacha_type === '机密货物类' || activityConfig?.gacha_type === '无人机补给类'

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
            className={`relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center transition-colors ${isModalOpen
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

          {/* 股东炮抽奖链接 - 不在 la101 页面时显示 */}
          {activityId !== 'la101' && (
            <motion.button
              onClick={() => {
                playButtonClick();
                router.push('/gacha/flagship/la101');
              }}
              className="p-[2px] relative"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute inset-0 ultra-rare-glow rounded-lg" />
              <div className="px-2 py-1 md:px-3 md:py-1.5 bg-black rounded-[6px] relative group transition duration-200 text-white hover:bg-transparent flex items-center gap-1.5 md:gap-2">
                <img
                  src="https://assets.lingflow.cn/mw-gacha-simulation/assets/contentseparated_assets_content/textures/sprites/weapons/RG32.png"
                  alt="股东炮"
                  className="w-7 h-7 md:w-10 md:h-10 object-contain"
                />
                <span className="text-xs md:text-sm font-bold">股东炮抽奖！</span>
              </div>
            </motion.button>
          )}

          {/* 标题 */}
          <div>
            <h1 className="text-white text-sm md:text-lg font-bold">{activityName}</h1>
            <p className="text-cyan-400 text-[8px] md:text-xs">{activityNameEn}</p>
          </div>
        </div>

        {/* 右侧：会员状态 + 登录/注销 + 信息按钮 + 赞助按钮 + 货币显示 */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* 会员状态徽章 + 剩余天数 */}
          {isActivated && isMember && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5"
            >
              <div className="flex items-center bg-orange-600/20 border border-orange-500 text-orange-400 p-1 shadow-[0_0_8px_rgba(234,88,12,0.3)] backdrop-blur-sm">
                <Crown size={14} strokeWidth={2.5} />
              </div>
              {totalRemainingDays > 0 && (
                <span className="text-[10px] text-orange-300/80 font-mono">
                  剩余 {totalRemainingDays} 天
                </span>
              )}
            </motion.div>
          )}

          {/* 已过期徽章 */}
          {isActivated && !isMember && membership?.is_active && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1 bg-slate-700/50 border border-slate-500 text-slate-300 px-2 py-0.5 text-xs font-bold font-mono tracking-wider"
            >
              EXPIRED
            </motion.div>
          )}

          {/* 用户区域 */}
          {isActivated ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 relative"
            >
              {/* 用户名（点击展开菜单） */}
              <button
                onClick={() => { playButtonClick(); setShowAccountMenu(!showAccountMenu) }}
                className="text-slate-300 hover:text-white font-mono text-xs px-2 py-0.5 border border-slate-700 bg-black/40 hover:border-slate-500 transition-colors cursor-pointer"
              >
                {userAccount?.login_id || membership?.activation_code || 'GUEST'}
              </button>

              {/* 过期续费 */}
              {!isMember && membership?.is_active && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { playButtonClick(); openMembership('select') }}
                  className="bg-orange-600 hover:bg-orange-500 text-white px-2 py-0.5 text-xs font-bold font-mono uppercase transition-all border border-orange-400"
                >
                  RENEW
                </motion.button>
              )}

              {/* 下拉菜单 */}
              <AnimatePresence>
                {showAccountMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAccountMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute top-full right-0 mt-1 z-50 bg-slate-900 border border-slate-700 shadow-xl min-w-[160px] md:min-w-[180px] max-h-[70vh] overflow-y-auto"
                    >
                      {/* 账号信息 */}
                      <div className="px-2 py-1.5 md:px-3 md:py-2 border-b border-slate-800">
                        <p className="text-[10px] md:text-[11px] text-slate-400 uppercase tracking-wider">账号</p>
                        <p className="text-xs md:text-sm text-white font-mono truncate">
                          {userAccount?.login_id || '未绑定'}
                        </p>
                        <p className="text-[10px] md:text-xs text-slate-400 font-mono mt-0.5 truncate">
                          {membership?.activation_code}
                        </p>
                      </div>

                      {/* 通行证列表 */}
                      {allMemberships.length > 0 && (
                        <div className="px-2 py-1.5 md:px-3 md:py-2 border-b border-slate-800">
                          <p className="text-[10px] md:text-[11px] text-slate-400 uppercase tracking-wider mb-0.5 md:mb-1">通行证</p>
                          <div className="space-y-1 md:space-y-1.5 max-h-[100px] md:max-h-[150px] overflow-y-auto">
                            {allMemberships.map((m, i) => {
                              const isExp = m.remaining_days === 0
                              return (
                                <div key={m.activation_code || i} className="flex items-center justify-between gap-1.5 md:gap-2">
                                  <div className="flex items-center gap-1 md:gap-1.5 min-w-0">
                                    <span className={`text-[10px] md:text-xs font-mono truncate ${isExp ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                      {m.activation_code ? m.activation_code.slice(0, 4) + '····' + m.activation_code.slice(-4) : '—'}
                                    </span>
                                    <span className="text-[9px] md:text-[10px] px-1 py-px bg-slate-800 text-slate-400 shrink-0">
                                      {m.membership_type === 'yearly' ? '年' : '月'}
                                    </span>
                                  </div>
                                  <span className={`text-[10px] md:text-xs font-mono shrink-0 ${isExp ? 'text-slate-500' : 'text-emerald-400'}`}>
                                    {isExp ? '已过期' : `${m.remaining_days}天`}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                          {totalRemainingDays > 0 && allMemberships.length > 1 && (
                            <div className="mt-1 pt-1 md:mt-1.5 md:pt-1.5 border-t border-slate-800/50 flex justify-between">
                              <span className="text-[10px] md:text-xs text-slate-400">合计</span>
                              <span className="text-[10px] md:text-xs text-orange-400 font-mono font-bold">{totalRemainingDays}天</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 绑定新通行证 - 仅当有账号时显示 */}
                      {userAccount && (
                        <div className="border-b border-slate-800">
                          {!showBindPassInput ? (
                            <button
                              onClick={() => { setShowBindPassInput(true); setBindPassError(''); setBindPassSuccess('') }}
                              className="w-full px-2 py-1.5 md:px-3 md:py-2 text-left text-[10px] md:text-xs text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                            >
                              绑定其它通行证密钥
                            </button>
                          ) : (
                            <div className="px-2 py-1.5 md:px-3 md:py-2 space-y-1.5 md:space-y-2">
                              <p className="text-[10px] md:text-[11px] text-slate-400 uppercase tracking-wider">输入其它通行证密钥</p>
                              <div className="flex gap-1 md:gap-1.5">
                                <input
                                  type="text"
                                  value={bindPassCode}
                                  onChange={e => { setBindPassCode(e.target.value); setBindPassError(''); setBindPassSuccess('') }}
                                  placeholder="XXXX-XXXX-XXXX"
                                  className="flex-1 min-w-0 bg-slate-800 border border-slate-600 text-white text-[10px] md:text-xs font-mono px-1.5 py-1 md:px-2 md:py-1.5 focus:outline-none focus:border-orange-500"
                                  disabled={bindPassLoading}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' && bindPassCode.trim()) {
                                      handleBindPass()
                                    }
                                  }}
                                  autoFocus
                                />
                                <button
                                  onClick={handleBindPass}
                                  disabled={bindPassLoading || !bindPassCode.trim()}
                                  className="shrink-0 px-2 py-1 md:px-2.5 md:py-1.5 text-[10px] md:text-xs font-bold bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
                                >
                                  {bindPassLoading ? '...' : '确认'}
                                </button>
                                <button
                                  onClick={() => { setShowBindPassInput(false); setBindPassCode(''); setBindPassError(''); setBindPassSuccess('') }}
                                  className="shrink-0 px-1.5 py-1 md:px-2 md:py-1.5 text-[10px] md:text-xs text-slate-300 hover:text-white transition-colors"
                                >
                                  取消
                                </button>
                              </div>
                              {bindPassError && (
                                <p className="text-[10px] md:text-xs text-red-400">{bindPassError}</p>
                              )}
                              {bindPassSuccess && (
                                <p className="text-[10px] md:text-xs text-emerald-400">{bindPassSuccess}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 操作 */}
                      {!userAccount && (
                        <button
                          onClick={() => { setShowAccountMenu(false); openMembership('bind') }}
                          className="w-full px-2 py-1.5 md:px-3 md:py-2 text-left text-[10px] md:text-xs text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                        >
                          绑定登录账号
                        </button>
                      )}
                      <button
                        onClick={() => { setShowAccountMenu(false); openMembership('select') }}
                        className="w-full px-2 py-1.5 md:px-3 md:py-2 text-left text-[10px] md:text-xs text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        购买/续费会员
                      </button>
                      <button
                        onClick={() => { setShowAccountMenu(false); playButtonClick(); logout() }}
                        className="w-full px-2 py-1.5 md:px-3 md:py-2 text-left text-[10px] md:text-xs text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors border-t border-slate-800"
                      >
                        注销登录
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { playButtonClick(); openMembership('select') }}
              className="bg-orange-600/80 hover:bg-orange-500 text-white px-3 py-1 text-xs font-bold hover:shadow-[0_0_10px_rgba(234,88,12,0.5)] transition-all flex items-center gap-1.5 border border-orange-500"
            >
              <Crown size={12} />
              <span className="hidden md:inline font-mono tracking-tight uppercase">Get Access</span>
              <span className="md:hidden font-mono uppercase">Access</span>
            </motion.button>
          )}

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

            {/* 机密货物类/无人机补给类：无人机电池/遥控器 */}
            {isCargoGacha && (() => {
              // 根据活动类型选择正确的货币ID
              const isSpType = activityConfig?.gacha_type === '无人机补给类'
              const currencyId = isSpType ? 'Drone_Fob' : 'bigevent_currency_gacha_gameplay'
              const currencyName = isSpType ? '遥控器' : '无人机电池'

              return (
                <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 rounded-full px-2 py-0.5 md:px-3 md:py-1.5 border border-blue-500/30">
                  <img
                    src={buildCurrencyIconUrl(currencyId, activityConfig)}
                    alt={currencyName}
                    className="w-5 h-5 md:w-6 md:h-6"
                  />
                  <span className="text-blue-400 font-bold text-xs md:text-sm">{gameState.commonCurrency || 0}</span>
                  {/* 加号按钮 - 直接添加电池/遥控器 */}
                  {onAddBatteries && (
                    <button
                      onClick={onAddBatteries}
                      className="ml-0.5 md:ml-1 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center bg-blue-500 hover:bg-blue-400 rounded-full text-white text-base md:text-lg font-bold transition-colors"
                    >
                      +
                    </button>
                  )}
                </div>
              )
            })()}

            {/* 机密货物类/无人机补给类：授权密钥/开锁器 */}
            {isCargoGacha && (() => {
              // 根据活动类型选择正确的货币ID
              const isSpType = activityConfig?.gacha_type === '无人机补给类'
              const currencyId = isSpType ? 'Authorization_Key' : 'bigevent_currency_gacha_rm'
              const currencyName = isSpType ? '开锁器' : '授权密钥'

              return (
                <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 rounded-full px-2 py-0.5 md:px-3 md:py-1.5 border border-emerald-500/30">
                  <img
                    src={buildCurrencyIconUrl(currencyId, activityConfig)}
                    alt={currencyName}
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
              )
            })()}

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
                <path d="M531.456 529.408c-18.432 0-34.816-16.384-34.816-33.792v-17.408-16.384V428.032h-95.232c-9.216 0-17.408-3.072-23.552-10.24-7.168-7.168-10.24-17.408-10.24-25.6 1.024-19.456 16.384-34.816 33.792-34.816h94.208v-1.024-29.696h-95.232c-18.432 0-33.792-16.384-33.792-33.792 0-9.216 3.072-18.432 10.24-25.6s14.336-10.24 23.552-10.24h61.44l-1.024-2.048c-12.288-20.48-24.576-41.984-35.84-62.464l-1.024-2.048c-13.312-22.528-27.648-45.056-40.96-67.584-3.072-6.144-13.312-21.504-1.024-35.84 7.168-9.216 18.432-13.312 30.72-13.312 4.096 0 9.216 1.024 12.288 2.048 14.336 6.144 23.552 19.456 28.672 28.672 17.408 30.72 33.792 60.416 51.2 90.112l27.648 49.152 20.48-35.84 17.408-29.696c12.288-22.528 25.6-45.056 38.912-67.584 4.096-9.216 12.288-18.432 20.48-24.576 6.144-4.096 13.312-8.192 20.48-8.192 14.336 0 29.696 9.216 34.816 22.528 3.072 8.192 1.024 18.432-2.048 23.552-17.408 29.696-33.792 59.392-51.2 87.04l-12.288 21.504-17.408 30.72h61.44c18.432 0 32.768 16.384 32.768 34.816 0 20.48-14.336 34.816-32.768 34.816h-94.208v-1.024 28.672-2.048h94.208c17.408 0 30.72 11.264 33.792 27.648 4.096 16.384-6.144 34.816-20.48 41.984-3.072 2.048-8.192 2.048-11.264 2.048h-96.256v20.48c-1.024 17.408 0 30.72 0 44.032 1.024 7.168-2.048 16.384-9.216 21.504-8.192 7.168-19.456 13.312-28.672 13.312z" fill="#d81e06" />
                <path d="M789.504 776.192m-32.768 0a32.768 32.768 0 1 0 65.536 0 32.768 32.768 0 1 0-65.536 0Z" fill="#d81e06" />
                <path d="M928.768 642.048c-16.384-33.792-51.2-56.32-89.088-56.32-12.288 0-23.552 2.048-33.792 6.144L675.84 640l-1.024-1.024c-11.264-31.744-39.936-55.296-74.752-60.416l-39.936-6.144c-33.792-5.12-66.56-13.312-95.232-25.6-31.744-12.288-63.488-17.408-97.28-17.408-46.08 0-94.208 12.288-135.168 34.816L184.32 592.896v-1.024c-5.12 2.048-103.424 51.2-95.232 160.768 5.12 70.656 29.696 118.784 67.584 135.168 8.192 4.096 18.432 6.144 30.72 6.144 16.384 0 35.84-5.12 58.368-21.504 12.288-3.072 23.552-5.12 34.816-5.12 22.528 0 45.056 5.12 64.512 14.336l8.192 4.096c45.056 21.504 96.256 32.768 147.456 32.768 55.296 0 107.52-13.312 153.6-36.864l78.848-40.96c11.264-5.12 19.456-16.384 19.456-30.72 0-18.432-15.36-33.792-33.792-33.792-6.144 0-12.288 2.048-17.408 5.12l-79.872 39.936C582.656 840.704 542.72 849.92 500.736 849.92c-40.96 0-79.872-9.216-116.736-26.624l-7.168-4.096c-29.696-14.336-62.464-21.504-95.232-21.504-24.576 0-51.2 5.12-77.824 14.336l-21.504 8.192c-8.192-8.192-19.456-31.744-22.528-75.776-3.072-43.008 22.528-70.656 40.96-83.968h1.024l68.608-37.888c29.696-18.432 64.512-27.648 101.376-27.648 25.6 0 50.176 4.096 71.68 13.312 32.768 12.288 69.632 22.528 109.568 28.672l39.936 6.144c13.312 2.048 22.528 13.312 22.528 25.6 0 15.36-11.264 26.624-26.624 26.624l-168.96 6.144c-10.24 0-18.432 4.096-24.576 10.24-7.168 8.192-10.24 16.384-9.216 23.552 0 9.216 3.072 17.408 10.24 24.576 8.192 7.168 16.384 10.24 23.552 10.24l166.912-2.048c34.816 0 67.584-20.48 83.968-51.2v-1.024l159.744-59.392 9.216-1.024c10.24 0 19.456 6.144 25.6 15.36l3.072 12.288c0 10.24-6.144 19.456-15.36 23.552l-4.096 2.048c-10.24 6.144-16.384 16.384-16.384 28.672 0 18.432 14.336 32.768 32.768 32.768 6.144 0 12.288-2.048 17.408-5.12l1.024-1.024c31.744-15.36 53.248-50.176 53.248-84.992 0-11.264-3.072-24.576-8.192-36.864z" fill="#d81e06" />
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

      {/* 会员购买弹窗 */}
      <MembershipModal
        isOpen={showMembershipModal}
        onClose={() => setShowMembershipModal(false)}
        initialStep={membershipInitialStep}
        onSuccess={() => {
          // 不关弹窗，让用户在成功页面复制通行证密钥后手动关闭
        }}
      />
    </div>
  )
}
