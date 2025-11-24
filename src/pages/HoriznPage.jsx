import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { ShieldCheck, Calendar } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import BarChartRace from '@/components/Horizn/BarChartRace'
import { buildHoriznWeeklyCsvPath, buildHoriznSeasonCsvPath, getAllHoriznMonths } from '@/services/cdnService'
import { CDN_BASE_URL } from '@/utils/constants'
import '@/components/Layout/Sidebar.css'

export default function HoriznPage() {
  const { yearMonth } = useParams()
  const navigate = useNavigate()

  // 验证 yearMonth 格式（YYYYMM）
  if (!yearMonth || !/^\d{6}$/.test(yearMonth)) {
    return <Navigate to="/horizn" replace />
  }
  const [activeTab, setActiveTab] = useState('weekly')
  const [statusInfo, setStatusInfo] = useState(null)
  const [showAdminMenu, setShowAdminMenu] = useState(false)
  const [showMonthMenu, setShowMonthMenu] = useState(false)
  const [availableMonths, setAvailableMonths] = useState([])
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyCount, setCopyCount] = useState('20')
  const [copyMode, setCopyMode] = useState('rank') // 'rank' 或 'threshold'
  const [thresholdValue, setThresholdValue] = useState('4500') // 默认周活跃度阈值
  const [thresholdCompare, setThresholdCompare] = useState('gte') // 'gte' 大于等于, 'lte' 小于等于
  const [currentData, setCurrentData] = useState(null)
  const [manualFrameIndex, setManualFrameIndex] = useState(null) // 手动控制的帧索引（用于时间调整）
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
  const [copyShowValues, setCopyShowValues] = useState(true) // 复制名单时是否显示活跃度数值
  const [copyShowNewMark, setCopyShowNewMark] = useState(true) // 复制名单时是否显示新来标记

  // 长按处理
  const pressTimerRef = useRef(null)
  const intervalRef = useRef(null)
  const currentFrameRef = useRef(null) // 追踪当前帧索引

  // 响应式监听
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 同步 currentData 到 ref
  useEffect(() => {
    if (currentData?.currentFrameIndex !== undefined) {
      currentFrameRef.current = currentData.currentFrameIndex
    }
  }, [currentData?.currentFrameIndex])

  // 清理定时器
  const handlePressEnd = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // 通用长按处理函数 - 使用 Pointer Events 统一处理触摸和鼠标
  const handlePressStart = useCallback((e, action) => {
    // 清理之前的定时器
    handlePressEnd()

    // 立即执行一次
    action()

    // 延迟 300ms 后开始快速重复
    pressTimerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        action()
      }, 50) // 每 50ms 执行一次
    }, 300)
  }, [handlePressEnd])

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      handlePressEnd()
    }
  }, [handlePressEnd])

  // 根据当前 tab 和比较模式获取默认阈值
  const getDefaultThreshold = (compareMode = thresholdCompare) => {
    if (compareMode === 'lte') {
      // 小于等于模式的默认阈值
      return activeTab === 'weekly' ? '2500' : '7000'
    }
    // 大于等于模式的默认阈值
    return activeTab === 'weekly' ? '4500' : '50000'
  }

  // 根据当前 tab 获取阈值步进值
  const getThresholdStep = () => {
    return activeTab === 'weekly' ? 100 : 1000
  }

  // 检查是否有管理员权限
  const isAdmin = sessionStorage.getItem('horizn_admin_auth') === 'true'

  // 退出管理员
  const handleLogout = () => {
    sessionStorage.removeItem('horizn_admin_auth')
    setShowAdminMenu(false)
    window.location.reload()
  }

  // 跳转到指定月份
  const handleMonthSelect = (selectedYearMonth) => {
    setShowMonthMenu(false)
    if (selectedYearMonth !== yearMonth) {
      navigate(`/horizn/${selectedYearMonth}`)
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
    setThresholdCompare('gte') // 重置为大于等于
    setThresholdValue(getDefaultThreshold('gte')) // 打开时设置为当前 tab 的默认阈值
    setShowCopyModal(true)
  }

  // 获取当前显示的数据（直接使用 BarChartRace 的当前帧数据）
  const getSelectedData = () => {
    return currentData?.current
  }

  // 切换 tab 时更新阈值默认值
  useEffect(() => {
    setThresholdValue(getDefaultThreshold())
  }, [activeTab])

  // 格式化时间戳（从时间戳提取月日时分）
  const formatTimestamp = (timestamp) => {
    const now = new Date()
    const year = now.getFullYear()
    const match = timestamp.match(/(\d{2})-(\d{2}) (\d{2}:\d{2})/)
    if (match) {
      const [, month, day, time] = match
      return `${year}年${month}月${day}日${time}`
    }
    // 如果格式不匹配，返回原始时间戳
    return timestamp
  }

  // 格式化时间戳用于警告显示（仅显示月日时分）
  const formatTimestampShort = (timestamp) => {
    const now = new Date()
    const year = now.getFullYear()
    const match = timestamp.match(/(\d{2})-(\d{2}) (\d{2}:\d{2})/)
    if (match) {
      const [, month, day, time] = match
      return `${year}年${month}月${day}日 ${time}`
    }
    return timestamp
  }

  // 复制名单（兼容移动端）
  const handleCopyList = () => {
    const selectedData = getSelectedData()
    if (!selectedData || !selectedData.allData) return

    let selectedPlayers = []
    let title = ''
    const tabName = activeTab === 'weekly' ? '周活跃度' : '赛季活跃度'
    const formattedTime = formatTimestamp(selectedData.timestamp)

    if (copyMode === 'rank') {
      // 按名次模式
      const count = parseInt(copyCount) || 20
      selectedPlayers = selectedData.allData.slice(0, count)
      title = `${formattedTime} HORIZN地平线${tabName}前${count}名`
    } else {
      // 按阈值模式
      const threshold = parseInt(thresholdValue) || 0
      if (thresholdCompare === 'gte') {
        selectedPlayers = selectedData.allData.filter(player => player.value >= threshold)
        title = `${formattedTime} HORIZN地平线${tabName}≥${threshold}（共${selectedPlayers.length}人）`
      } else {
        selectedPlayers = selectedData.allData.filter(player => player.value <= threshold)
        title = `${formattedTime} HORIZN地平线${tabName}≤${threshold}（共${selectedPlayers.length}人）`
      }
    }

    // 构建名单
    const newMemberMap = currentData?.newMemberMap || {}
    const nameList = selectedPlayers.map((player, index) => {
      let line = `${index + 1}. ${player.name}`

      // 添加新来标记
      if (copyShowNewMark && newMemberMap[player.name]) {
        line += ` [N${newMemberMap[player.name]}]`
      }

      // 添加活跃度数值
      if (copyShowValues) {
        line += ` (${player.value})`
      }

      return line
    }).join('\n')

    // 组合最终文本
    const finalText = `${title}\n\n${nameList}`

    // 复制到剪贴板（带移动端兼容）
    const copyToClipboard = async (text) => {
      // 优先使用现代 Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text)
          return true
        } catch (err) {
          console.warn('Clipboard API 失败，尝试 fallback 方法:', err)
        }
      }

      // Fallback：使用传统的 execCommand 方法
      try {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        const successful = document.execCommand('copy')
        textArea.remove()

        if (successful) {
          return true
        }
        throw new Error('execCommand 复制失败')
      } catch (err) {
        console.error('Fallback 复制失败:', err)
        return false
      }
    }

    copyToClipboard(finalText).then(success => {
      if (success) {
        toast.success(`已复制 ${selectedPlayers.length} 位玩家的名单`, {
          duration: 2500,
          position: 'top-center',
          style: {
            background: '#10b981',
            color: '#fff',
            fontSize: isMobile ? '12px' : '14px',
            padding: isMobile ? '6px 12px' : '8px 16px',
            fontWeight: '500',
          },
        })
      } else {
        toast.error('复制失败，请重试', {
          duration: 2500,
          position: 'top-center',
          style: {
            fontSize: isMobile ? '12px' : '14px',
            padding: isMobile ? '6px 12px' : '8px 16px',
          },
        })
      }
    })
  }

  // 设置页面标题
  useEffect(() => {
    document.title = '地平线活跃度条形动画'
    return () => {
      document.title = '现代战舰抽奖模拟器' // 离开时恢复默认标题
    }
  }, [])

  // 加载可用的游戏月列表
  useEffect(() => {
    const fetchMonths = async () => {
      try {
        const months = await getAllHoriznMonths()
        setAvailableMonths(months)
      } catch (error) {
        console.error('Failed to load available months:', error)
      }
    }
    fetchMonths()
  }, [])

  // 切换标签时重置状态信息（避免显示旧标签页的状态）
  useEffect(() => {
    setStatusInfo(null)
  }, [activeTab])

  // 动态构建 CSV 路径（useMemo 缓存，避免切换标签时重新创建导致组件重新挂载）
  const tabs = useMemo(() => [
    { id: 'weekly', name: '周活跃度', csvPath: buildHoriznWeeklyCsvPath(yearMonth) },
    { id: 'season', name: '赛季活跃度', csvPath: buildHoriznSeasonCsvPath(yearMonth) }
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
                            <span>复制名单</span>
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
                  <span className="hidden sm:inline text-gray-600">|</span>
                </>
              )}

              {statusInfo ? (
                <>
                  {/* 桌面端：完整信息 */}
                  <span className="hidden md:inline">
                    数据更新于：<span className="text-gray-300">{statusInfo.timeElapsedText}</span>
                  </span>
                  <span className="hidden md:inline text-gray-600">|</span>

                  {/* 模式标识 */}
                  <span className="hidden sm:inline">
                    {statusInfo.isNightMode ? '🌙 夜间（每1小时更新）' : '☀️ 白天（每10分钟更新）'}
                  </span>
                  <span className="sm:hidden">
                    {statusInfo.isNightMode ? '🌙' : '☀️'}
                  </span>

                  <span className="hidden sm:inline text-gray-600">|</span>

                  {/* 倒计时 */}
                  {statusInfo.remainingSeconds > 0 ? (
                    <span className="whitespace-nowrap">
                      下次更新：<span className="text-gray-300">{statusInfo.remainingText}</span>
                    </span>
                  ) : (
                    <span className="text-yellow-400">刷新中</span>
                  )}
                </>
              ) : (
                /* 加载中状态 */
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-400">加载中...</span>
                </div>
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
          onStatusUpdate={setStatusInfo}
          onDataUpdate={setCurrentData}
          showValues={isAdmin}
          externalFrameIndex={manualFrameIndex}
        />
      </div>

      {/* 复制名单弹窗 */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className={`bg-gray-800/95 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl w-full max-w-md overflow-hidden ${isMobile ? 'select-none' : ''}`}>
            {/* 顶部装饰条 */}
            <div className="h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

            {/* 标题栏 */}
            <div className="px-4 sm:px-5 py-3 border-b border-gray-700/50 flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-1.5">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>复制名单</span>
              </h3>
              <button
                onClick={() => {
                  setShowCopyModal(false)
                  setCopyCount('20')
                  setCopyMode('rank')
                  setThresholdCompare('gte')
                  setThresholdValue(getDefaultThreshold('gte'))
                  setManualFrameIndex(null) // 恢复自动播放
                }}
                className="text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg p-1 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 内容区 */}
            <div className="px-4 sm:px-5 py-4 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide">
                    筛选模式
                  </label>
                  {/* 显示选项勾选框 */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={copyShowValues}
                        onChange={(e) => setCopyShowValues(e.target.checked)}
                        className="w-3 h-3 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500/30 focus:ring-offset-0"
                      />
                      <span className="text-[10px] text-gray-400">数值</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={copyShowNewMark}
                        onChange={(e) => setCopyShowNewMark(e.target.checked)}
                        className="w-3 h-3 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500/30 focus:ring-offset-0"
                      />
                      <span className="text-[10px] text-gray-400">新来</span>
                    </label>
                  </div>
                </div>

                {/* 仅当不是最新帧时显示警告 */}
                {currentData && !currentData.isLatest && (
                  <div className="mb-2 text-xs text-yellow-400/80 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {formatTimestampShort(currentData.current.timestamp)}
                  </div>
                )}

                {/* 模式切换按钮 */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setCopyMode('rank')}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                      copyMode === 'rank'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                        : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    按名次
                  </button>
                  <button
                    onClick={() => setCopyMode('threshold')}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                      copyMode === 'threshold'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                        : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    按阈值
                  </button>
                </div>

                {/* 按名次模式 */}
                {copyMode === 'rank' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {/* 选择人数 */}
                      <div>
                        <label htmlFor="copyCount" className="block text-xs font-medium text-gray-400 mb-1">
                          人数
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            onPointerDown={(e) => handlePressStart(e, () => setCopyCount(prev => String(Math.max(5, parseInt(prev || 20) - 5))))}
                            onPointerUp={handlePressEnd}
                            onPointerLeave={handlePressEnd}
                            className="w-7 h-7 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 border border-gray-600 rounded-md transition-colors text-white font-medium text-sm select-none touch-none"
                          >
                            −
                          </button>
                          <input
                            id="copyCount"
                            type="number"
                            min="1"
                            max={getSelectedData()?.allData?.length || 100}
                            step="5"
                            value={copyCount}
                            onChange={(e) => setCopyCount(e.target.value)}
                            className="flex-1 h-7 px-2 bg-gray-700/50 text-white text-center text-xs font-semibold rounded-md border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onPointerDown={(e) => handlePressStart(e, () => setCopyCount(prev => String(Math.min(getSelectedData()?.allData?.length || 100, parseInt(prev || 20) + 5))))}
                            onPointerUp={handlePressEnd}
                            onPointerLeave={handlePressEnd}
                            className="w-7 h-7 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 border border-gray-600 rounded-md transition-colors text-white font-medium text-sm select-none touch-none"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* 选择时间 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          时间
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            onPointerDown={(e) => {
                              if ((currentData?.currentFrameIndex ?? 0) <= 0) return
                              handlePressStart(e, () => {
                                const newIndex = Math.max(0, (currentFrameRef.current ?? 0) - 1)
                                currentFrameRef.current = newIndex
                                setManualFrameIndex(newIndex)
                              })
                            }}
                            onPointerUp={handlePressEnd}
                            onPointerLeave={handlePressEnd}
                            disabled={(currentData?.currentFrameIndex ?? 0) <= 0}
                            className="w-7 h-7 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-600 rounded-md transition-colors text-white font-medium text-sm select-none touch-none"
                          >
                            ←
                          </button>
                          <div className="flex-1 h-7 px-2 bg-gray-700/50 text-white text-center text-xs font-semibold rounded-md border border-gray-600 flex items-center justify-center truncate select-none">
                            {currentData?.current?.timestamp?.split(' ')[1] || '--:--'}
                          </div>
                          <button
                            onPointerDown={(e) => {
                              if ((currentData?.currentFrameIndex ?? 0) >= (currentData?.allTimestamps?.length || 1) - 1) return
                              handlePressStart(e, () => {
                                const maxIndex = (currentData?.allTimestamps?.length || 1) - 1
                                const newIndex = Math.min(maxIndex, (currentFrameRef.current ?? 0) + 1)
                                currentFrameRef.current = newIndex
                                setManualFrameIndex(newIndex)
                              })
                            }}
                            onPointerUp={handlePressEnd}
                            onPointerLeave={handlePressEnd}
                            disabled={(currentData?.currentFrameIndex ?? 0) >= (currentData?.allTimestamps?.length || 1) - 1}
                            className="w-7 h-7 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-600 rounded-md transition-colors text-white font-medium text-sm select-none touch-none"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500 text-center">
                      共 <span className="text-blue-400 font-medium">{getSelectedData()?.allData?.length || 0}</span> 人 ·
                      时间戳 <span className="text-blue-400 font-medium">{(currentData?.currentFrameIndex ?? 0) + 1}/{currentData?.allTimestamps?.length || 0}</span>
                    </p>
                  </>
                )}

                {/* 按阈值模式 */}
                {copyMode === 'threshold' && (
                  <>
                    <div className="grid grid-cols-[1fr_1.5fr_1.5fr] gap-2">
                      {/* 比较模式 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          条件
                        </label>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => {
                              setThresholdCompare('gte')
                              setThresholdValue(getDefaultThreshold('gte'))
                            }}
                            className={`flex-1 h-7 flex items-center justify-center rounded-l-md border text-xs font-medium transition-all ${
                              thresholdCompare === 'gte'
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:bg-gray-600'
                            }`}
                          >
                            ≥
                          </button>
                          <button
                            onClick={() => {
                              setThresholdCompare('lte')
                              setThresholdValue(getDefaultThreshold('lte'))
                            }}
                            className={`flex-1 h-7 flex items-center justify-center rounded-r-md border-t border-b border-r text-xs font-medium transition-all ${
                              thresholdCompare === 'lte'
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:bg-gray-600'
                            }`}
                          >
                            ≤
                          </button>
                        </div>
                      </div>

                      {/* 活跃度阈值 */}
                      <div className="overflow-hidden">
                        <label htmlFor="thresholdValue" className="block text-xs font-medium text-gray-400 mb-1">
                          阈值
                        </label>
                        <div className="flex items-center gap-0.5">
                          <button
                            onPointerDown={(e) => handlePressStart(e, () => setThresholdValue(prev => String(Math.max(0, parseInt(prev || getDefaultThreshold()) - getThresholdStep()))))}
                            onPointerUp={handlePressEnd}
                            onPointerLeave={handlePressEnd}
                            className="w-6 h-7 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 border border-gray-600 rounded-md transition-colors text-white font-medium text-sm select-none touch-none"
                          >
                            −
                          </button>
                          <input
                            id="thresholdValue"
                            type="number"
                            min="0"
                            step={getThresholdStep()}
                            value={thresholdValue}
                            onChange={(e) => setThresholdValue(e.target.value)}
                            className="flex-1 min-w-0 h-7 px-1 bg-gray-700/50 text-white text-center text-xs font-semibold rounded-md border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onPointerDown={(e) => handlePressStart(e, () => setThresholdValue(prev => String(parseInt(prev || getDefaultThreshold()) + getThresholdStep())))}
                            onPointerUp={handlePressEnd}
                            onPointerLeave={handlePressEnd}
                            className="w-6 h-7 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 border border-gray-600 rounded-md transition-colors text-white font-medium text-sm select-none touch-none"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* 选择时间 */}
                      <div className="overflow-hidden">
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          时间
                        </label>
                        <div className="flex items-center gap-0.5">
                          <button
                            onPointerDown={(e) => {
                              if ((currentData?.currentFrameIndex ?? 0) <= 0) return
                              handlePressStart(e, () => {
                                const newIndex = Math.max(0, (currentFrameRef.current ?? 0) - 1)
                                currentFrameRef.current = newIndex
                                setManualFrameIndex(newIndex)
                              })
                            }}
                            onPointerUp={handlePressEnd}
                            onPointerLeave={handlePressEnd}
                            disabled={(currentData?.currentFrameIndex ?? 0) <= 0}
                            className="w-6 h-7 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-600 rounded-md transition-colors text-white font-medium text-sm select-none touch-none"
                          >
                            ←
                          </button>
                          <div className="flex-1 min-w-0 h-7 px-1 bg-gray-700/50 text-white text-center text-xs font-semibold rounded-md border border-gray-600 flex items-center justify-center truncate select-none">
                            {currentData?.current?.timestamp?.split(' ')[1] || '--:--'}
                          </div>
                          <button
                            onPointerDown={(e) => {
                              if ((currentData?.currentFrameIndex ?? 0) >= (currentData?.allTimestamps?.length || 1) - 1) return
                              handlePressStart(e, () => {
                                const maxIndex = (currentData?.allTimestamps?.length || 1) - 1
                                const newIndex = Math.min(maxIndex, (currentFrameRef.current ?? 0) + 1)
                                currentFrameRef.current = newIndex
                                setManualFrameIndex(newIndex)
                              })
                            }}
                            onPointerUp={handlePressEnd}
                            onPointerLeave={handlePressEnd}
                            disabled={(currentData?.currentFrameIndex ?? 0) >= (currentData?.allTimestamps?.length || 1) - 1}
                            className="w-6 h-7 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-600 rounded-md transition-colors text-white font-medium text-sm select-none touch-none"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500 text-center">
                      {getSelectedData() && (
                        <>
                          符合条件：<span className="text-blue-400 font-medium">
                            {getSelectedData().allData.filter(p =>
                              thresholdCompare === 'gte'
                                ? p.value >= (parseInt(thresholdValue) || 0)
                                : p.value <= (parseInt(thresholdValue) || 0)
                            ).length}
                          </span> 人 ·
                          时间戳 <span className="text-blue-400 font-medium">{(currentData?.currentFrameIndex ?? 0) + 1}/{currentData?.allTimestamps?.length || 0}</span>
                        </>
                      )}
                    </p>
                  </>
                )}
              </div>

              {/* 预览 */}
              {getSelectedData() && (
                <div className="bg-gray-900/50 rounded-lg p-2.5 border border-gray-700/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">预览</p>
                    <span className="text-xs text-gray-500 font-mono">
                      {copyMode === 'rank'
                        ? `前 ${parseInt(copyCount) || 20} 名`
                        : `${thresholdCompare === 'gte' ? '≥' : '≤'}${parseInt(thresholdValue) || 0}`
                      }
                    </span>
                  </div>
                  <div className={`text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-40 sm:max-h-52 overflow-y-auto custom-scrollbar ${!isMobile ? 'select-text' : ''}`}>
                    {(() => {
                      const selectedData = getSelectedData()
                      const tabName = activeTab === 'weekly' ? '周活跃度' : '赛季活跃度'
                      const formattedTime = formatTimestamp(selectedData.timestamp)

                      let selectedPlayers = []
                      let title = ''

                      if (copyMode === 'rank') {
                        const count = parseInt(copyCount) || 20
                        selectedPlayers = selectedData.allData.slice(0, count)
                        title = `${formattedTime} HORIZN地平线${tabName}前${count}名`
                      } else {
                        const threshold = parseInt(thresholdValue) || 0
                        if (thresholdCompare === 'gte') {
                          selectedPlayers = selectedData.allData.filter(p => p.value >= threshold)
                          title = `${formattedTime} HORIZN地平线${tabName}≥${threshold}（共${selectedPlayers.length}人）`
                        } else {
                          selectedPlayers = selectedData.allData.filter(p => p.value <= threshold)
                          title = `${formattedTime} HORIZN地平线${tabName}≤${threshold}（共${selectedPlayers.length}人）`
                        }
                      }

                      const newMemberMap = currentData?.newMemberMap || {}
                      const nameList = selectedPlayers.map((p, i) => {
                        let line = `${i + 1}. ${p.name}`

                        // 添加新来标记
                        if (copyShowNewMark && newMemberMap[p.name]) {
                          line += ` [N${newMemberMap[p.name]}]`
                        }

                        // 添加活跃度数值
                        if (copyShowValues) {
                          line += ` (${p.value})`
                        }

                        return line
                      }).join('\n')

                      return `${title}\n\n${nameList}`
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="px-4 sm:px-5 py-3 bg-gray-900/30 border-t border-gray-700/50 flex gap-2">
              <button
                onClick={() => {
                  setShowCopyModal(false)
                  setCopyCount('20')
                  setCopyMode('rank')
                  setThresholdCompare('gte')
                  setThresholdValue(getDefaultThreshold('gte'))
                  setManualFrameIndex(null) // 恢复自动播放
                }}
                className="flex-1 px-3 py-2 bg-gray-700/50 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCopyList}
                disabled={
                  !currentData ||
                  (copyMode === 'rank' && (!copyCount || parseInt(copyCount) <= 0)) ||
                  (copyMode === 'threshold' && thresholdValue === '')
                }
                className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-md shadow-blue-500/20 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>复制</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
