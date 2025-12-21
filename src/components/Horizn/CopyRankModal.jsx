import { useState, useRef, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'

/**
 * 复制排名名单弹窗组件
 */
export default function CopyRankModal({
  show,
  onClose,
  isMobile,
  activeTab,
  setActiveTab,
  currentData,
  preloadedData,
  manualFrameIndex,
  setManualFrameIndex
}) {
  // 内部状态
  const [copyDataType, setCopyDataType] = useState(activeTab)
  const [copyShowValues, setCopyShowValues] = useState(true)
  const [copyShowNewMark, setCopyShowNewMark] = useState(true)
  const [copyCount, setCopyCount] = useState('20')
  const [copyMode, setCopyMode] = useState('rank')
  const [thresholdCompare, setThresholdCompare] = useState('gte')
  const [thresholdValue, setThresholdValue] = useState('')

  // refs
  const pressTimerRef = useRef(null)
  const intervalRef = useRef(null)
  const currentFrameRef = useRef(currentData?.currentFrameIndex ?? 0)

  // 同步 currentFrameRef
  useEffect(() => {
    if (currentData?.currentFrameIndex !== undefined) {
      currentFrameRef.current = currentData.currentFrameIndex
    }
  }, [currentData?.currentFrameIndex])

  // 根据当前 tab 和比较模式获取默认阈值
  const getDefaultThreshold = useCallback((compareMode = thresholdCompare) => {
    const dataType = copyDataType || activeTab
    if (compareMode === 'lte') {
      return dataType === 'weekly' ? '2500' : '7000'
    }
    return dataType === 'weekly' ? '4500' : '50000'
  }, [thresholdCompare, copyDataType, activeTab])

  // 根据当前 tab 获取阈值步进值
  const getThresholdStep = useCallback(() => {
    const dataType = copyDataType || activeTab
    return dataType === 'weekly' ? 100 : 1000
  }, [copyDataType, activeTab])

  // 初始化阈值
  useEffect(() => {
    if (show) {
      setCopyDataType(activeTab)
      setThresholdValue(getDefaultThreshold('gte'))
    }
  }, [show, activeTab])

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

  // 通用长按处理函数
  const handlePressStart = useCallback((e, action) => {
    handlePressEnd()
    action()
    e.preventDefault()
    pressTimerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(action, 80)
    }, 300)
    if (e.target && typeof e.target.setPointerCapture === 'function') {
      e.target.setPointerCapture(e.pointerId)
    }
  }, [handlePressEnd])

  // 获取复制名单使用的数据
  const getSelectedData = useCallback(() => {
    if (copyDataType === activeTab && currentData?.current) {
      return currentData.current
    }
    const targetData = preloadedData[copyDataType]
    if (!targetData?.timeline) return null
    const frameIndex = manualFrameIndex ?? (targetData.timeline.length - 1)
    const validIndex = Math.min(frameIndex, targetData.timeline.length - 1)
    return targetData.timeline[validIndex] || null
  }, [copyDataType, activeTab, currentData, preloadedData, manualFrameIndex])

  // 格式化时间戳
  const formatTimestamp = (timestamp) => {
    const now = new Date()
    const year = now.getFullYear()
    const match = timestamp.match(/(\d{2})-(\d{2}) (\d{2}:\d{2})/)
    if (match) {
      const [, month, day, time] = match
      return `${year}年${parseInt(month)}月${parseInt(day)}日${time}`
    }
    return timestamp
  }

  // 格式化时间戳用于警告显示
  const formatTimestampShort = (timestamp) => {
    const match = timestamp.match(/(\d{2})-(\d{2}) (\d{2}:\d{2})/)
    if (match) {
      const [, month, day, time] = match
      return `非最新数据: ${parseInt(month)}月${parseInt(day)}日 ${time}`
    }
    return timestamp
  }

  // 复制名单
  const handleCopyList = () => {
    const selectedData = getSelectedData()
    if (!selectedData || !selectedData.allData) return

    let selectedPlayers = []
    let title = ''
    const tabName = copyDataType === 'weekly' ? '周活跃度' : '赛季活跃度'
    const formattedTime = formatTimestamp(selectedData.timestamp)

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
    const lines = selectedPlayers.map((p, i) => {
      let line = `${i + 1}. ${p.name}`
      const weeks = newMemberMap[p.name]
      if (copyShowNewMark && weeks) {
        line += weeks === 1 ? ' [New]' : ` [N-${weeks - 1}]`
      }
      if (copyShowValues) {
        line += ` (${p.value})`
      }
      return line
    })

    const text = `${title}\n${lines.join('\n')}`

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => toast.success(`已复制 ${selectedPlayers.length} 人`))
        .catch(() => toast.error('复制失败'))
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.cssText = 'position:fixed;top:-9999px;left:-9999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        const successful = document.execCommand('copy')
        if (successful) {
          toast.success(`已复制 ${selectedPlayers.length} 人`)
        } else {
          toast.error('复制失败')
        }
      } catch {
        toast.error('复制失败')
      }
      document.body.removeChild(textArea)
    }
  }

  // 关闭弹窗并重置状态
  const handleClose = () => {
    setCopyCount('20')
    setCopyMode('rank')
    setThresholdCompare('gte')
    setThresholdValue(getDefaultThreshold('gte'))
    setManualFrameIndex(null)
    setCopyDataType(activeTab)
    onClose()
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className={`bg-gray-800/95 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl w-full max-w-md overflow-hidden ${isMobile ? 'select-none' : ''}`}>
        {/* 顶部装饰条 */}
        <div className="h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

        {/* 标题栏 */}
        <div className="px-4 sm:px-5 py-3 border-b border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-1.5">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>复制排名名单</span>
            </h3>
            {/* 数据类型切换 */}
            <div className="flex gap-0.5 bg-gray-900/50 rounded-md p-0.5">
              <button
                onClick={() => {
                  setCopyDataType('weekly')
                  setActiveTab('weekly')
                  setThresholdValue(thresholdCompare === 'lte' ? '2500' : '4500')
                }}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${
                  copyDataType === 'weekly'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                周
              </button>
              <button
                onClick={() => {
                  setCopyDataType('season')
                  setActiveTab('season')
                  setThresholdValue(thresholdCompare === 'lte' ? '7000' : '50000')
                }}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${
                  copyDataType === 'season'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                赛季
              </button>
            </div>
          </div>
          <button
            onClick={handleClose}
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
                  const tabName = copyDataType === 'weekly' ? '周活跃度' : '赛季活跃度'
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

                  const titleElement = <div className="mb-2 text-gray-200">{title}</div>
                  const listElements = selectedPlayers.map((p, i) => {
                    const weeks = newMemberMap[p.name]
                    const showMark = copyShowNewMark && weeks

                    return (
                      <div key={i}>
                        {i + 1}. {p.name}
                        {showMark && (
                          <span className={`ml-1 ${
                            weeks === 1 ? 'text-green-400' :
                            weeks === 2 ? 'text-green-500/80' :
                            weeks === 3 ? 'text-green-600/70' :
                            weeks === 4 ? 'text-green-700/60' :
                            'text-green-800/50'
                          }`}>
                            {weeks === 1 ? '[New]' : `[N-${weeks - 1}]`}
                          </span>
                        )}
                        {copyShowValues && <span> ({p.value})</span>}
                      </div>
                    )
                  })

                  return (
                    <>
                      {titleElement}
                      {listElements}
                    </>
                  )
                })()}
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-4 sm:px-5 py-3 bg-gray-900/30 border-t border-gray-700/50 flex gap-2">
          <button
            onClick={handleClose}
            className="flex-1 px-3 py-2 bg-gray-700/50 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCopyList}
            disabled={
              (!currentData && !preloadedData[copyDataType]) ||
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
  )
}
