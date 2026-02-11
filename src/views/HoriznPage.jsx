'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Calendar, Search, X } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import BarChartRace from '@/components/Horizn/BarChartRace'
import CopyRankModal from '@/components/Horizn/CopyRankModal'
import CheckListModal from '@/components/Horizn/CheckListModal'
import KickReviewModal from '@/components/Horizn/KickReviewModal'
import MemberEventsModal from '@/components/Horizn/MemberEventsModal'
import { CDN_BASE_URL } from '@/utils/constants'
import { getHoriznAvailableMonths, getHoriznMonthlyBaseSmart, buildHoriznTimelineFromBase } from '@/services/horiznSupabase'
import '@/components/Layout/Sidebar.css'

export default function HoriznPage({ yearMonth }) {
  const router = useRouter()

  // 验证 yearMonth 格式（YYYYMM）
  if (!yearMonth || !/^\d{6}$/.test(yearMonth)) {
    router.replace('/horizn')
    return null
  }
  const [activeTab, setActiveTab] = useState('weekly')
  const [isAdmin, setIsAdmin] = useState(false) // 管理员权限状态
  const [showAdminMenu, setShowAdminMenu] = useState(false)
  const [showMonthMenu, setShowMonthMenu] = useState(false)
  const [availableMonths, setAvailableMonths] = useState([])
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [currentData, setCurrentData] = useState(null)
  const [manualFrameIndex, setManualFrameIndex] = useState(null) // 手动控制的帧索引（用于时间调整）
  const [isMobile, setIsMobile] = useState(false)

  // 追踪考核名单相关状态
  const [showCheckModal, setShowCheckModal] = useState(false)

  // 踢出人员审核清单相关状态
  const [showKickReviewModal, setShowKickReviewModal] = useState(false)

  // 成员入离队细目相关状态
  const [showMemberEventsModal, setShowMemberEventsModal] = useState(false)

  // 搜索定位玩家
  const [pinnedPlayerId, setPinnedPlayerId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [showSearchInput, setShowSearchInput] = useState(false)
  const searchInputRef = useRef(null)
  const searchContainerRef = useRef(null)

  // 预加载的数据缓存
  const [preloadedData, setPreloadedData] = useState({
    weekly: null, // { timeline, colorMap }
    season: null
  })
  const [monthlyBase, setMonthlyBase] = useState(null)

  // 响应式监听
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 检查是否有管理员权限（客户端初始化）
  useEffect(() => {
    setIsAdmin(sessionStorage.getItem('horizn_admin_auth') === 'true')
  }, [])

  // 从 localStorage 读取上次定位的玩家
  useEffect(() => {
    const saved = localStorage.getItem('horizn_pinned_player')
    if (saved) setPinnedPlayerId(saved)
  }, [])

  // pinnedPlayerId 变更时写入 localStorage
  useEffect(() => {
    if (pinnedPlayerId) {
      localStorage.setItem('horizn_pinned_player', pinnedPlayerId)
    } else {
      localStorage.removeItem('horizn_pinned_player')
    }
  }, [pinnedPlayerId])

  // 点击外部关闭搜索下拉
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchDropdown(false)
        if (!pinnedPlayerId && !searchQuery) setShowSearchInput(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [pinnedPlayerId, searchQuery])

  // 搜索建议列表（从 idMapping 过滤）
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || !monthlyBase?.idMapping) return []
    const q = searchQuery.trim().toLowerCase()
    const results = []

    for (const [pid, info] of Object.entries(monthlyBase.idMapping)) {
      const name = (info.name || '').toLowerCase()
      const variants = (info.nameVariants || '').toLowerCase().split('|').filter(Boolean)
      const pidLower = pid.toLowerCase()

      if (name.includes(q) || pidLower.includes(q) || variants.some(v => v.includes(q))) {
        results.push({ playerId: pid, name: info.name || pid, nameVariants: info.nameVariants })
      }
      if (results.length >= 10) break
    }
    return results
  }, [searchQuery, monthlyBase?.idMapping])

  // 选中玩家
  const handleSelectPlayer = (playerId) => {
    setPinnedPlayerId(playerId)
    setSearchQuery('')
    setShowSearchDropdown(false)
    setShowSearchInput(false)
  }

  // 清除定位
  const handleClearPin = () => {
    setPinnedPlayerId(null)
    setSearchQuery('')
    setShowSearchInput(false)
  }

  // 获取已定位玩家的显示名
  const pinnedPlayerName = useMemo(() => {
    if (!pinnedPlayerId || !monthlyBase?.idMapping) return null
    return monthlyBase.idMapping[pinnedPlayerId]?.name || pinnedPlayerId
  }, [pinnedPlayerId, monthlyBase?.idMapping])

  // 退出管理员
  const handleLogout = () => {
    sessionStorage.removeItem('horizn_admin_auth')
    setIsAdmin(false)
    setShowAdminMenu(false)
  }

  // 跳转到指定月份
  const handleMonthSelect = (selectedYearMonth) => {
    setShowMonthMenu(false)
    if (selectedYearMonth !== yearMonth) {
      router.push(`/horizn/${selectedYearMonth}`)
    }
  }

  // 格式化年月显示（YYYYMM -> YYYY年MM月）
  const formatYearMonth = (ym) => {
    const year = ym.substring(0, 4)
    const month = ym.substring(4, 6)
    return `${year}年${month}月`
  }

  // 打开复制名单弹窗
  const handleOpenCopyModal = () => {
    setShowAdminMenu(false)
    setShowCopyModal(true)
  }

  // 打开追踪考核名单弹窗
  const handleOpenCheckModal = () => {
    setShowAdminMenu(false)
    setShowCheckModal(true)
  }

  // 打开踢出人员审核清单弹窗
  const handleOpenKickReviewModal = () => {
    setShowAdminMenu(false)
    setShowKickReviewModal(true)
  }

  // 打开成员入离队细目弹窗
  const handleOpenMemberEventsModal = () => {
    setShowAdminMenu(false)
    setShowMemberEventsModal(true)
  }

  // 设置页面标题
  useEffect(() => {
    document.title = '地平线活跃度条形动画'
    return () => {
      document.title = '现代战舰抽奖模拟器' // 离开时恢复默认标题
    }
  }, [])

  // 仅在打开月份菜单时加载可用月份列表，避免与主数据请求抢占网络
  useEffect(() => {
    if (!showMonthMenu) return
    if (availableMonths.length > 0) return

    const fetchMonths = async () => {
      try {
        const months = await getHoriznAvailableMonths()
        setAvailableMonths(months)
      } catch (error) {
        console.error('Failed to load available months:', error)
      }
    }

    fetchMonths()
  }, [showMonthMenu, availableMonths.length])

  // 预加载：先取 Supabase 月度基础数据 + 周活时间线（赛季时间线延后计算，提升首屏速度）
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setPreloadedData({ weekly: null, season: null })
        setMonthlyBase(null)

        const base = await getHoriznMonthlyBaseSmart(yearMonth)
        const weeklyTimeline = buildHoriznTimelineFromBase(base, 'weekly_activity')
        const weekly = { timeline: weeklyTimeline, colorMap: base.colorMap, idMapping: base.idMapping }

        setMonthlyBase(base)
        setPreloadedData({ weekly, season: null })
        console.log('[HoriznPage] Preloaded weekly timeline:', weeklyTimeline.length)
      } catch (error) {
        console.error('[HoriznPage] Failed to load Supabase data:', error)
        setPreloadedData({
          weekly: { timeline: [], colorMap: {}, idMapping: {} },
          season: { timeline: [], colorMap: {}, idMapping: {} }
        })
        setMonthlyBase(null)
        toast.error('加载数据失败，请稍后重试')
      }
    }

    loadAllData()
  }, [yearMonth])

  // 空闲时预计算赛季时间线，避免切换标签时卡顿（不阻塞首屏）
  useEffect(() => {
    if (!monthlyBase) return
    if (preloadedData.season) return

    const schedule = typeof window !== 'undefined' && window.requestIdleCallback
      ? window.requestIdleCallback
      : (cb) => setTimeout(cb, 0)

    const cancel = typeof window !== 'undefined' && window.cancelIdleCallback
      ? window.cancelIdleCallback
      : (id) => clearTimeout(id)

    const taskId = schedule(() => {
      try {
        const seasonTimeline = buildHoriznTimelineFromBase(monthlyBase, 'season_activity')
        setPreloadedData(prev => ({
          ...prev,
          season: { timeline: seasonTimeline, colorMap: monthlyBase.colorMap, idMapping: monthlyBase.idMapping }
        }))
        console.log('[HoriznPage] Precomputed season timeline:', seasonTimeline.length)
      } catch (e) {
        console.warn('[HoriznPage] Failed to precompute season timeline:', e)
      }
    })

    return () => cancel(taskId)
  }, [monthlyBase, preloadedData.season])

  // 当用户确实需要赛季数据（切换标签/打开追踪考核弹窗）时，若仍未准备好则立即计算一次
  useEffect(() => {
    const needsSeason = activeTab === 'season' || showCheckModal
    if (!needsSeason) return
    if (!monthlyBase) return
    if (preloadedData.season) return

    try {
      const seasonTimeline = buildHoriznTimelineFromBase(monthlyBase, 'season_activity')
      setPreloadedData(prev => ({
        ...prev,
        season: { timeline: seasonTimeline, colorMap: monthlyBase.colorMap, idMapping: monthlyBase.idMapping }
      }))
    } catch (e) {
      console.warn('[HoriznPage] Failed to build season timeline on-demand:', e)
    }
  }, [activeTab, showCheckModal, monthlyBase, preloadedData.season])

  // 动态构建 CSV 路径（useMemo 缓存，避免切换标签时重新创建导致组件重新挂载）
  const tabs = useMemo(() => [
    { id: 'weekly', name: '周活跃度', csvPath: `supabase-weekly-${yearMonth}` },
    { id: 'season', name: '赛季活跃度', csvPath: `supabase-season-${yearMonth}` }
  ], [yearMonth])

  const currentTab = tabs.find(tab => tab.id === activeTab)

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-gray-900 to-black">
      {/* Toast 通知 */}
      <Toaster
        position="top-center"
        containerStyle={{
          zIndex: 10000,
        }}
        toastOptions={{
          style: {
            marginTop: isMobile ? '20px' : '60px',
            padding: isMobile ? '8px 14px' : '10px 18px',
            fontSize: isMobile ? '13px' : '15px',
            minHeight: 'auto',
          },
        }}
      />
      {/* 标签页导航 + 状态栏 */}
      <div className="flex-shrink-0 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            {/* 左侧：联队logo + 标签页 */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              {/* 联队logo */}
              <img
                src={`${CDN_BASE_URL}/horizn.png`}
                alt="HORIZN"
                className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 rounded-full object-cover flex-shrink-0"
              />
              {/* 标签页 */}
              <div className="flex gap-0.5 sm:gap-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4 text-xs sm:text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-white border-b-2 border-blue-500'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>

              {/* 搜索定位玩家 */}
              <div ref={searchContainerRef} className="relative ml-1 sm:ml-2">
                {pinnedPlayerId && !showSearchInput ? (
                  // 已定位状态：显示玩家名 + 清除按钮
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded text-[10px] sm:text-xs font-medium">
                    <Search className="w-3 h-3 flex-shrink-0" />
                    <span className="max-w-[60px] sm:max-w-[80px] truncate cursor-pointer" onClick={() => { setShowSearchInput(true); setTimeout(() => searchInputRef.current?.focus(), 50) }}>
                      {pinnedPlayerName}
                    </span>
                    <button
                      onClick={handleClearPin}
                      className="hover:text-amber-200 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : showSearchInput ? (
                  // 搜索输入状态
                  <div className="relative">
                    <div className="flex items-center gap-1 bg-gray-800 border border-gray-600 rounded px-2 py-1">
                      <Search className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value)
                          setShowSearchDropdown(true)
                        }}
                        onFocus={() => searchQuery && setShowSearchDropdown(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setShowSearchInput(false)
                            setSearchQuery('')
                            setShowSearchDropdown(false)
                          }
                        }}
                        placeholder="搜索玩家..."
                        className="bg-transparent text-white text-[10px] sm:text-xs w-20 sm:w-28 outline-none placeholder-gray-500"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          setShowSearchInput(false)
                          setSearchQuery('')
                          setShowSearchDropdown(false)
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    {/* 搜索下拉建议 */}
                    {showSearchDropdown && searchQuery.trim() && (
                      <div className="absolute left-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-30 w-48 sm:w-56 max-h-[240px] overflow-y-auto custom-scrollbar">
                        {searchSuggestions.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-gray-500 text-center">
                            未找到匹配玩家
                          </div>
                        ) : (
                          searchSuggestions.map((player) => (
                            <button
                              key={player.playerId}
                              onClick={() => handleSelectPlayer(player.playerId)}
                              className="w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex flex-col"
                            >
                              <span className="truncate">{player.name}</span>
                              <span className="text-[9px] text-gray-500 truncate">{player.playerId}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  // 默认状态：搜索按钮
                  <button
                    onClick={() => { setShowSearchInput(true); setTimeout(() => searchInputRef.current?.focus(), 50) }}
                    className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors"
                    title="搜索定位玩家"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 右侧：月份选择器 + 管理员标识 + 状态信息 */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 text-[10px] sm:text-xs text-gray-400 pr-1 sm:pr-2">
              {/* 月份选择器 */}
              <div className="relative">
                <button
                  onClick={() => setShowMonthMenu(!showMonthMenu)}
                  className="flex items-center gap-1 px-2 py-1 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded text-[10px] font-medium hover:bg-purple-600/30 transition-colors cursor-pointer"
                >
                  <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">{formatYearMonth(yearMonth)}</span>
                </button>

                {/* 月份下拉菜单 */}
                {showMonthMenu && (
                  <>
                    {/* 点击外部关闭 */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMonthMenu(false)}
                    />
                    {/* 菜单内容 */}
                    <div className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-20 w-max max-w-[140px] max-h-[300px]">
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {availableMonths.length === 0 ? (
                          <div className="px-3 py-1.5 text-xs text-gray-500 text-center">
                            加载中...
                          </div>
                        ) : (
                          availableMonths.map((month) => (
                            <button
                              key={month.yearMonth}
                              onClick={() => handleMonthSelect(month.yearMonth)}
                              className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-700 transition-colors flex items-center gap-1.5 ${
                                month.yearMonth === yearMonth
                                  ? 'text-purple-400 bg-gray-700/50'
                                  : 'text-gray-300'
                              }`}
                            >
                              <span>{formatYearMonth(month.yearMonth)}</span>
                              {month.yearMonth === yearMonth && (
                                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {availableMonths.length > 0 && <span className="hidden sm:inline text-gray-600">|</span>}

              {/* 管理员标识（可点击） */}
              {isAdmin && (
                <>
                  <div className="relative">
                    <button
                      onClick={() => setShowAdminMenu(!showAdminMenu)}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded text-[10px] font-medium hover:bg-blue-600/30 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                      <span className="hidden sm:inline">管理员</span>
                    </button>

                    {/* 下拉菜单 */}
                    {showAdminMenu && (
                      <>
                        {/* 点击外部关闭 */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowAdminMenu(false)}
                        />
                        {/* 菜单内容 */}
                        <div className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-20 min-w-[130px]">
                          <button
                            onClick={handleOpenCopyModal}
                            className="w-full px-3 py-1.5 text-left text-xs text-blue-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>复制排名名单</span>
                          </button>
                          <button
                            onClick={handleOpenCheckModal}
                            className="w-full px-3 py-1.5 text-left text-xs text-yellow-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            <span>活跃度达标核查</span>
                          </button>
                          <button
                            onClick={handleOpenKickReviewModal}
                            className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>踢出审核回归</span>
                          </button>
                          <button
                            onClick={handleOpenMemberEventsModal}
                            className="w-full px-3 py-1.5 text-left text-xs text-cyan-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>入离队细目</span>
                          </button>
                          <div className="border-t border-gray-700"></div>
                          <button
                            onClick={handleLogout}
                            className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>退出管理员</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 内容区 - 可滚动 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <BarChartRace
          key={currentTab.csvPath}
          csvPath={currentTab.csvPath}
          onDataUpdate={setCurrentData}
          showValues={isAdmin}
          externalFrameIndex={manualFrameIndex}
          preloadedData={preloadedData[activeTab]}
          highlightPlayerId={pinnedPlayerId}
        />
      </div>

      {/* 复制名单弹窗 */}
      <CopyRankModal
        show={showCopyModal}
        onClose={() => {
          setShowCopyModal(false)
          setManualFrameIndex(null)
        }}
        isMobile={isMobile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentData={currentData}
        preloadedData={preloadedData}
        manualFrameIndex={manualFrameIndex}
        setManualFrameIndex={setManualFrameIndex}
      />

      {/* 活跃度达标核查弹窗 */}
      <CheckListModal
        show={showCheckModal}
        onClose={() => setShowCheckModal(false)}
        isMobile={isMobile}
        yearMonth={yearMonth}
      />

      {/* 踢出人员审核清单弹窗 */}
      <KickReviewModal
        show={showKickReviewModal}
        onClose={() => setShowKickReviewModal(false)}
        isMobile={isMobile}
      />

      {/* 成员入离队细目弹窗 */}
      <MemberEventsModal
        show={showMemberEventsModal}
        onClose={() => setShowMemberEventsModal(false)}
        isMobile={isMobile}
        isAdmin={isAdmin}
      />
    </div>
  )
}
