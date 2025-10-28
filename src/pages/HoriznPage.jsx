import { useState, useEffect } from 'react'
import BarChartRace from '@/components/Horizn/BarChartRace'
import { buildHoriznWeeklyCsvPath, buildHoriznSeasonCsvPath } from '@/services/cdnService'
import '@/components/Layout/Sidebar.css'

export default function HoriznPage() {
  const [activeTab, setActiveTab] = useState('weekly')
  const [statusInfo, setStatusInfo] = useState(null)

  // 设置页面标题
  useEffect(() => {
    document.title = '地平线活跃度条形动画'
    return () => {
      document.title = '现代战舰抽奖模拟器' // 离开时恢复默认标题
    }
  }, [])

  // 动态构建 CSV 路径
  const tabs = [
    { id: 'weekly', name: '周活跃度', csvPath: buildHoriznWeeklyCsvPath() },
    { id: 'season', name: '赛季活跃度', csvPath: buildHoriznSeasonCsvPath() }
  ]

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

            {/* 右侧：状态信息 */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 text-[10px] sm:text-xs text-gray-400 pr-1 sm:pr-2">
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
        />
      </div>
    </div>
  )
}
