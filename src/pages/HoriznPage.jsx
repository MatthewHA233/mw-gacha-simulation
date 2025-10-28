import { useState, useEffect, useMemo } from 'react'
import { ShieldCheck } from 'lucide-react'
import BarChartRace from '@/components/Horizn/BarChartRace'
import { buildHoriznWeeklyCsvPath, buildHoriznSeasonCsvPath } from '@/services/cdnService'
import '@/components/Layout/Sidebar.css'

export default function HoriznPage() {
  const [activeTab, setActiveTab] = useState('weekly')
  const [statusInfo, setStatusInfo] = useState(null)
  const [showAdminMenu, setShowAdminMenu] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyCount, setCopyCount] = useState('20')
  const [currentData, setCurrentData] = useState(null)

  // 检查是否有管理员权限
  const isAdmin = sessionStorage.getItem('horizn_admin_auth') === 'true'

  // 退出管理员
  const handleLogout = () => {
    sessionStorage.removeItem('horizn_admin_auth')
    setShowAdminMenu(false)
    window.location.reload()
  }

  // 打开复制名单弹窗
  const handleOpenCopyModal = () => {
    setShowAdminMenu(false)
    setShowCopyModal(true)
  }

  // 格式化时间戳（年月日用当天，时分用数据时间）
  const formatTimestamp = (timestamp) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const time = timestamp.split(' ')[1] || timestamp
    return `${year}年${month}月${day}日${time}`
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

  // 复制名单
  const handleCopyList = () => {
    if (!currentData || !currentData.current || !currentData.current.allData) return

    const count = parseInt(copyCount) || 20
    const topPlayers = currentData.current.allData.slice(0, count)

    // 构建标题
    const tabName = activeTab === 'weekly' ? '周活跃度' : '赛季活跃度'
    const formattedTime = formatTimestamp(currentData.current.timestamp)
    const title = `${formattedTime} HORIZN地平线${tabName}前${count}名`

    // 构建名单
    const nameList = topPlayers.map((player, index) => {
      return `${index + 1}. ${player.name}`
    }).join('\n')

    // 组合最终文本
    const finalText = `${title}\n\n${nameList}`

    // 复制到剪贴板
    navigator.clipboard.writeText(finalText).then(() => {
      alert('名单已复制到剪贴板！')
      setShowCopyModal(false)
      setCopyCount('20')
    }).catch(err => {
      console.error('复制失败:', err)
      alert('复制失败，请重试')
    })
  }

  // 设置页面标题
  useEffect(() => {
    document.title = '地平线活跃度条形动画'
    return () => {
      document.title = '现代战舰抽奖模拟器' // 离开时恢复默认标题
    }
  }, [])

  // 切换标签时重置状态信息（避免显示旧标签页的状态）
  useEffect(() => {
    setStatusInfo(null)
  }, [activeTab])

  // 动态构建 CSV 路径（useMemo 缓存，避免切换标签时重新创建导致组件重新挂载）
  const tabs = useMemo(() => [
    { id: 'weekly', name: '周活跃度', csvPath: buildHoriznWeeklyCsvPath() },
    { id: 'season', name: '赛季活跃度', csvPath: buildHoriznSeasonCsvPath() }
  ], [])

  const currentTab = tabs.find(tab => tab.id === activeTab)

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-gray-900 to-black">
      {/* 标签页导航 + 状态栏 */}
      <div className="flex-shrink-0 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            {/* 左侧：联队logo + 标签页 */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              {/* 联队logo */}
              <img
                src="/horizn.png"
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

            {/* 右侧：管理员标识 + 状态信息 */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 text-[10px] sm:text-xs text-gray-400 pr-1 sm:pr-2">
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
                        <div className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-20 min-w-[140px]">
                          <button
                            onClick={handleOpenCopyModal}
                            className="w-full px-4 py-2 text-left text-sm text-blue-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>复制名单</span>
                          </button>
                          <div className="border-t border-gray-700"></div>
                          <button
                            onClick={handleLogout}
                            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        />
      </div>

      {/* 复制名单弹窗 */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-gray-800/95 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl w-full max-w-lg overflow-hidden">
            {/* 顶部装饰条 */}
            <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

            {/* 标题栏 */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-700/50 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>复制名单</span>
              </h3>
              <button
                onClick={() => {
                  setShowCopyModal(false)
                  setCopyCount('20')
                }}
                className="text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg p-1 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 内容区 */}
            <div className="px-4 sm:px-6 py-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="copyCount" className="block text-sm font-medium text-gray-300">
                    选择复制人数
                  </label>
                  {/* 仅当不是最新帧时显示警告 */}
                  {currentData && !currentData.isLatest && (
                    <span className="text-xs text-yellow-400/80 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {formatTimestampShort(currentData.current.timestamp)}
                    </span>
                  )}
                </div>

                {/* 数字输入框 + 加减按钮 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCopyCount(String(Math.max(5, parseInt(copyCount || 20) - 5)))}
                    className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 border border-gray-600 rounded-xl transition-colors text-white font-bold text-lg"
                  >
                    −
                  </button>

                  <input
                    id="copyCount"
                    type="number"
                    min="1"
                    max={currentData?.current?.allData?.length || 100}
                    step="5"
                    value={copyCount}
                    onChange={(e) => setCopyCount(e.target.value)}
                    className="flex-1 px-4 py-2.5 sm:py-3 bg-gray-700/50 text-white text-center text-lg font-semibold rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  <button
                    onClick={() => setCopyCount(String(Math.min(currentData?.current?.allData?.length || 100, parseInt(copyCount || 20) + 5)))}
                    className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 border border-gray-600 rounded-xl transition-colors text-white font-bold text-lg"
                  >
                    +
                  </button>
                </div>

                <p className="mt-2 text-xs sm:text-sm text-gray-400 text-center">
                  当前共有 <span className="text-blue-400 font-semibold">{currentData?.current?.allData?.length || 0}</span> 名队员
                </p>
              </div>

              {/* 预览 */}
              {copyCount && parseInt(copyCount) > 0 && currentData && currentData.current && (
                <div className="bg-gray-900/50 rounded-xl p-3 sm:p-4 border border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs sm:text-sm text-gray-400 font-medium">复制预览</p>
                    <span className="text-xs text-gray-500">前 {parseInt(copyCount)} 名</span>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-300 font-mono whitespace-pre-wrap max-h-48 sm:max-h-64 overflow-y-auto custom-scrollbar">
                    {(() => {
                      const count = parseInt(copyCount) || 20
                      const tabName = activeTab === 'weekly' ? '周活跃度' : '赛季活跃度'
                      const formattedTime = formatTimestamp(currentData.current.timestamp)
                      return `${formattedTime} HORIZN地平线${tabName}前${count}名\n\n${currentData.current.allData.slice(0, count).map((p, i) => `${i + 1}. ${p.name}`).join('\n')}`
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="px-4 sm:px-6 py-4 bg-gray-900/30 border-t border-gray-700/50 flex gap-3">
              <button
                onClick={() => {
                  setShowCopyModal(false)
                  setCopyCount('20')
                }}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-gray-700/50 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCopyList}
                disabled={!copyCount || parseInt(copyCount) <= 0}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>复制到剪贴板</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
