import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { getMonthlyMembershipEvents, markEventKicked } from '@/services/horiznSupabase'

/**
 * 成员入离队细目弹窗组件
 */
export default function MemberEventsModal({
  show,
  onClose,
  isMobile,
  isAdmin = false
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [events, setEvents] = useState([])
  const [filterType, setFilterType] = useState('all') // 'all' | 'join' | 'leave'

  // 月份选择
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)

  // 加载数据
  const loadEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getMonthlyMembershipEvents(selectedYear, selectedMonth)
      setEvents(data)
    } catch (err) {
      console.error('Failed to load events:', err)
      setError(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 弹窗打开或月份变化时加载数据
  useEffect(() => {
    if (show) {
      loadEvents()
    }
  }, [show, selectedYear, selectedMonth])

  // 按日期分组
  const groupedEvents = useMemo(() => {
    let filtered = events
    if (filterType === 'join') {
      filtered = events.filter(e => e.eventType === 'join')
    } else if (filterType === 'leave') {
      filtered = events.filter(e => e.eventType === 'leave')
    }

    // 按日期分组
    const groups = {}
    filtered.forEach(event => {
      const date = new Date(event.eventTime)
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      if (!groups[dateKey]) {
        groups[dateKey] = { date: dateKey, events: [] }
      }
      groups[dateKey].events.push(event)
    })

    // 按日期排序（降序）
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date))
  }, [events, filterType])

  // 统计
  const stats = useMemo(() => {
    const joins = events.filter(e => e.eventType === 'join').length
    const leaves = events.filter(e => e.eventType === 'leave').length
    const kicked = events.filter(e => e.eventType === 'leave' && e.isKicked).length
    return { joins, leaves, kicked }
  }, [events])

  // 格式化时间
  const formatTime = (isoDate) => {
    const date = new Date(isoDate)
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  // 格式化日期显示
  const formatDateDisplay = (dateStr) => {
    const [y, m, d] = dateStr.split('-')
    return `${parseInt(m)}.${parseInt(d)}`
  }

  // 切换踢出标记
  const handleToggleKicked = async (event) => {
    if (!isAdmin) return

    const newKicked = !event.isKicked
    const result = await markEventKicked(event.id, newKicked)

    if (result.success) {
      setEvents(prev => prev.map(e =>
        e.id === event.id ? { ...e, isKicked: newKicked } : e
      ))
      toast.success(newKicked ? '已标记为踢出' : '已取消踢出标记', { duration: 1500 })
    } else {
      toast.error('操作失败')
    }
  }

  // 复制 playerId
  const handleCopyPlayerId = (playerId) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(playerId)
        .then(() => toast.success('已复制 ID', { duration: 1500 }))
        .catch(() => toast.error('复制失败'))
    }
  }

  // 复制 QQ 号
  const handleCopyQQ = (qqId) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(String(qqId))
        .then(() => toast.success('已复制 QQ 号', { duration: 1500 }))
        .catch(() => toast.error('复制失败'))
    }
  }

  // 复制为表格格式（TSV）
  const handleCopyAsTable = () => {
    if (groupedEvents.length === 0) {
      toast.error('没有数据可复制')
      return
    }

    // 构建 TSV 格式（Tab分隔）
    const lines = []
    // 表头
    lines.push(['日期', '时间', '类型', '成员名', 'ID', 'QQ号', '编号', '备注'].join('\t'))

    // 数据行
    groupedEvents.forEach(group => {
      group.events.forEach(event => {
        // 将日期格式化为 "x月x日"，避免 Excel 识别为小数
        const [y, m, d] = group.date.split('-')
        const date = `${parseInt(m)}月${parseInt(d)}日`
        const time = formatTime(event.eventTime)
        const type = event.eventType === 'join' ? '入队' : '离队'
        const name = event.memberName
        const id = event.playerId
        const qq = event.qqId || ''
        const number = event.memberNumber || ''
        const remark = (event.eventType === 'leave' && event.isKicked) ? '踢出' : ''

        lines.push([date, time, type, name, id, qq, number, remark].join('\t'))
      })
    })

    const tsvContent = lines.join('\n')

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsvContent)
        .then(() => toast.success(`已复制 ${groupedEvents.reduce((sum, g) => sum + g.events.length, 0)} 条记录`, { duration: 2000 }))
        .catch(() => toast.error('复制失败'))
    }
  }

  // 月份切换
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(y => y - 1)
      setSelectedMonth(12)
    } else {
      setSelectedMonth(m => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(y => y + 1)
      setSelectedMonth(1)
    } else {
      setSelectedMonth(m => m + 1)
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className={`bg-gray-800/95 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl w-full max-w-md overflow-hidden ${isMobile ? 'select-none' : ''}`}>
        {/* 顶部装饰条 */}
        <div className="h-0.5 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500"></div>

        {/* 标题栏 */}
        <div className="px-3 py-2 border-b border-gray-700/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            成员入离队细目
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={loadEvents}
              disabled={loading}
              className="text-[10px] text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {loading ? '...' : '刷新'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-700/50 rounded p-0.5 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="px-3 py-2 space-y-2">
          {/* 月份选择器 */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevMonth}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm text-white font-medium">
              {selectedYear}年{selectedMonth}月
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 筛选标签 + 统计 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              {[
                { key: 'all', label: '全部' },
                { key: 'join', label: `入队(${stats.joins})`, color: 'green' },
                { key: 'leave', label: `离队(${stats.leaves})`, color: 'red' }
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => setFilterType(key)}
                  className={`px-1.5 py-0.5 text-[10px] rounded transition-all ${
                    filterType === key
                      ? color === 'green'
                        ? 'bg-green-600/30 text-green-400'
                        : color === 'red'
                          ? 'bg-red-600/30 text-red-400'
                          : 'bg-gray-600/50 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {stats.kicked > 0 && (
              <span className="text-[10px] text-yellow-400">
                踢出 {stats.kicked}
              </span>
            )}
          </div>

          {/* 事件列表 */}
          <div className="bg-gray-900/50 rounded border border-gray-700/50 overflow-hidden">
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                </div>
              ) : error ? (
                <div className="text-center py-6 text-red-400 text-xs">{error}</div>
              ) : groupedEvents.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs">
                  本月暂无入离队记录
                </div>
              ) : (
                <div className="divide-y divide-gray-700/30">
                  {groupedEvents.map(group => (
                    <div key={group.date} className="py-1">
                      {/* 日期标题 */}
                      <div className="px-2 py-1 bg-gray-800/50 sticky top-0">
                        <span className="text-[10px] text-gray-400 font-medium">
                          {formatDateDisplay(group.date)}
                        </span>
                        <span className="text-[10px] text-gray-600 ml-2">
                          {group.events.length} 条
                        </span>
                      </div>
                      {/* 当天事件 */}
                      <div className="divide-y divide-gray-800/50">
                        {group.events.map(event => (
                          <div
                            key={event.id}
                            className={`px-2 py-1.5 hover:bg-gray-800/30 transition-colors ${
                              event.isKicked ? 'bg-red-900/10' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              {/* 左侧：时间 + 类型 + 名字 */}
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span className="text-[10px] text-gray-500 font-mono w-10 flex-shrink-0">
                                  {formatTime(event.eventTime)}
                                </span>
                                <span className={`text-[10px] px-1 py-0.5 rounded flex-shrink-0 ${
                                  event.eventType === 'join'
                                    ? 'bg-green-600/20 text-green-400'
                                    : 'bg-red-600/20 text-red-400'
                                }`}>
                                  {event.eventType === 'join' ? '入' : '离'}
                                </span>
                                <span className="text-xs text-white truncate">
                                  {event.memberName}
                                </span>
                                {/* 复制 ID 按钮 + ID */}
                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                  <button
                                    onClick={() => handleCopyPlayerId(event.playerId)}
                                    className="p-0.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/20 rounded transition-all"
                                    title="复制 ID"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                  <span className="text-[10px] text-gray-500 font-mono">
                                    {event.playerId}
                                  </span>
                                </div>
                                {/* 复制 QQ 号按钮 + QQ（仅有QQ时显示） */}
                                {event.qqId && (
                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <button
                                      onClick={() => handleCopyQQ(event.qqId)}
                                      className="p-0.5 text-gray-500 hover:text-green-400 hover:bg-green-500/20 rounded transition-all"
                                      title="复制 QQ 号"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    </button>
                                    <span className="text-[10px] text-green-400 font-mono">
                                      QQ
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* 右侧：踢出标记/按钮 */}
                              {event.eventType === 'leave' && (
                                <div className="flex-shrink-0">
                                  {isAdmin ? (
                                    <button
                                      onClick={() => handleToggleKicked(event)}
                                      className={`text-[10px] px-1.5 py-0.5 rounded transition-all ${
                                        event.isKicked
                                          ? 'bg-yellow-600/30 text-yellow-400 hover:bg-yellow-600/50'
                                          : 'bg-gray-700/30 text-gray-500 hover:bg-gray-700/50 hover:text-gray-300'
                                      }`}
                                    >
                                      {event.isKicked ? '踢出' : '标记'}
                                    </button>
                                  ) : (
                                    event.isKicked && (
                                      <span className="text-[10px] px-1.5 py-0.5 bg-yellow-600/20 text-yellow-400 rounded">
                                        踢出
                                      </span>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-3 py-2 bg-gray-900/30 border-t border-gray-700/50 flex gap-2">
          <button
            onClick={handleCopyAsTable}
            disabled={groupedEvents.length === 0}
            className="flex-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-white text-xs font-semibold rounded shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            复制为表格
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600 text-white text-xs font-medium rounded transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
