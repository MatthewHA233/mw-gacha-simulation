import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { parseBarChartRaceCSV, generateColorMap } from '@/utils/csvParser'
import { OSS_BASE_URL } from '@/utils/constants'
import { buildHoriznWeeklyCsvPath, buildHoriznSeasonCsvPath } from '@/services/cdnService'

export default function BarChartRace({ csvPath, onStatusUpdate, onDataUpdate, showValues = false, externalFrameIndex = null }) {
  // 根据 csvPath 判断类型（weekly 或 season）
  const dataType = csvPath.includes('weekly') ? 'weekly' : 'season'
  const storageKey = `horizn_animation_duration_${dataType}`

  const [timeline, setTimeline] = useState([])
  const [currentFrame, setCurrentFrame] = useState(null) // null 表示未初始化
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [colorMap, setColorMap] = useState({})
  const [totalDuration, setTotalDuration] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    return saved ? parseFloat(saved) : 5 // 默认5秒
  })
  const [lastUpdateTime, setLastUpdateTime] = useState(null) // 最近一次数据时间戳
  const [timeElapsed, setTimeElapsed] = useState(0) // 距离上次更新的秒数
  const [maxVisibleItems, setMaxVisibleItems] = useState(20) // 最大可见条目数
  const [newMemberMap, setNewMemberMap] = useState({}) // 新成员映射：{ playerName: weeksAgo }

  // 视窗相关状态（用于超过400帧时的横向滚动）
  const [viewportStart, setViewportStart] = useState(0) // 视窗起始帧索引
  const [viewportWidth, setViewportWidth] = useState(400) // 视窗宽度（帧数）
  const [isDraggingViewport, setIsDraggingViewport] = useState(false) // 是否正在拖动视窗

  const intervalRef = useRef(null)
  const timerRef = useRef(null)
  const animationRef = useRef(null)
  const startTimeRef = useRef(null)
  const startFrameRef = useRef(0)
  const totalDurationRef = useRef(totalDuration)
  const prevDurationRef = useRef(totalDuration) // 追踪上一次的速度
  const prevFrameRef = useRef(currentFrame) // 追踪上一帧

  // 同步 totalDuration 到 ref
  useEffect(() => {
    totalDurationRef.current = totalDuration
  }, [totalDuration])

  // 从 csvPath 提取 yearMonth
  const yearMonth = csvPath.match(/(\d{6})/)?.[1] || ''

  // 计算新成员信息
  const calculateNewMembers = (weeklyTimeline, seasonTimeline) => {
    if (!weeklyTimeline.length || !seasonTimeline.length) return {}

    // 找出每周的最后一个时间戳索引
    // 周边界：周一早上8点（UTC+8）
    const weekEndIndices = []
    let currentWeekStart = null

    for (let i = 0; i < weeklyTimeline.length; i++) {
      const timestamp = weeklyTimeline[i].timestamp
      const date = parseTimestamp(timestamp)
      if (!date) continue

      // 计算这个时间戳属于哪一周（以周一8点为起点）
      const weekStart = getWeekStart(date)

      if (currentWeekStart === null) {
        currentWeekStart = weekStart.getTime()
      } else if (weekStart.getTime() !== currentWeekStart) {
        // 新的一周开始，记录上一周的最后一个索引
        weekEndIndices.push(i - 1)
        currentWeekStart = weekStart.getTime()
      }
    }
    // 添加最后一周的最后一个索引
    weekEndIndices.push(weeklyTimeline.length - 1)

    console.log('[BarChartRace] Week end indices:', weekEndIndices)

    // 从最新的周往前数，检查新成员
    const newMembers = {}
    const now = new Date()
    const nowWeekStart = getWeekStart(now)

    for (let weekIdx = weekEndIndices.length - 1; weekIdx >= 0 && weekIdx >= weekEndIndices.length - 4; weekIdx--) {
      const frameIdx = weekEndIndices[weekIdx]
      const weeklyFrame = weeklyTimeline[frameIdx]
      const seasonFrame = seasonTimeline[frameIdx]

      if (!weeklyFrame || !seasonFrame) continue

      // 计算这是几周前（1-4）
      const frameDate = parseTimestamp(weeklyFrame.timestamp)
      if (!frameDate) continue

      const frameWeekStart = getWeekStart(frameDate)
      const weeksAgo = Math.floor((nowWeekStart.getTime() - frameWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000))

      if (weeksAgo < 0 || weeksAgo > 4) continue

      // 检查每个玩家
      for (const weeklyPlayer of weeklyFrame.allData) {
        const seasonPlayer = seasonFrame.allData.find(p => p.name === weeklyPlayer.name)

        if (seasonPlayer &&
            weeklyPlayer.value > 0 &&
            weeklyPlayer.value === seasonPlayer.value &&
            !newMembers[weeklyPlayer.name]) {
          // 周活跃度 = 赛季活跃度 且不为0，说明是这周新来的
          newMembers[weeklyPlayer.name] = weeksAgo === 0 ? 1 : weeksAgo + 1
          console.log(`[BarChartRace] New member: ${weeklyPlayer.name}, weeks ago: ${newMembers[weeklyPlayer.name]}`)
        }
      }
    }

    return newMembers
  }

  // 获取周一早上8点的时间（作为周的起始点）
  const getWeekStart = (date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // 调整到周一
    d.setDate(diff)
    d.setHours(8, 0, 0, 0)
    return d
  }

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

        // 加载另一种类型的 CSV 来计算新成员
        if (yearMonth) {
          try {
            const otherCsvPath = dataType === 'weekly'
              ? buildHoriznSeasonCsvPath(yearMonth)
              : buildHoriznWeeklyCsvPath(yearMonth)

            const otherUrl = OSS_BASE_URL
              ? `${OSS_BASE_URL}/${otherCsvPath}?t=${Date.now()}`
              : `/${otherCsvPath}`

            console.log('[BarChartRace] Loading other CSV for new member detection:', otherUrl)

            const otherResponse = await fetch(otherUrl)
            if (otherResponse.ok) {
              const otherCsvText = await otherResponse.text()
              const otherTimelineData = parseBarChartRaceCSV(otherCsvText)

              // 计算新成员
              const weeklyData = dataType === 'weekly' ? timelineData : otherTimelineData
              const seasonData = dataType === 'weekly' ? otherTimelineData : timelineData

              const newMembers = calculateNewMembers(weeklyData, seasonData)
              setNewMemberMap(newMembers)
              console.log('[BarChartRace] New members detected:', Object.keys(newMembers).length)
            }
          } catch (err) {
            console.warn('[BarChartRace] Failed to load other CSV for new member detection:', err)
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
  }, [csvPath, yearMonth, dataType])

  // 保存总时长到 localStorage（分类型保存）
  useEffect(() => {
    localStorage.setItem(storageKey, totalDuration.toString())
  }, [totalDuration, storageKey])

  // 当 csvPath 改变时，加载对应的时长设置
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    const newDuration = saved ? parseFloat(saved) : 5
    setTotalDuration(newDuration)
  }, [storageKey])

  // 更新上一帧引用
  useEffect(() => {
    prevFrameRef.current = currentFrame
  }, [currentFrame])

  // 外部控制 currentFrame（用于父组件控制播放位置）
  useEffect(() => {
    if (externalFrameIndex !== null && timeline.length > 0) {
      const validIndex = Math.max(0, Math.min(externalFrameIndex, timeline.length - 1))
      setCurrentFrame(validIndex)
      setIsPlaying(false) // 手动控制时暂停播放
    }
  }, [externalFrameIndex, timeline.length])

  // 视窗逻辑：当帧数超过400时启用横向滚动
  const enableViewport = timeline.length > 400
  const viewportEnd = Math.min(viewportStart + viewportWidth, timeline.length)

  // 当 currentFrame 改变时，自动调整视窗以确保当前帧可见
  useEffect(() => {
    if (!enableViewport || currentFrame === null || isDraggingViewport) return // 拖动时不自动跟随

    // 如果当前帧不在可见范围内，调整视窗
    if (currentFrame < viewportStart) {
      // 当前帧在视窗左侧，移动视窗使当前帧位于视窗左侧
      setViewportStart(Math.max(0, currentFrame))
    } else if (currentFrame >= viewportEnd) {
      // 当前帧在视窗右侧，移动视窗使当前帧位于视窗右侧
      setViewportStart(Math.max(0, currentFrame - viewportWidth + 1))
    }
  }, [currentFrame, enableViewport, viewportStart, viewportEnd, viewportWidth, timeline.length, isDraggingViewport])

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

  // 获取更新间隔和首次检查点（分钟）
  const getUpdateConfig = () => {
    const nightMode = isNightMode()
    return {
      interval: nightMode ? 60 : 10,        // 更新间隔：夜间60分钟，白天10分钟
      firstCheck: nightMode ? 62 : 12       // 首次检查点：夜间62分钟，白天12分钟
    }
  }

  // 计算下一个检查点的剩余秒数
  const getSecondsToNextCheckpoint = (elapsed) => {
    const { interval, firstCheck } = getUpdateConfig()
    const elapsedMinutes = elapsed / 60

    if (elapsedMinutes < firstCheck) {
      // 还没到第一个检查点
      return (firstCheck * 60) - elapsed
    }

    // 计算距离第一个检查点过了多少时间
    const timeSinceFirstCheck = elapsedMinutes - firstCheck
    const remainder = timeSinceFirstCheck % interval

    // 距离下一个检查点的时间
    const minutesToNext = remainder === 0 ? interval : (interval - remainder)
    return Math.ceil(minutesToNext * 60)
  }

  // 自动更新检查
  useEffect(() => {
    if (!lastUpdateTime) return

    // 每秒更新一次计时器
    timerRef.current = setInterval(() => {
      const now = new Date()
      const elapsed = Math.floor((now - lastUpdateTime) / 1000)
      setTimeElapsed(elapsed)

      // 检查是否到达刷新检查点
      const { interval, firstCheck } = getUpdateConfig()
      const elapsedMinutes = elapsed / 60

      // 只在刚到达检查点的那几秒触发（允许3秒误差）
      if (elapsedMinutes >= firstCheck) {
        const timeSinceFirstCheck = elapsedMinutes - firstCheck
        const remainder = timeSinceFirstCheck % interval
        const secondsRemainder = remainder * 60

        // 如果remainder接近0（或接近interval），说明刚好到达一个检查点
        if (secondsRemainder <= 3) {
          console.log('[BarChartRace] Auto-refresh at checkpoint:', Math.floor(elapsedMinutes), 'minutes')
          window.location.reload()
        }
      }
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [lastUpdateTime])

  // 向父组件传递当前数据和最新时间戳
  useEffect(() => {
    if (onDataUpdate && timeline.length > 0 && currentFrame !== null) {
      onDataUpdate({
        current: timeline[currentFrame],
        latestTimestamp: timeline[timeline.length - 1].timestamp,
        isLatest: currentFrame === timeline.length - 1,
        allTimestamps: timeline.map(t => t.timestamp),
        currentFrameIndex: currentFrame,
        timeline: timeline
      })
    }
  }, [currentFrame, timeline, onDataUpdate])

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

    // 计算到下一个检查点的剩余时间
    const remainingSeconds = getSecondsToNextCheckpoint(timeElapsed)
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

  // 播放控制 - 使用 requestAnimationFrame 实现精确时间控制
  useEffect(() => {
    if (isPlaying && timeline.length > 0) {
      // 记录开始时间和开始帧
      startTimeRef.current = performance.now()
      startFrameRef.current = currentFrame
      prevDurationRef.current = totalDurationRef.current
      const totalFrames = timeline.length - 1 // 最大帧索引
      let lastFrame = currentFrame

      const animate = (currentTime) => {
        // 检测速度是否改变
        if (totalDurationRef.current !== prevDurationRef.current) {
          // 速度改变了，重置时间基准
          startTimeRef.current = currentTime
          startFrameRef.current = lastFrame
          prevDurationRef.current = totalDurationRef.current
        }

        const elapsed = currentTime - startTimeRef.current
        const currentDuration = totalDurationRef.current
        const remainingFrames = totalFrames - startFrameRef.current
        const remainingDuration = (remainingFrames / totalFrames) * currentDuration

        const progress = Math.min(elapsed / (remainingDuration * 1000), 1)

        // 根据时间进度计算当前应该显示的帧
        const targetFrame = Math.min(
          Math.floor(startFrameRef.current + progress * remainingFrames),
          totalFrames
        )

        if (progress >= 1) {
          // 播放完成，确保停在最后一帧
          setCurrentFrame(totalFrames)
          setIsPlaying(false)
          return
        }

        lastFrame = targetFrame
        setCurrentFrame(targetFrame)
        animationRef.current = requestAnimationFrame(animate)
      }

      animationRef.current = requestAnimationFrame(animate)
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, timeline.length])

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

  const currentData = timeline[currentFrame] || timeline[timeline.length - 1]
  if (!currentData) {
    return <div>No data available</div>
  }
  const maxValue = Math.max(...currentData.data.map(d => d.value))
  const displayData = currentData.data.slice(0, maxVisibleItems) // 根据屏幕高度动态显示

  // 检测是否是大幅度跳跃（如从末尾回到开头）
  const prevFrame = prevFrameRef.current
  const frameDiff = Math.abs(currentFrame - prevFrame)
  const isLargeJump = frameDiff > timeline.length / 2 // 如果跳跃超过一半帧数，认为是大跳跃

  // 根据是否大跳跃决定动画时长
  const transitionDuration = isLargeJump ? 0 : 0.3

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
                  const newWeeks = newMemberMap[item.name]
                  return (
                    <motion.div
                      key={item.name}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: transitionDuration }}
                      className="flex items-center gap-2 sm:gap-3"
                    >
                      {/* 名次 */}
                      <div className="w-6 sm:w-8 text-center text-gray-400 text-xs sm:text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </div>

                      {/* 玩家名称 + 新成员角标 */}
                      <div className="w-20 sm:w-28 md:w-36 lg:w-44 flex items-center justify-end gap-0.5 flex-shrink-0">
                        <div
                          className="text-white text-xs sm:text-sm truncate text-right"
                          style={item.name.includes('地平线') ? { direction: 'rtl', unicodeBidi: 'embed' } : {}}
                        >
                          {item.name}
                        </div>
                        {/* 新成员角标 */}
                        {newWeeks && newWeeks <= 4 && (
                          <span className={`text-[8px] sm:text-[9px] font-bold px-0.5 rounded flex-shrink-0 ${
                            newWeeks === 1 ? 'text-green-400 bg-green-400/20' :
                            newWeeks === 2 ? 'text-blue-400 bg-blue-400/20' :
                            newWeeks === 3 ? 'text-yellow-400 bg-yellow-400/20' :
                            'text-gray-400 bg-gray-400/20'
                          }`}>
                            N{newWeeks}
                          </span>
                        )}
                      </div>

                      {/* 条形图 */}
                      <div className="flex-1 relative h-3 sm:h-4 min-w-0">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: transitionDuration }}
                          className="h-full rounded"
                          style={{ backgroundColor: colorMap[item.name] || '#666' }}
                        />
                        {/* 数值显示（仅管理员可见） */}
                        {showValues && (
                          <div className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 text-white text-[10px] sm:text-xs font-semibold">
                            {item.value.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            {/* 小屏幕：时间和总计（浮动在右下角） */}
            <div className={`lg:hidden absolute bottom-0 text-right pointer-events-none ${
              showValues ? 'right-8 sm:right-16 md:right-20' : 'right-4 sm:right-8 md:right-12'
            }`}>
              <div className="text-sm sm:text-base md:text-lg text-gray-400/80 font-mono leading-none">
                {currentData.timestamp.split(' ')[0] || ''}
              </div>
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-300/80 font-mono leading-none mt-1">
                {currentData.timestamp.split(' ')[1] || currentData.timestamp}
              </div>
              {/* 总计（仅管理员可见） */}
              {showValues && (
                <div className="text-base sm:text-lg md:text-xl text-gray-500/80 mt-1">
                  Total: {currentData.total.toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* 大屏幕：右侧时间和总计 */}
          <div className="hidden lg:flex w-64 xl:w-96 flex-col justify-center items-center flex-shrink-0">
            <div className="text-center">
              <div className="text-xl xl:text-2xl text-gray-400 mb-2 font-mono leading-none">
                {currentData.timestamp.split(' ')[0] || ''}
              </div>
              <div className="text-6xl xl:text-8xl font-bold text-gray-300 mb-3 xl:mb-4 font-mono leading-none">
                {currentData.timestamp.split(' ')[1] || currentData.timestamp}
              </div>
              {/* 总计（仅管理员可见） */}
              {showValues && (
                <div className="text-xl xl:text-2xl text-gray-500 mb-6 xl:mb-8">
                  Total: {currentData.total.toLocaleString()}
                </div>
              )}
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
            <div
              className="flex-1 relative px-4 viewport-scroll-area"
              style={{
                cursor: enableViewport && isDraggingViewport ? 'grabbing' : enableViewport ? 'grab' : 'default'
              }}
              onMouseDown={(e) => {
                // 如果点击的是进度条容器，不处理（让进度条自己处理）
                const isProgressBar = e.target.closest('.progress-bar-container')
                if (isProgressBar) return

                // 视窗拖动
                if (!enableViewport) return

                e.preventDefault()
                e.stopPropagation()
                setIsDraggingViewport(true)
                const startX = e.clientX
                const startIndex = viewportStart
                const containerWidth = e.currentTarget.offsetWidth - 32 // 缓存容器宽度，减去 padding
                let rafId = null
                let latestClientX = startX // 保存最新鼠标位置

                const handleMove = (moveEvent) => {
                  latestClientX = moveEvent.clientX // 始终更新最新位置

                  if (rafId) return // 如果已有待处理的帧，等待下次

                  rafId = requestAnimationFrame(() => {
                    const deltaX = latestClientX - startX // 使用最新位置
                    const deltaFrames = Math.round((deltaX / containerWidth) * (viewportEnd - viewportStart))
                    const newStart = Math.max(0, Math.min(
                      timeline.length - viewportWidth,
                      startIndex - deltaFrames
                    ))
                    setViewportStart(newStart)
                    rafId = null
                  })
                }

                const handleEnd = () => {
                  setIsDraggingViewport(false)
                  if (rafId) cancelAnimationFrame(rafId)

                  // 拖动结束后，如果 currentFrame 超出视窗，调整到边界
                  const deltaX = latestClientX - startX
                  const deltaFrames = Math.round((deltaX / containerWidth) * (viewportEnd - viewportStart))
                  const finalViewportStart = Math.max(0, Math.min(
                    timeline.length - viewportWidth,
                    startIndex - deltaFrames
                  ))
                  const finalViewportEnd = Math.min(finalViewportStart + viewportWidth, timeline.length)

                  if (currentFrame !== null) {
                    if (currentFrame < finalViewportStart) {
                      setCurrentFrame(finalViewportStart) // 超出左边界，移到左边界
                    } else if (currentFrame >= finalViewportEnd) {
                      setCurrentFrame(finalViewportEnd - 1) // 超出右边界，移到右边界
                    }
                  }

                  document.removeEventListener('mousemove', handleMove)
                  document.removeEventListener('mouseup', handleEnd)
                }

                document.addEventListener('mousemove', handleMove)
                document.addEventListener('mouseup', handleEnd)
              }}
              onTouchStart={(e) => {
                // 如果触摸的是进度条容器，不处理
                if (e.target.closest('.progress-bar-container')) return

                // 视窗拖动
                if (!enableViewport) return

                e.preventDefault() // 阻止浏览器默认滚动
                e.stopPropagation()
                setIsDraggingViewport(true)
                const startX = e.touches[0].clientX
                const startIndex = viewportStart
                const containerWidth = e.currentTarget.offsetWidth - 32 // 缓存容器宽度，减去 padding
                let rafId = null
                let latestClientX = startX // 保存最新触摸位置

                const handleMove = (moveEvent) => {
                  if (!moveEvent.touches || moveEvent.touches.length === 0) return
                  moveEvent.preventDefault() // 阻止滚动
                  latestClientX = moveEvent.touches[0].clientX // 始终更新最新位置

                  if (rafId) return // 如果已有待处理的帧，等待下次

                  rafId = requestAnimationFrame(() => {
                    const deltaX = latestClientX - startX // 使用最新位置
                    const deltaFrames = Math.round((deltaX / containerWidth) * (viewportEnd - viewportStart))
                    const newStart = Math.max(0, Math.min(
                      timeline.length - viewportWidth,
                      startIndex - deltaFrames
                    ))
                    setViewportStart(newStart)
                    rafId = null
                  })
                }

                const handleEnd = () => {
                  setIsDraggingViewport(false)
                  if (rafId) cancelAnimationFrame(rafId)

                  // 拖动结束后，如果 currentFrame 超出视窗，调整到边界
                  const deltaX = latestClientX - startX
                  const deltaFrames = Math.round((deltaX / containerWidth) * (viewportEnd - viewportStart))
                  const finalViewportStart = Math.max(0, Math.min(
                    timeline.length - viewportWidth,
                    startIndex - deltaFrames
                  ))
                  const finalViewportEnd = Math.min(finalViewportStart + viewportWidth, timeline.length)

                  if (currentFrame !== null) {
                    if (currentFrame < finalViewportStart) {
                      setCurrentFrame(finalViewportStart) // 超出左边界，移到左边界
                    } else if (currentFrame >= finalViewportEnd) {
                      setCurrentFrame(finalViewportEnd - 1) // 超出右边界，移到右边界
                    }
                  }

                  document.removeEventListener('touchmove', handleMove)
                  document.removeEventListener('touchend', handleEnd)
                }

                document.addEventListener('touchmove', handleMove, { passive: false }) // 非 passive 才能 preventDefault
                document.addEventListener('touchend', handleEnd)
              }}
            >
              {/* 计算日期区间数据 */}
              {(() => {
                // 按日期分组帧
                const dateRanges = []
                let currentDate = null
                let rangeStart = 0
                let currentDay = null

                timeline.forEach((frame, index) => {
                  const date = frame.timestamp.split(' ')[0] // 提取日期部分 "10月27日"
                  const dayMatch = date.match(/(\d+)日/) || date.match(/-(\d+)$/)
                  const day = dayMatch ? dayMatch[1] : ''

                  if (date !== currentDate) {
                    if (currentDate !== null) {
                      // 保存上一个日期区间
                      dateRanges.push({
                        date: currentDate,
                        day: currentDay,
                        start: rangeStart,
                        end: index - 1
                      })
                    }
                    currentDate = date
                    currentDay = day
                    rangeStart = index
                  }

                  // 最后一个区间
                  if (index === timeline.length - 1) {
                    dateRanges.push({
                      date: currentDate,
                      day: currentDay,
                      start: rangeStart,
                      end: index
                    })
                  }
                })

                return (
                  <>
                    {/* 背景日期区间层 - 统一深色调 */}
                    <div className="absolute top-0 left-4 right-4 h-full pointer-events-none">
                      {dateRanges
                        .filter(range => {
                          // 视窗模式：只显示与视窗范围有交集的日期区间
                          if (!enableViewport) return true
                          return range.end >= viewportStart && range.start < viewportEnd
                        })
                        .map((range, idx) => {
                          let visibleStart, visibleEnd
                          if (enableViewport) {
                            // 计算在视窗中的可见范围
                            visibleStart = Math.max(range.start, viewportStart)
                            visibleEnd = Math.min(range.end, viewportEnd - 1)

                            // 计算相对于视窗的百分比
                            const startPercent = ((visibleStart - viewportStart) / (viewportEnd - viewportStart)) * 100
                            const endPercent = ((visibleEnd - viewportStart) / (viewportEnd - viewportStart)) * 100
                            const width = endPercent - startPercent

                            return (
                              <div
                                key={idx}
                                className="absolute top-0 h-full"
                                style={{
                                  left: `${startPercent}%`,
                                  width: `${width}%`,
                                  background: idx % 2 === 0
                                    ? 'linear-gradient(to bottom, rgba(99, 102, 241, 0.25), rgba(99, 102, 241, 0.15))'
                                    : 'linear-gradient(to bottom, rgba(139, 92, 246, 0.28), rgba(139, 92, 246, 0.18))',
                                  borderLeft: visibleStart > viewportStart ? '1px solid rgba(139, 92, 246, 0.45)' : 'none'
                                }}
                              />
                            )
                          } else {
                            // 正常模式
                            const startPercent = (range.start / (timeline.length - 1)) * 100
                            const endPercent = (range.end / (timeline.length - 1)) * 100
                            const width = endPercent - startPercent

                            return (
                              <div
                                key={idx}
                                className="absolute top-0 h-full"
                                style={{
                                  left: `${startPercent}%`,
                                  width: `${width}%`,
                                  background: idx % 2 === 0
                                    ? 'linear-gradient(to bottom, rgba(99, 102, 241, 0.25), rgba(99, 102, 241, 0.15))'
                                    : 'linear-gradient(to bottom, rgba(139, 92, 246, 0.28), rgba(139, 92, 246, 0.18))',
                                  borderLeft: idx > 0 ? '1px solid rgba(139, 92, 246, 0.45)' : 'none'
                                }}
                              />
                            )
                          }
                        })}

                      {/* 时间戳边界光晕 */}
                      {(() => {
                        if (enableViewport) {
                          // 视窗模式：只在视窗包含边界时显示
                          return (
                            <>
                              {viewportStart === 0 && (
                                <div
                                  className="absolute top-0 h-full pointer-events-none"
                                  style={{
                                    left: '0',
                                    width: '4px',
                                    background: 'linear-gradient(to right, rgba(239, 68, 68, 0.4), rgba(239, 68, 68, 0))'
                                  }}
                                />
                              )}
                              {viewportEnd >= timeline.length && (
                                <div
                                  className="absolute top-0 h-full pointer-events-none"
                                  style={{
                                    right: '0',
                                    width: '4px',
                                    background: 'linear-gradient(to left, rgba(34, 197, 94, 0.4), rgba(34, 197, 94, 0))'
                                  }}
                                />
                              )}
                            </>
                          )
                        } else {
                          // 正常模式：始终显示两条边界光晕
                          return (
                            <>
                              <div
                                className="absolute top-0 h-full pointer-events-none"
                                style={{
                                  left: '0',
                                  width: '4px',
                                  background: 'linear-gradient(to right, rgba(239, 68, 68, 0.4), rgba(239, 68, 68, 0))'
                                }}
                              />
                              <div
                                className="absolute top-0 h-full pointer-events-none"
                                style={{
                                  right: '0',
                                  width: '4px',
                                  background: 'linear-gradient(to left, rgba(34, 197, 94, 0.4), rgba(34, 197, 94, 0))'
                                }}
                              />
                            </>
                          )
                        }
                      })()}
                    </div>

                    {/* 时间标签层 */}
                    <div className="relative h-5 mb-1">
                      {/* 时间刻度标签 */}
                      {(() => {
                        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
                        const isTablet = typeof window !== 'undefined' && window.innerWidth < 1024

                        const visibleRange = enableViewport ? (viewportEnd - viewportStart) : timeline.length

                        // 统一使用 12 刻度计算 step，保证所有设备刻度位置一致
                        const baseTickCount = Math.min(12, Math.max(4, Math.floor(visibleRange / 10)))
                        const step = Math.floor(visibleRange / baseTickCount)
                        const labels = []

                        for (let i = 0; i <= baseTickCount; i++) {
                          // 手机端只显示偶数刻度（每隔一个显示，6个刻度）
                          if (isMobile && i % 2 !== 0 && i !== baseTickCount) continue
                          const frameIndex = enableViewport
                            ? Math.min(viewportStart + i * step, viewportEnd - 1)
                            : Math.min(i * step, timeline.length - 1)

                          let percentage
                          if (enableViewport) {
                            percentage = ((frameIndex - viewportStart) / (viewportEnd - viewportStart)) * 100
                          } else {
                            percentage = (frameIndex / (timeline.length - 1)) * 100
                          }

                          labels.push(
                            <div
                              key={i}
                              className="absolute -translate-x-1/2 z-10"
                              style={{ left: `${percentage}%` }}
                            >
                              <div className="text-[9px] sm:text-[10px] text-gray-400 font-mono whitespace-nowrap">
                                {timeline[frameIndex]?.timestamp.split(' ')[1] || ''}
                              </div>
                            </div>
                          )
                        }
                        return labels
                      })()}

                      {/* 日期圆球层 - 贴着底部 */}
                      {dateRanges
                        .filter(range => {
                          if (!enableViewport) return true
                          return range.end >= viewportStart && range.start < viewportEnd
                        })
                        .map((range, idx) => {
                          const centerFrame = Math.floor((range.start + range.end) / 2)

                          // 如果圆球的中心不在视窗范围内，则不显示
                          if (enableViewport && (centerFrame < viewportStart || centerFrame >= viewportEnd)) {
                            return null
                          }

                          let centerPercent
                          if (enableViewport) {
                            centerPercent = ((centerFrame - viewportStart) / (viewportEnd - viewportStart)) * 100
                          } else {
                            centerPercent = (centerFrame / (timeline.length - 1)) * 100
                          }

                          return (
                            <div
                              key={`ball-${idx}`}
                              className="absolute bottom-0 translate-y-1/2 -translate-x-1/2 pointer-events-none z-0"
                              style={{ left: `${centerPercent}%` }}
                            >
                              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-purple-500/20 border border-purple-400/40 flex items-center justify-center flex-shrink-0">
                                <span className="text-[7px] sm:text-[8px] text-purple-200/90 font-bold leading-none">
                                  {range.day}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </>
                )
              })()}

              {/* 进度条容器 */}
              <div
                className="progress-bar-container relative h-6 select-none"
                style={{
                  touchAction: 'none',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation() // 防止触发外层的视窗拖动

                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = e.clientX - rect.left
                  const percentage = Math.max(0, Math.min(1, x / rect.width))

                  let newFrame
                  if (enableViewport) {
                    // 视窗模式：点击位置映射到视窗范围内的帧
                    newFrame = Math.round(viewportStart + percentage * (viewportEnd - viewportStart))
                  } else {
                    // 正常模式：点击位置映射到全部帧
                    newFrame = Math.round(percentage * (timeline.length - 1))
                  }

                  setCurrentFrame(newFrame)
                  setIsPlaying(false)
                }}
                onMouseDown={(e) => {
                  e.stopPropagation() // 防止触发外层的视窗拖动
                  e.preventDefault()
                  const rect = e.currentTarget.getBoundingClientRect()

                  // 正常帧拖动模式
                  const handleMove = (moveEvent) => {
                    const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX
                    const x = clientX - rect.left
                    const percentage = Math.max(0, Math.min(1, x / rect.width))

                    let newFrame
                    if (enableViewport) {
                      newFrame = Math.round(viewportStart + percentage * (viewportEnd - viewportStart))
                    } else {
                      newFrame = Math.round(percentage * (timeline.length - 1))
                    }

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
                  e.stopPropagation() // 防止触发外层的视窗拖动
                  const rect = e.currentTarget.getBoundingClientRect()

                  // 正常帧拖动模式
                  const handleMove = (moveEvent) => {
                    const clientX = moveEvent.touches[0].clientX
                    const x = clientX - rect.left
                    const percentage = Math.max(0, Math.min(1, x / rect.width))

                    let newFrame
                    if (enableViewport) {
                      newFrame = Math.round(viewportStart + percentage * (viewportEnd - viewportStart))
                    } else {
                      newFrame = Math.round(percentage * (timeline.length - 1))
                    }

                    setCurrentFrame(newFrame)
                    setIsPlaying(false)
                  }

                  const handleEnd = () => {
                    document.removeEventListener('touchmove', handleMove)
                    document.removeEventListener('touchend', handleEnd)
                  }

                  document.addEventListener('touchmove', handleMove, { passive: true })
                  document.addEventListener('touchend', handleEnd)
                }}
              >
                {/* 刻度线 */}
                <div className="absolute top-0 left-0 right-0 h-2">
                  {(() => {
                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
                    const isTablet = typeof window !== 'undefined' && window.innerWidth < 1024

                    const visibleRange = enableViewport ? (viewportEnd - viewportStart) : timeline.length

                    // 统一使用 12 刻度计算 step，保证所有设备刻度位置一致
                    const baseTickCount = Math.min(12, Math.max(4, Math.floor(visibleRange / 10)))
                    const step = Math.floor(visibleRange / baseTickCount)

                    const ticks = []

                    for (let i = 0; i <= baseTickCount; i++) {
                      // 手机端只显示偶数刻度（每隔一个显示，6个刻度）
                      if (isMobile && i % 2 !== 0 && i !== baseTickCount) continue
                      const frameIndex = enableViewport
                        ? Math.min(viewportStart + i * step, viewportEnd - 1)
                        : Math.min(i * step, timeline.length - 1)

                      let percentage
                      if (enableViewport) {
                        // 视窗模式：相对于视窗范围的百分比
                        percentage = ((frameIndex - viewportStart) / (viewportEnd - viewportStart)) * 100
                      } else {
                        // 正常模式：相对于全部帧的百分比
                        percentage = (frameIndex / (timeline.length - 1)) * 100
                      }

                      ticks.push(
                        <div
                          key={i}
                          className="absolute w-px h-2 bg-gray-600"
                          style={{ left: `${percentage}%`, transform: 'translateX(-100%)' }}
                        />
                      )
                    }
                    return ticks
                  })()}
                </div>

                {/* 进度条轨道 */}
                <div className="absolute top-2 left-0 right-0 h-1 bg-[#0a2e47] rounded-full overflow-hidden">
                  {/* 进度条填充 - 简洁紫色渐变 */}
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 via-fuchsia-500 to-violet-600"
                    style={{
                      width: enableViewport
                        ? `${((currentFrame - viewportStart) / (viewportEnd - viewportStart)) * 100}%`
                        : `${(currentFrame / (timeline.length - 1)) * 100}%`
                    }}
                  />
                </div>

                {/* 三角形指针 */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: enableViewport
                      ? `${((currentFrame - viewportStart) / (viewportEnd - viewportStart)) * 100}%`
                      : `${(currentFrame / (timeline.length - 1)) * 100}%`,
                    top: '12px',
                    transform: 'translateX(-50%)'
                  }}
                >
                  <svg width="14" height="12" viewBox="0 0 14 12" style={{ filter: 'drop-shadow(0 2px 4px rgba(168, 85, 247, 0.5))' }}>
                    <defs>
                      <linearGradient id="pointerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: 'rgb(216, 180, 254)', stopOpacity: 1 }} />
                        <stop offset="50%" style={{ stopColor: 'rgb(192, 132, 252)', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: 'rgb(147, 51, 234)', stopOpacity: 1 }} />
                      </linearGradient>
                    </defs>
                    <polygon points="7,0 0,12 14,12" fill="url(#pointerGradient)" />
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
                onClick={() => setTotalDuration(totalDuration + 5)}
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
