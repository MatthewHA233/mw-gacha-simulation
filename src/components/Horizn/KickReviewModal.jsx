import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { getKickedMembers } from '@/services/horiznSupabase'

/**
 * 踢出审核回归弹窗组件
 * 用于审核被踢出人员的回队资格（踢出30天后可重新入队）
 */
export default function KickReviewModal({
  show,
  onClose,
  isMobile
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [kickedMembers, setKickedMembers] = useState([])
  const [filterMode, setFilterMode] = useState('all') // 'all' | 'canRejoin' | 'waiting' | 'rejoined'

  // 加载被踢出的成员数据
  const loadKickedMembers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getKickedMembers()
      setKickedMembers(data)
    } catch (err) {
      console.error('Failed to load kicked members:', err)
      setError(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 弹窗打开时加载数据
  useEffect(() => {
    if (show) {
      loadKickedMembers()
    }
  }, [show])

  // 根据筛选模式过滤数据
  const filteredMembers = useMemo(() => {
    if (filterMode === 'canRejoin') {
      return kickedMembers.filter(m => m.canRejoin && !m.hasRejoined)
    } else if (filterMode === 'waiting') {
      return kickedMembers.filter(m => !m.canRejoin && !m.hasRejoined)
    } else if (filterMode === 'rejoined') {
      return kickedMembers.filter(m => m.hasRejoined)
    }
    return kickedMembers
  }, [kickedMembers, filterMode])

  // 统计信息
  const stats = useMemo(() => {
    const total = kickedMembers.length
    const rejoined = kickedMembers.filter(m => m.hasRejoined).length
    const canRejoin = kickedMembers.filter(m => m.canRejoin && !m.hasRejoined).length
    const waiting = kickedMembers.filter(m => !m.canRejoin && !m.hasRejoined).length
    return { total, canRejoin, waiting, rejoined }
  }, [kickedMembers])

  // 格式化日期（紧凑）
  const formatDate = (isoDate) => {
    const date = new Date(isoDate)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  // 复制 playerId
  const handleCopyPlayerId = (playerId) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(playerId)
        .then(() => toast.success('已复制 ID', { duration: 1500 }))
        .catch(() => toast.error('复制失败'))
    }
  }

  // 复制清单
  const handleCopyList = () => {
    if (filteredMembers.length === 0) {
      toast.error('没有可复制的数据')
      return
    }

    const title = '【HORIZN】踢出审核回归'
    const lines = filteredMembers.map((m, i) => {
      let status = m.hasRejoined ? `提前${m.earlyRejoinDays}天归队` : (m.canRejoin ? '可回队' : `还需${m.daysUntilRejoin}天`)
      return `${i + 1}. ${m.memberName} | ${m.playerId} | ${status}`
    })

    const text = `${title}\n${lines.join('\n')}`

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => toast.success(`已复制 ${filteredMembers.length} 人`))
        .catch(() => toast.error('复制失败'))
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className={`bg-gray-800/95 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl w-full max-w-md overflow-hidden ${isMobile ? 'select-none' : ''}`}>
        {/* 顶部装饰条 */}
        <div className="h-0.5 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"></div>

        {/* 标题栏 */}
        <div className="px-3 py-2 border-b border-gray-700/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            踢出审核回归
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={loadKickedMembers}
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
          {/* 筛选标签 + 统计 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1 flex-wrap">
              {[
                { key: 'all', label: `全部(${stats.total})` },
                { key: 'waiting', label: `等待(${stats.waiting})`, color: 'yellow' },
                { key: 'canRejoin', label: `可回(${stats.canRejoin})`, color: 'green' },
                { key: 'rejoined', label: `提前已归(${stats.rejoined})`, color: 'blue' }
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => setFilterMode(key)}
                  className={`px-1.5 py-0.5 text-[10px] rounded transition-all ${
                    filterMode === key
                      ? color === 'green'
                        ? 'bg-green-600/30 text-green-400'
                        : color === 'yellow'
                          ? 'bg-yellow-600/30 text-yellow-400'
                          : color === 'blue'
                            ? 'bg-blue-600/30 text-blue-400'
                            : 'bg-gray-600/50 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 规则提示 */}
          <div className="text-[10px] text-gray-500 bg-gray-900/30 rounded px-2 py-1">
            踢出后 <span className="text-yellow-400">30天</span> 可重新入队
          </div>

          {/* 成员列表 */}
          <div className="bg-gray-900/50 rounded border border-gray-700/50 overflow-hidden">
            <div className="max-h-72 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                </div>
              ) : error ? (
                <div className="text-center py-6 text-red-400 text-xs">{error}</div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs">
                  {kickedMembers.length === 0 ? '暂无踢出记录' : '无匹配数据'}
                </div>
              ) : (
                <div className="divide-y divide-gray-700/30">
                  {filteredMembers.map((member, index) => (
                    <div
                      key={member.id}
                      className={`px-2 py-1.5 hover:bg-gray-800/50 transition-colors group ${
                        member.hasRejoined ? 'opacity-60' : ''
                      }`}
                    >
                      {/* 主行：序号 + 名字 + ID复制 + 状态 */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-[10px] text-gray-600 w-4 flex-shrink-0">{index + 1}</span>
                          <span className="text-xs text-white truncate">{member.memberName}</span>
                          {/* 复制按钮 + ID */}
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button
                              onClick={() => handleCopyPlayerId(member.playerId)}
                              className="p-0.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/20 rounded transition-all"
                              title="复制 ID"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <span className="text-[10px] text-gray-500 font-mono">{member.playerId}</span>
                          </div>
                        </div>

                        {/* 状态标签 */}
                        <div className="flex-shrink-0">
                          {member.hasRejoined ? (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded">
                              提前{member.earlyRejoinDays}天
                            </span>
                          ) : member.canRejoin ? (
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-600/20 text-green-400 rounded">
                              可回队
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-600/20 text-yellow-400 rounded">
                              {member.daysUntilRejoin}天
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 副行：时间信息 */}
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 pl-5 mt-0.5">
                        <span>踢出 <span className="text-red-400">{formatDate(member.kickedAt)}</span></span>
                        <span>→</span>
                        <span>可回 <span className={member.canRejoin ? 'text-green-400' : 'text-gray-400'}>{formatDate(member.rejoinAllowedAt)}</span></span>
                        {member.hasRejoined && (
                          <>
                            <span>|</span>
                            <span>归队 <span className="text-blue-400">{formatDate(member.rejoinedAt)}</span></span>
                          </>
                        )}
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
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600 text-white text-xs font-medium rounded transition-colors"
          >
            关闭
          </button>
          <button
            onClick={handleCopyList}
            disabled={filteredMembers.length === 0}
            className="flex-1 px-3 py-1.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-white text-xs font-semibold rounded shadow-md transition-all flex items-center justify-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            复制清单
          </button>
        </div>
      </div>
    </div>
  )
}
