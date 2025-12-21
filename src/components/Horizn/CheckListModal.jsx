import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'

/**
 * 追踪考核名单弹窗组件
 */
export default function CheckListModal({
  show,
  onClose,
  isMobile,
  yearMonth,
  preloadedData
}) {
  // 考核配置
  const [checkConfig, setCheckConfig] = useState({
    weeklyThreshold: 2500,
    dailyThreshold: 500,
    excludeMembers: []
  })
  const [checkConfigLoaded, setCheckConfigLoaded] = useState(false)
  const [checkExcludeSearch, setCheckExcludeSearch] = useState('')
  const [checkSelectedFrame, setCheckSelectedFrame] = useState(null)
  const checkListRef = useRef(null)

  // 防抖搜索
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // 加载保存的配置
  useEffect(() => {
    if (checkConfigLoaded) return
    try {
      const saved = localStorage.getItem('horizn_check_config')
      if (saved) {
        const parsed = JSON.parse(saved)
        setCheckConfig(prev => ({
          ...prev,
          ...parsed,
          excludeMembers: parsed.excludeMembers || []
        }))
      }
      setCheckConfigLoaded(true)
    } catch {
      setCheckConfigLoaded(true)
    }
  }, [checkConfigLoaded])

  // 保存配置变更
  useEffect(() => {
    if (!checkConfigLoaded) return
    localStorage.setItem('horizn_check_config', JSON.stringify(checkConfig))
  }, [checkConfig, checkConfigLoaded])

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(checkExcludeSearch)
    }, 200)
    return () => clearTimeout(timer)
  }, [checkExcludeSearch])

  // 获取周日中午12点后最近的时间戳索引列表
  const getSundayNoonFrames = useMemo(() => {
    const timeline = preloadedData.weekly?.timeline
    if (!timeline || timeline.length === 0) return []

    const sundayFrames = []
    const now = new Date()
    const currentYear = now.getFullYear()

    for (let i = 0; i < timeline.length; i++) {
      const frame = timeline[i]
      const timestamp = frame.timestamp

      const match = timestamp.match(/(\d{2})-(\d{2}) (\d{2}):(\d{2})/)
      if (!match) continue

      const [, month, day, hour] = match
      const date = new Date(currentYear, parseInt(month) - 1, parseInt(day), parseInt(hour), 0)
      const dayOfWeek = date.getDay()

      if (dayOfWeek === 0 && parseInt(hour) >= 12) {
        const label = `${parseInt(month)}月${parseInt(day)}日 ${hour}:${match[4]}`
        sundayFrames.push({ index: i, label, date })
      }
    }

    // 如果没找到周日中午的帧，返回最后一帧
    if (sundayFrames.length === 0 && timeline.length > 0) {
      const lastFrame = timeline[timeline.length - 1]
      sundayFrames.push({
        index: timeline.length - 1,
        label: lastFrame.timestamp,
        date: new Date()
      })
    }

    return sundayFrames
  }, [preloadedData.weekly?.timeline])

  // 自动选择最新的周日帧
  useEffect(() => {
    if (show && getSundayNoonFrames.length > 0 && checkSelectedFrame === null) {
      setCheckSelectedFrame(getSundayNoonFrames[getSundayNoonFrames.length - 1].index)
    }
  }, [show, getSundayNoonFrames, checkSelectedFrame])

  // 构建所有玩家列表（用于搜索）
  const allPlayersList = useMemo(() => {
    const idMapping = preloadedData.weekly?.idMapping
    if (!idMapping) return []

    return Object.entries(idMapping).map(([playerId, info]) => ({
      playerId,
      name: info.name,
      nameVariants: info.names || [info.name],
      joinDate: info.joinDate,
      leaveDate: info.leaveDate
    }))
  }, [preloadedData.weekly?.idMapping])

  // 搜索排除人员的结果
  const excludeSearchResults = useMemo(() => {
    if (!debouncedSearch.trim()) return []

    const query = debouncedSearch.trim().toLowerCase()
    const excludeSet = new Set(checkConfig.excludeMembers.map(id => id.toLowerCase()))

    return allPlayersList
      .filter(p => {
        if (excludeSet.has(p.playerId.toLowerCase())) return false
        if (p.playerId.toLowerCase().includes(query)) return true
        if (p.nameVariants.some(n => n.toLowerCase().includes(query))) return true
        return false
      })
      .slice(0, 8)
  }, [debouncedSearch, allPlayersList, checkConfig.excludeMembers])

  // 添加排除人员
  const addExcludeMember = (playerId) => {
    if (checkConfig.excludeMembers.includes(playerId)) return
    setCheckConfig(prev => ({
      ...prev,
      excludeMembers: [...prev.excludeMembers, playerId]
    }))
    setCheckExcludeSearch('')
  }

  // 移除排除人员
  const removeExcludeMember = (playerId) => {
    setCheckConfig(prev => ({
      ...prev,
      excludeMembers: prev.excludeMembers.filter(id => id !== playerId)
    }))
  }

  // 解析日期字符串 YYYYMMDD -> Date
  const parseDateStr = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return null
    const year = parseInt(dateStr.substring(0, 4))
    const month = parseInt(dateStr.substring(4, 6)) - 1
    const day = parseInt(dateStr.substring(6, 8))
    return new Date(year, month, day)
  }

  // 计算入队天数
  const calculateDaysInTeam = useCallback((joinDateStr, checkDate) => {
    const joinDate = parseDateStr(joinDateStr)
    const hasJoinDate = !!joinDate

    const checkDay = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate())

    let joinDay
    if (hasJoinDate) {
      joinDay = new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate())
    } else {
      const year = parseInt(yearMonth.substring(0, 4))
      const month = parseInt(yearMonth.substring(4, 6)) - 1
      joinDay = new Date(year, month, 1)
    }

    const diffTime = checkDay.getTime() - joinDay.getTime()
    let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    if (!hasJoinDate) {
      diffDays += 1
    }

    return Math.max(0, diffDays)
  }, [yearMonth])

  // 获取考核不达标名单
  const getCheckFailList = useMemo(() => {
    const timeline = preloadedData.weekly?.timeline
    if (!timeline || checkSelectedFrame === null) return []

    const frameIndex = Math.min(checkSelectedFrame, timeline.length - 1)
    const frame = timeline[frameIndex]
    if (!frame || !frame.allData) return []

    // 获取赛季数据（用于计算日均活跃度）
    const seasonTimeline = preloadedData.season?.timeline
    const seasonFrame = seasonTimeline?.[frameIndex]
    const seasonValueMap = new Map()
    if (seasonFrame?.allData) {
      for (const sp of seasonFrame.allData) {
        const spId = sp.playerId || sp.name
        seasonValueMap.set(spId, sp.value)
      }
    }

    const currentYear = new Date().getFullYear()
    const timestampMatch = frame.timestamp.match(/(\d{2})-(\d{2}) (\d{2}):(\d{2})/)
    let checkDate = new Date()
    if (timestampMatch) {
      const [, month, day] = timestampMatch
      checkDate = new Date(currentYear, parseInt(month) - 1, parseInt(day))
    }

    const { weeklyThreshold, dailyThreshold, excludeMembers } = checkConfig
    const excludeSet = new Set(excludeMembers.map(id => id.trim().toLowerCase()))

    const failList = []

    for (const p of frame.allData) {
      const playerId = p.playerId || p.name
      const playerInfo = p.playerInfo

      if (excludeSet.has(playerId.trim().toLowerCase())) continue
      if (playerInfo?.leaveDate) continue
      if (p.value >= weeklyThreshold) continue

      const joinDateStr = playerInfo?.joinDate
      const daysInTeam = calculateDaysInTeam(joinDateStr, checkDate)
      const seasonValue = seasonValueMap.get(playerId) ?? 0
      const dailyAvg = daysInTeam > 0 ? seasonValue / daysInTeam : 0

      // 如果日均活跃度达标，也跳过（两个条件都不达标才计入名单）
      if (dailyAvg >= dailyThreshold) continue

      // 计算差距（基于周活跃度要求）
      const gap = weeklyThreshold - p.value
      if (gap <= 0) continue

      const joinDate = parseDateStr(joinDateStr)
      const isNewMember = joinDate && daysInTeam <= 30
      const joinDateLabel = joinDate
        ? `${joinDate.getMonth() + 1}月${joinDate.getDate()}日入队`
        : null

      failList.push({
        ...p,
        daysInTeam,
        dailyAvg: Math.round(dailyAvg * 10) / 10,
        isNewMember,
        joinDateLabel,
        gap
      })
    }

    return failList.sort((a, b) => a.value - b.value)
  }, [preloadedData.weekly?.timeline, preloadedData.season?.timeline, checkSelectedFrame, checkConfig, calculateDaysInTeam])

  // 复制考核不达标名单
  const handleCopyCheckList = () => {
    const failList = getCheckFailList
    if (failList.length === 0) {
      toast.error('没有不达标成员')
      return
    }

    const timeline = preloadedData.weekly?.timeline
    const frameIndex = Math.min(checkSelectedFrame, timeline.length - 1)
    const frame = timeline[frameIndex]

    const title = `HORIZN地平线 周活跃度考核不达标名单`
    const criteria = `考核标准：周活跃度<${checkConfig.weeklyThreshold} 且 日均活跃度<${checkConfig.dailyThreshold}`
    const time = `时间：${frame.timestamp}`
    const list = failList.map((p, i) => {
      let line = `${i + 1}. ${p.name}`
      if (p.isNewMember && p.joinDateLabel) {
        line += ` [${p.joinDateLabel}]`
      }
      line += ` (周${p.value}, 日均${p.dailyAvg}, 差${p.gap})`
      return line
    }).join('\n')
    const text = `${title}\n${criteria}\n${time}\n\n${list}`

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => toast.success(`已复制 ${failList.length} 人`))
        .catch(() => toast.error('复制失败'))
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        toast.success(`已复制 ${failList.length} 人`)
      } catch {
        toast.error('复制失败')
      }
      document.body.removeChild(textarea)
    }
  }

  // 生成考核名单截图
  const handleGenerateCheckListImage = async () => {
    const failList = getCheckFailList
    if (failList.length === 0) {
      toast.error('没有不达标成员')
      return
    }

    try {
      const timeline = preloadedData.weekly?.timeline
      const frameIndex = Math.min(checkSelectedFrame, timeline.length - 1)
      const frame = timeline[frameIndex]

      const scale = 2
      const padding = 24 * scale
      const lineHeight = 28 * scale
      const titleFontSize = 16 * scale
      const subtitleFontSize = 12 * scale
      const listFontSize = 13 * scale
      const smallFontSize = 11 * scale
      const width = 400 * scale

      const headerHeight = 80 * scale
      const listHeight = failList.length * lineHeight
      const height = headerHeight + listHeight + padding * 2

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      ctx.fillStyle = '#111827'
      ctx.fillRect(0, 0, width, height)

      ctx.strokeStyle = '#374151'
      ctx.lineWidth = 2 * scale
      ctx.roundRect(4 * scale, 4 * scale, width - 8 * scale, height - 8 * scale, 8 * scale)
      ctx.stroke()

      let y = padding

      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${titleFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('HORIZN地平线 周活跃度考核', width / 2, y + titleFontSize)
      y += titleFontSize + 8 * scale

      ctx.fillStyle = '#9ca3af'
      ctx.font = `${subtitleFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
      ctx.fillText(`${frame.timestamp} · 周<${checkConfig.weeklyThreshold} 日均<${checkConfig.dailyThreshold}`, width / 2, y + subtitleFontSize)
      y += subtitleFontSize + 16 * scale

      ctx.strokeStyle = '#374151'
      ctx.lineWidth = 1 * scale
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
      y += 12 * scale

      ctx.textAlign = 'left'
      ctx.fillStyle = '#9ca3af'
      ctx.font = `${smallFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
      ctx.fillText('不达标名单', padding, y + smallFontSize)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#facc15'
      ctx.fillText(`${failList.length}人`, width - padding, y + smallFontSize)
      y += smallFontSize + 12 * scale

      const truncateText = (ctx, text, maxWidth) => {
        if (ctx.measureText(text).width <= maxWidth) return text
        let truncated = text
        while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
          truncated = truncated.slice(0, -1)
        }
        return truncated + '...'
      }

      ctx.font = `${listFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
      failList.forEach((p, i) => {
        const rowY = y + i * lineHeight

        ctx.font = `${smallFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
        const rightText = `周${p.value} 日均${p.dailyAvg}`
        const gapText = ` 差${p.gap}`
        const rightWidth = ctx.measureText(rightText).width + ctx.measureText(gapText).width + 10 * scale

        const leftMaxWidth = width - padding * 2 - rightWidth - 10 * scale

        ctx.font = `${listFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
        ctx.textAlign = 'left'
        ctx.fillStyle = '#d1d5db'
        const indexText = `${i + 1}. `
        const indexWidth = ctx.measureText(indexText).width

        let joinDateWidth = 0
        let joinDateShort = ''
        if (p.isNewMember && p.playerInfo?.joinDate) {
          const jd = p.playerInfo.joinDate
          const month = parseInt(jd.substring(4, 6))
          const day = parseInt(jd.substring(6, 8))
          joinDateShort = ` ${month}.${day}入`
          ctx.font = `${smallFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
          joinDateWidth = ctx.measureText(joinDateShort).width
          ctx.font = `${listFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
        }

        const nameMaxWidth = leftMaxWidth - indexWidth - joinDateWidth
        const truncatedName = truncateText(ctx, p.name, nameMaxWidth)
        const nameText = indexText + truncatedName
        ctx.fillText(nameText, padding, rowY + listFontSize)

        if (joinDateShort) {
          const nameWidth = ctx.measureText(nameText).width
          ctx.fillStyle = '#4ade80'
          ctx.font = `${smallFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
          ctx.fillText(joinDateShort, padding + nameWidth, rowY + listFontSize)
          ctx.font = `${listFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
        }

        ctx.textAlign = 'right'
        ctx.fillStyle = '#facc15'
        ctx.font = `${smallFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
        ctx.fillText(gapText, width - padding, rowY + listFontSize)

        const gapWidth = ctx.measureText(gapText).width
        ctx.fillStyle = '#f87171'
        ctx.fillText(rightText, width - padding - gapWidth, rowY + listFontSize)

        ctx.font = `${listFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
      })

      const link = document.createElement('a')
      link.download = `考核名单_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      toast.success('截图已生成')
    } catch (error) {
      console.error('生成截图失败:', error)
      toast.error('生成截图失败')
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className={`bg-gray-800/95 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl w-full max-w-md overflow-hidden ${isMobile ? 'select-none' : ''}`}>
        {/* 顶部装饰条 */}
        <div className="h-0.5 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500"></div>

        {/* 标题栏 */}
        <div className="px-4 sm:px-5 py-3 border-b border-gray-700/50 flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-1.5">
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span>追踪考核名单</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg p-1 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区 */}
        <div className="px-4 sm:px-5 py-4 space-y-3">
          {/* 配置区 */}
          <div className="space-y-3">
            {/* 活跃度要求 - 双列 */}
            <div className="grid grid-cols-2 gap-3">
              {/* 周活跃度要求 */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  周活跃度要求
                </label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCheckConfig(prev => ({ ...prev, weeklyThreshold: Math.max(0, prev.weeklyThreshold - 100) }))}
                    className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 border border-gray-600 rounded-lg transition-colors text-white font-medium text-base leading-none"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={checkConfig.weeklyThreshold}
                    onChange={(e) => setCheckConfig(prev => ({ ...prev, weeklyThreshold: parseInt(e.target.value) || 0 }))}
                    className="flex-1 min-w-0 h-7 px-2 bg-gray-700/50 text-white text-center text-xs font-semibold rounded-md border border-gray-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/30 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => setCheckConfig(prev => ({ ...prev, weeklyThreshold: prev.weeklyThreshold + 100 }))}
                    className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 border border-gray-600 rounded-lg transition-colors text-white font-medium text-base leading-none"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 日均活跃度要求 */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  日均活跃度要求
                </label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCheckConfig(prev => ({ ...prev, dailyThreshold: Math.max(0, prev.dailyThreshold - 50) }))}
                    className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 border border-gray-600 rounded-lg transition-colors text-white font-medium text-base leading-none"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={checkConfig.dailyThreshold}
                    onChange={(e) => setCheckConfig(prev => ({ ...prev, dailyThreshold: parseInt(e.target.value) || 0 }))}
                    className="flex-1 min-w-0 h-7 px-2 bg-gray-700/50 text-white text-center text-xs font-semibold rounded-md border border-gray-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/30 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => setCheckConfig(prev => ({ ...prev, dailyThreshold: prev.dailyThreshold + 50 }))}
                    className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 border border-gray-600 rounded-lg transition-colors text-white font-medium text-base leading-none"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 -mt-1">
              判定逻辑：周活跃度不达标 → 再看日均活跃度 → 都不达标才计入名单
            </p>

            {/* 考核时间点 + 排除考核人员 - 同一行 */}
            <div className="grid grid-cols-2 gap-3">
              {/* 考核时间点 */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  考核时间点
                </label>
                <select
                  value={checkSelectedFrame ?? ''}
                  onChange={(e) => setCheckSelectedFrame(parseInt(e.target.value))}
                  className="w-full h-8 px-2 bg-gray-700/50 text-white text-xs rounded-md border border-gray-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/30 focus:outline-none"
                >
                  {getSundayNoonFrames.map((frame, idx) => (
                    <option key={idx} value={frame.index}>
                      {frame.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 排除考核人员 - 搜索框 */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  排除考核人员
                </label>
                <input
                  type="text"
                  value={checkExcludeSearch}
                  onChange={(e) => setCheckExcludeSearch(e.target.value)}
                  placeholder="搜索名字或ID..."
                  className="w-full h-8 px-3 bg-gray-700/50 text-white text-xs rounded-md border border-gray-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/30 focus:outline-none"
                />
                {/* 搜索结果下拉 */}
                {excludeSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                    {excludeSearchResults.map(p => (
                      <button
                        key={p.playerId}
                        onClick={() => addExcludeMember(p.playerId)}
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-700 transition-colors flex items-center justify-between"
                      >
                        <span className="text-white">{p.name}</span>
                        <span className="text-gray-500 text-[10px]">{p.playerId}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 已选择的排除人员 - 标签 */}
            {checkConfig.excludeMembers.length > 0 && (
              <div className="flex flex-wrap gap-1 -mt-1">
                {checkConfig.excludeMembers.map(playerId => {
                  const playerInfo = preloadedData.weekly?.idMapping?.[playerId]
                  const displayName = playerInfo?.name || playerId
                  return (
                    <span
                      key={playerId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-700 text-white text-[10px] rounded-full"
                    >
                      {displayName}
                      <button
                        onClick={() => removeExcludeMember(playerId)}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          {/* 预览（截图区域） */}
          <div ref={checkListRef} className="bg-gray-900/50 rounded-lg p-2.5 border border-gray-700/50">
            {/* 截图时显示的标题 */}
            <div className="text-center mb-2">
              <p className="text-sm font-bold text-white">HORIZN地平线 周活跃度考核</p>
              <p className="text-[10px] text-gray-400">
                {preloadedData.weekly?.timeline?.[checkSelectedFrame]?.timestamp} · 周&lt;{checkConfig.weeklyThreshold} 日均&lt;{checkConfig.dailyThreshold}
              </p>
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">不达标名单</p>
              <span className="text-xs text-yellow-400 font-mono">
                {getCheckFailList.length}人
              </span>
            </div>
            <div className={`text-xs text-gray-300 whitespace-pre-wrap max-h-40 sm:max-h-52 overflow-y-auto custom-scrollbar ${!isMobile ? 'select-text' : ''}`}>
              {getCheckFailList.length === 0 ? (
                <div className="text-gray-500 text-center py-4">没有不达标成员</div>
              ) : (
                getCheckFailList.map((p, i) => (
                  <div key={i} className="flex justify-between items-center gap-2">
                    <span className="flex items-center gap-1 min-w-0">
                      <span className="flex-shrink-0 font-mono">{i + 1}.</span>
                      <span className="truncate">{p.name}</span>
                      {p.isNewMember && p.joinDateLabel && (
                        <span className="text-green-400 text-[10px] flex-shrink-0">({p.joinDateLabel})</span>
                      )}
                    </span>
                    <span className="flex-shrink-0 text-[10px] font-mono">
                      <span className="text-red-400">周{p.value} 日均{p.dailyAvg}</span>
                      <span className="text-yellow-400 ml-1">差{p.gap}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-4 sm:px-5 py-3 bg-gray-900/30 border-t border-gray-700/50 flex gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 bg-gray-700/50 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            关闭
          </button>
          <button
            onClick={handleCopyCheckList}
            disabled={getCheckFailList.length === 0}
            className="flex-1 px-3 py-2 bg-gray-700/50 hover:bg-gray-600 disabled:bg-gray-700/30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>复制</span>
          </button>
          <button
            onClick={handleGenerateCheckListImage}
            disabled={getCheckFailList.length === 0}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-700 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-md shadow-yellow-500/20 hover:shadow-yellow-500/40 transition-all flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>生成截图</span>
          </button>
        </div>
      </div>
    </div>
  )
}
