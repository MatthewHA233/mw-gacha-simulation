'use client'

import { motion } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useActivityList } from '../../hooks/useActivityList'
import { buildWidgetUrl, getGachaTypePath } from '../../services/cdnService'
import { activityWindowParts } from '../../utils/activityWindow'
import { useSound } from '../../hooks/useSound'
import { useMusic } from '../music/MusicProvider'
import { VersionModal } from './VersionModal'
import './Sidebar.css'

export function Sidebar({
  isOpen,
  onClose,
  onOpenSponsor,
  isMobile = false,
  versionModalOpen = false,
  onVersionModalChange = () => {}
}) {
  const { activities, loading, error } = useActivityList()
  const router = useRouter()
  const pathname = usePathname()

  // 从路径中提取当前活动 ID
  const currentActivityId = pathname?.split('/').pop() || ''
  const { playButtonClick } = useSound()

  const scrollContainerRef = useRef(null)
  const activeItemRef = useRef(null)

  // 活动列表加载后，将当前活动卡片滚动到容器中央
  useEffect(() => {
    if (!activities.length || !activeItemRef.current || !scrollContainerRef.current) return
    const container = scrollContainerRef.current
    const item = activeItemRef.current
    const target = item.offsetTop - container.clientHeight / 2 + item.offsetHeight / 2
    container.scrollTop = Math.max(0, target)
  }, [activities])

  // 背景音乐：音频与播放状态在根布局的 MusicProvider（2026-10-15 抽出来，换页面不中断）；这里只画频谱 + 播放按钮
  const { isPlaying, toggle: toggleMusic, analyserRef } = useMusic()
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!isPlaying) return
    let frame = 0
    const draw = () => {
      frame = requestAnimationFrame(draw)
      const analyser = analyserRef.current
      const canvas = canvasRef.current
      if (!analyser || !canvas) return
      const ctx = canvas.getContext('2d')
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      analyser.getByteFrequencyData(dataArray)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const barWidth = canvas.width / bufferLength
      let x = 0
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8
        const hue = (i / bufferLength) * 360
        ctx.shadowBlur = 15
        ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.8)`
        ctx.fillStyle = `hsla(${hue}, 90%, 65%, 0.85)`
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)
        x += barWidth + 1
      }
      ctx.shadowBlur = 0
    }
    draw()
    return () => {
      cancelAnimationFrame(frame)
      const canvas = canvasRef.current
      canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [isPlaying, analyserRef])

  // 播放/暂停切换
  const togglePlay = (e) => {
    e.stopPropagation()
    playButtonClick()
    toggleMusic()
  }

  const handleActivityClick = (activity) => {
    playButtonClick()
    const typePath = getGachaTypePath(activity.gacha_type)
    router.push(`/gacha/${typePath}/${activity.id}`)
    onClose()
  }

  const handleLogoClick = (e) => {
    e.stopPropagation()
    playButtonClick()
    onVersionModalChange(true)
  }

  return (
    <motion.div
      initial={false}
      animate={{ width: isOpen ? (isMobile ? '210px' : '420px') : '0px' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="relative flex-shrink-0 bg-black overflow-hidden"
      style={{ maxWidth: isOpen ? (isMobile ? '42.5vw' : '85vw') : '0' }}
    >
      <div className="w-[210px] md:w-[420px] max-w-[42.5vw] md:max-w-[85vw] h-full flex flex-col">
        {/* 顶部网站Logo */}
        <div
          className="py-3 md:py-4 px-2 md:px-4 border-b border-white/10 bg-gradient-to-br from-slate-950 to-black relative overflow-hidden"
        >
          {/* 音频波纹背景 */}
          <canvas
            ref={canvasRef}
            width={420}
            height={80}
            className="absolute inset-0 w-full h-full opacity-70 pointer-events-none"
          />

          <div className="flex items-center gap-1 md:gap-3 relative z-10">
            {/* Logo - 播放时脉冲发光，可点击打开版本信息 */}
            <motion.div
              onClick={handleLogoClick}
              className="relative flex-shrink-0 cursor-pointer"
              animate={isPlaying ? {
                scale: [1, 1.15, 1]
              } : {}}
              transition={isPlaying ? {
                duration: 1, // BPM 120 = 每秒2拍，脉冲每两拍一次 = 1秒
                repeat: Infinity,
                ease: "easeInOut"
              } : {}}
            >
              <img
                src="/MW.png"
                alt="MW"
                className="w-7 h-7 md:w-10 md:h-10 object-contain"
                style={{
                  filter: isPlaying
                    ? 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.6)) drop-shadow(0 0 16px rgba(34, 211, 238, 0.3))'
                    : 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.3))'
                }}
              />
            </motion.div>

            {/* 标题字标（2026-10-15）：去掉 AI 味的彩虹渐变 + 发光，整行做成军事游戏标题的样式（不拆开）：
                粗体右倾 + 金属拉丝质感（上亮下暗、中间一道分界）+ 深色硬投影 */}
            <div className="flex-1 min-w-0">
              <h1 className="whitespace-nowrap overflow-hidden leading-none py-0.5">
                <span
                  className="inline-block -skew-x-12 text-[11px] md:text-lg font-black tracking-[0.02em] md:tracking-[0.06em] pr-1"
                  style={{
                    backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #e2e8f0 46%, #8193a8 52%, #cbd5e1 78%, #f1f5f9 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    filter: 'drop-shadow(0 1px 0 rgba(0, 0, 0, 0.95)) drop-shadow(1px 1px 0 rgba(8, 47, 73, 0.9))',
                  }}
                >
                  现代战舰抽奖模拟器
                </span>
              </h1>
              <div className="flex items-center gap-1 text-[8px] md:text-xs mt-0.5">
                <span className="text-white/60">活动列表</span>
                {isPlaying && <span className="text-cyan-400 animate-pulse">♫</span>}
                {/* 播放/暂停按钮 */}
                <motion.button
                  onClick={togglePlay}
                  className="ml-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.8 }}
                >
                  {isPlaying ? (
                    <svg className="w-3 h-3 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* 活动列表 - 可滚动 */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto py-4 space-y-3 custom-scrollbar">
          {loading && (
            <div className="text-white text-center text-xs md:text-sm">加载中...</div>
          )}
          {error && (
            <div className="text-red-400 text-center text-xs md:text-sm">加载失败</div>
          )}
          {activities.map((activity) => {
            const widgetUrl = buildWidgetUrl(activity)
            const isActive = activity.id === currentActivityId

            return (
              <motion.div
                key={activity.id}
                ref={isActive ? activeItemRef : null}
                className="relative w-full cursor-pointer overflow-hidden group"
                onClick={() => handleActivityClick(activity)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                {/* 固定尺寸容器 */}
                <div className="relative w-full h-[100px] md:h-[200px] overflow-hidden rounded-lg shadow-lg">
                  {/* 图片（裁切填充） */}
                  <img
                    src={widgetUrl}
                    alt={activity.name}
                    className="w-full h-full object-cover"
                  />

                  {/* 选中状态：简洁发光边框 */}
                  {isActive && (
                    <div className="absolute inset-0 ring-2 ring-cyan-400 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.6)]" />
                  )}

                  {/* Hover状态：淡淡的白色边框 */}
                  <div className="absolute inset-0 ring-1 ring-white/0 group-hover:ring-white/30 rounded-lg transition-all duration-300" />

                  {/* 类别标签 - 左上角 */}
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-1.5 md:px-2 py-0.5 rounded text-[7px] md:text-[10px] font-medium text-white/80 border border-white/10">
                    {activity.gacha_type.replace('类', '')}
                  </div>

                  {/* 文本覆盖层 - 底部 */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                    <div className="space-y-0.5">
                      <h2 className="text-white text-[10px] md:text-base font-bold truncate">{activity.name}</h2>
                      <p className="text-white/80 text-[8px] md:text-sm truncate">
                        {(() => {
                          // 有起止时间：日期正常字号，时间（15:00 / 14:59）小一号，窄屏放得下
                          const w = activityWindowParts(activity)
                          if (!w) return activity.formattedDate
                          const time = (t) => <span className="text-[6px] md:text-[11px] text-white/60"> {t}</span>
                          return <>{w.start.date}{time(w.start.time)} ~ {w.end ? <>{w.end.date}{time(w.end.time)}</> : '月底'}</>
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* 当前活动标识 */}
                  {isActive && (
                    <div className="absolute top-2 right-2 bg-cyan-400 text-black text-[8px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 rounded shadow-lg">
                      当前
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* 底部署名 */}
        <div
          className="py-3 px-4 cursor-pointer hover:bg-white/5 transition-all border-t border-white/10 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation()
            onOpenSponsor()
          }}
        >
          <p className="text-white/60 text-[9px] md:text-sm text-center">
            Made by <span className="text-cyan-400 font-semibold">地平线『No.002』CHanGO</span>
          </p>
        </div>
      </div>

      {/* 隐藏的音频元素 */}
      {/* 背景音乐的 <audio> 在根布局的 MusicProvider 里 */}

      {/* 版本信息弹窗 */}
      <VersionModal
        isOpen={versionModalOpen}
        onClose={() => onVersionModalChange(false)}
      />
    </motion.div>
  )
}
