import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { parseBarChartRaceCSV, generateColorMap } from '@/utils/csvParser'
import { OSS_BASE_URL } from '@/utils/constants'

export default function BarChartRace({ csvPath, onStatusUpdate }) {
  const [timeline, setTimeline] = useState([])
  const [currentFrame, setCurrentFrame] = useState(null) // null 表示未初始化
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [colorMap, setColorMap] = useState({})
  const [totalDuration, setTotalDuration] = useState(() => {
    const saved = localStorage.getItem('horizn_animation_duration')
    return saved ? parseFloat(saved) : 5 // 默认5秒
  })
  const [lastUpdateTime, setLastUpdateTime] = useState(null) // 最近一次数据时间戳
  const [timeElapsed, setTimeElapsed] = useState(0) // 距离上次更新的秒数
  const [maxVisibleItems, setMaxVisibleItems] = useState(20) // 最大可见条目数
  const intervalRef = useRef(null)
  const timerRef = useRef(null)

  // 加载 CSV 数据
  useEffect(() => {
    const loadData = async () => {
      try {
        const url = OSS_BASE_URL
          ? `${OSS_BASE_URL}/${csvPath}?t=${Date.now()}`
          : `/${csvPath}`

        console.log('[BarChartRace] Loading CSV from:', url)

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to load CSV: ${response.status} ${response.statusText}`)
        }

        const csvText = await response.text()
        console.log('[BarChartRace] CSV loaded, length:', csvText.length)

        const timelineData = parseBarChartRaceCSV(csvText)
        console.log('[BarChartRace] Parsed timeline frames:', timelineData.length)

        // 生成颜色映射
        const allNames = new Set()
        timelineData.forEach(frame => {
          frame.data.forEach(item => allNames.add(item.name))
        })
        const colors = generateColorMap(Array.from(allNames))

        setTimeline(timelineData)
        setColorMap(colors)
        // 初始化时跳转到最后一帧（最新数据）
        setCurrentFrame(timelineData.length - 1)

        // 记录最新数据的时间戳
        if (timelineData.length > 0) {
          const lastFrame = timelineData[timelineData.length - 1]
          console.log('[BarChartRace] Last timestamp:', lastFrame.timestamp)

          // 解析时间戳（支持多种格式）
          const parsedTime = parseTimestamp(lastFrame.timestamp)
          console.log('[BarChartRace] Parsed time:', parsedTime)

          if (parsedTime && !isNaN(parsedTime.getTime())) {
            setLastUpdateTime(parsedTime)
          } else {
            console.warn('[BarChartRace] Invalid timestamp format:', lastFrame.timestamp)
          }
        }
      } catch (err) {
        console.error('[BarChartRace] Error loading CSV:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [csvPath])

  // 保存总时长到 localStorage
  useEffect(() => {
    localStorage.setItem('horizn_animation_duration', totalDuration.toString())
  }, [totalDuration])

  // 解析时间戳（支持多种格式）
  const parseTimestamp = (timestamp) => {
    // 尝试直接解析
    let date = new Date(timestamp)
    if (!isNaN(date.getTime())) {
      return date
    }

    // 尝试替换空格为 T（ISO 8601 格式）
    date = new Date(timestamp.replace(' ', 'T'))
    if (!isNaN(date.getTime())) {
      return date
    }

    // 手动解析 "YYYY-MM-DD HH:MM:SS" 格式
    let match = timestamp.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/)
    if (match) {
      const [, year, month, day, hour, minute, second] = match
      return new Date(year, month - 1, day, hour, minute, second)
    }

    // 解析中文格式 "10月28日 16:02"
    match = timestamp.match(/(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})/)
    if (match) {
      const [, month, day, hour, minute] = match
      const now = new Date()
      const year = now.getFullYear()
      return new Date(year, month - 1, day, hour, minute, 0)
    }

    return null
  }

  // 判断当前是白天还是夜间模式
  const isNightMode = () => {
    const hour = new Date().getHours()
    // 夜间模式：1:00-8:00
    return hour >= 1 && hour < 8
  }

  // 获取更新阈值（秒）
  const getUpdateThreshold = () => {
    return isNightMode() ? 62 * 60 : 12 * 60 // 夜间62分钟，白天12分钟
  }

  // 自动更新检查
  useEffect(() => {
    if (!lastUpdateTime) return

    // 每秒更新一次计时器
    timerRef.current = setInterval(() => {
      const now = new Date()
      const elapsed = Math.floor((now - lastUpdateTime) / 1000)
      setTimeElapsed(elapsed)

      // 检查是否需要自动刷新
      const threshold = getUpdateThreshold()
      if (elapsed >= threshold) {
        console.log('[BarChartRace] Auto-refresh triggered')
        window.location.reload()
      }
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [lastUpdateTime])

  // 向父组件传递状态信息
  useEffect(() => {
    // 确保数据完全加载后才更新状态
    if (!lastUpdateTime || !onStatusUpdate || timeElapsed === 0) return

    const formatTimeElapsed = (seconds) => {
      const minutes = Math.floor(seconds / 60)
      const secs = seconds % 60
      if (minutes > 0) {
        return `${minutes}分${secs}秒前`
      }
      return `${secs}秒前`
    }

    const threshold = getUpdateThreshold()
    const remainingSeconds = Math.max(0, threshold - timeElapsed)
    const remainingMinutes = Math.floor(remainingSeconds / 60)
    const remainingSecs = remainingSeconds % 60

    onStatusUpdate({
      timeElapsed,
      timeElapsedText: formatTimeElapsed(timeElapsed),
      isNightMode: isNightMode(),
      remainingSeconds,
      remainingText: `${remainingMinutes}:${remainingSecs.toString().padStart(2, '0')}`
    })
  }, [timeElapsed, lastUpdateTime, onStatusUpdate])

  // 根据视窗高度计算最大可见条目数
  useEffect(() => {
    const calculateMaxItems = () => {
      const viewportHeight = window.innerHeight
      const isLargeScreen = window.innerWidth >= 1024

      // 减去固定高度的元素
      const topBarHeight = 50 // 顶部导航栏
      const controlsHeight = 75 // 播放控制区
      const padding = 40 // 上下内边距
      const timeDisplayHeight = isLargeScreen ? 130 : 90 // 时间显示区域

      // 可用高度
      const availableHeight = viewportHeight - topBarHeight - controlsHeight - padding - timeDisplayHeight

      // 每条数据的高度（包括间距）
      const isMobile = window.innerWidth < 640
      const itemHeight = isMobile ? 16 : 20

      // 计算最大条目数（最少10条，最多40条）
      const maxItems = Math.floor(availableHeight / itemHeight)
      const finalMaxItems = Math.max(10, Math.min(40, maxItems))

      console.log('[BarChartRace] 视窗高度:', viewportHeight, '可用高度:', availableHeight, '显示条数:', finalMaxItems)
      setMaxVisibleItems(finalMaxItems)
    }

    calculateMaxItems()
    window.addEventListener('resize', calculateMaxItems)

    return () => window.removeEventListener('resize', calculateMaxItems)
  }, [])

  // 播放控制 - 根据总时长动态计算帧间隔
  useEffect(() => {
    if (isPlaying && timeline.length > 0) {
      const frameInterval = (totalDuration * 1000) / timeline.length

      intervalRef.current = setInterval(() => {
        setCurrentFrame(prev => {
          if (prev >= timeline.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, frameInterval)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, timeline.length, totalDuration])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-gray-400">加载数据中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-2">❌ 加载失败</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (timeline.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <p className="text-gray-400">暂无数据</p>
      </div>
    )
  }

  // 等待 currentFrame 初始化
  if (currentFrame === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-gray-400">初始化中...</p>
        </div>
      </div>
    )
  }

  const currentData = timeline[currentFrame]
  const maxValue = Math.max(...currentData.data.map(d => d.value))
  const displayData = currentData.data.slice(0, maxVisibleItems) // 根据屏幕高度动态显示

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-6">
        {/* 图表区域 */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* 条形图区域 */}
          <div className="flex-1 relative">
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {displayData.map((item, index) => {
                  const percentage = (item.value / maxValue) * 100
                  return (
                    <motion.div
                      key={item.name}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-2 sm:gap-3"
                    >
                      {/* 名次 */}
                      <div className="w-6 sm:w-8 text-center text-gray-400 text-xs sm:text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </div>

                      {/* 玩家名称 */}
                      <div
                        className="w-20 sm:w-28 md:w-36 lg:w-44 text-white text-xs sm:text-sm truncate flex-shrink-0 text-right"
                        style={item.name.includes('地平线') ? { direction: 'rtl', unicodeBidi: 'embed' } : {}}
                      >
                        {item.name}
                      </div>

                      {/* 条形图 */}
                      <div className="flex-1 relative h-3 sm:h-4 min-w-0">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.3 }}
                          className="h-full rounded"
                          style={{ backgroundColor: colorMap[item.name] || '#666' }}
                        />
                        <div className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 text-white text-[10px] sm:text-xs font-semibold">
                          {item.value.toLocaleString()}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            {/* 小屏幕：时间和总计（浮动在右下角） */}
            <div className="lg:hidden absolute bottom-0 right-8 sm:right-16 md:right-20 text-right pointer-events-none">
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-300/80 font-mono leading-none">
                {currentData.timestamp.split(' ')[1] || currentData.timestamp}
              </div>
              <div className="text-base sm:text-lg md:text-xl text-gray-500/80 mt-1">
                Total: {currentData.total.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 大屏幕：右侧时间和总计 */}
          <div className="hidden lg:flex w-64 xl:w-96 flex-col justify-center items-center flex-shrink-0">
            <div className="text-center">
              <div className="text-6xl xl:text-8xl font-bold text-gray-300 mb-3 xl:mb-4 font-mono leading-none">
                {currentData.timestamp.split(' ')[1] || currentData.timestamp}
              </div>
              <div className="text-xl xl:text-2xl text-gray-500 mb-6 xl:mb-8">
                Total: {currentData.total.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 播放控制 - 极简设计 */}
        <div className="mt-4 sm:mt-6 lg:mt-8 pt-3 sm:pt-4 border-t border-gray-800/50">
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-4">
            {/* 播放/暂停 */}
            <button
              onClick={() => {
                // 如果当前在结尾，重置到开头再播放
                if (currentFrame >= timeline.length - 1) {
                  setCurrentFrame(0)
                  setIsPlaying(true)
                } else {
                  setIsPlaying(!isPlaying)
                }
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors flex-shrink-0"
            >
              {isPlaying ? (
                <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-300 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* 时间轴和进度条 */}
            <div className="flex-1 relative px-4">
              {/* 时间标签层 */}
              <div className="relative h-5 mb-1">
                {(() => {
                  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
                  const isTablet = typeof window !== 'undefined' && window.innerWidth < 1024

                  let maxTicks = 12
                  if (isMobile) maxTicks = 6
                  else if (isTablet) maxTicks = 8

                  const tickCount = Math.min(maxTicks, Math.max(4, Math.floor(timeline.length / 10)))
                  const step = Math.floor(timeline.length / tickCount)
                  const labels = []

                  for (let i = 0; i <= tickCount; i++) {
                    const index = Math.min(i * step, timeline.length - 1)
                    const percentage = (index / (timeline.length - 1)) * 100

                    labels.push(
                      <div
                        key={i}
                        className="absolute -translate-x-1/2"
                        style={{ left: `${percentage}%` }}
                      >
                        <div className="text-[9px] sm:text-[10px] text-gray-400 font-mono whitespace-nowrap">
                          {timeline[index]?.timestamp.split(' ')[1] || ''}
                        </div>
                      </div>
                    )
                  }
                  return labels
                })()}
              </div>

              {/* 进度条容器 */}
              <div
                className="relative h-6 cursor-pointer select-none"
                style={{ touchAction: 'none' }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = e.clientX - rect.left
                  const percentage = Math.max(0, Math.min(1, x / rect.width))
                  const newFrame = Math.round(percentage * (timeline.length - 1))
                  setCurrentFrame(newFrame)
                  setIsPlaying(false)
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  const container = e.currentTarget
                  const rect = container.getBoundingClientRect()

                  const handleMove = (moveEvent) => {
                    const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX
                    const x = clientX - rect.left
                    const percentage = Math.max(0, Math.min(1, x / rect.width))
                    const newFrame = Math.round(percentage * (timeline.length - 1))
                    setCurrentFrame(newFrame)
                    setIsPlaying(false)
                  }

                  const handleEnd = () => {
                    document.removeEventListener('mousemove', handleMove)
                    document.removeEventListener('mouseup', handleEnd)
                    document.removeEventListener('touchmove', handleMove)
                    document.removeEventListener('touchend', handleEnd)
                  }

                  document.addEventListener('mousemove', handleMove)
                  document.addEventListener('mouseup', handleEnd)
                  document.addEventListener('touchmove', handleMove, { passive: false })
                  document.addEventListener('touchend', handleEnd)
                }}
                onTouchStart={(e) => {
                  e.preventDefault()
                  const container = e.currentTarget
                  const rect = container.getBoundingClientRect()

                  const handleMove = (moveEvent) => {
                    moveEvent.preventDefault()
                    const clientX = moveEvent.touches[0].clientX
                    const x = clientX - rect.left
                    const percentage = Math.max(0, Math.min(1, x / rect.width))
                    const newFrame = Math.round(percentage * (timeline.length - 1))
                    setCurrentFrame(newFrame)
                    setIsPlaying(false)
                  }

                  const handleEnd = () => {
                    document.removeEventListener('touchmove', handleMove)
                    document.removeEventListener('touchend', handleEnd)
                  }

                  document.addEventListener('touchmove', handleMove, { passive: false })
                  document.addEventListener('touchend', handleEnd)
                }}
              >
                {/* 刻度线 */}
                <div className="absolute top-0 left-0 right-0 h-2">
                  {(() => {
                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
                    const isTablet = typeof window !== 'undefined' && window.innerWidth < 1024

                    let maxTicks = 12
                    if (isMobile) maxTicks = 6
                    else if (isTablet) maxTicks = 8

                    const tickCount = Math.min(maxTicks, Math.max(4, Math.floor(timeline.length / 10)))
                    const step = Math.floor(timeline.length / tickCount)
                    const ticks = []

                    for (let i = 0; i <= tickCount; i++) {
                      const index = Math.min(i * step, timeline.length - 1)
                      const percentage = (index / (timeline.length - 1)) * 100

                      ticks.push(
                        <div
                          key={i}
                          className="absolute w-px h-2 bg-gray-600"
                          style={{ left: `${percentage}%` }}
                        />
                      )
                    }
                    return ticks
                  })()}
                </div>

                {/* 进度条轨道 */}
                <div className="absolute top-2 left-0 right-0 h-1 bg-gray-800 rounded-full overflow-hidden">
                  {/* 进度条填充 */}
                  <div
                    className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"
                    style={{ width: `${(currentFrame / (timeline.length - 1)) * 100}%` }}
                  />
                </div>

                {/* 三角形指针 */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `${(currentFrame / (timeline.length - 1)) * 100}%`,
                    top: '12px',
                    transform: 'translateX(-50%)'
                  }}
                >
                  <svg width="14" height="12" viewBox="0 0 14 12" className="drop-shadow-lg">
                    <polygon points="7,0 0,12 14,12" fill="white" opacity="0.95" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 时长调节 */}
            <div className="flex items-center gap-0.5 sm:gap-1 lg:gap-2 flex-shrink-0">
              <button
                onClick={() => setTotalDuration(Math.max(5, totalDuration - 5))}
                className="w-5 h-5 flex items-center justify-center hover:bg-gray-800 rounded transition-colors"
              >
                <span className="text-gray-400 text-[10px] sm:text-xs">−</span>
              </button>
              <span className="text-[10px] sm:text-xs text-gray-400 font-mono w-6 sm:w-7 lg:w-8 text-center">{totalDuration}s</span>
              <button
                onClick={() => setTotalDuration(Math.min(120, totalDuration + 5))}
                className="w-5 h-5 flex items-center justify-center hover:bg-gray-800 rounded transition-colors"
              >
                <span className="text-gray-400 text-[10px] sm:text-xs">+</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
