import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useActivityList } from '../../hooks/useActivityList'
import { buildWidgetUrl, getGachaTypePath } from '../../services/cdnService'
import { CDN_BASE_URL } from '../../utils/constants'
import { useSound } from '../../hooks/useSound'
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
  const navigate = useNavigate()
  const { activityId: currentActivityId } = useParams()
  const { playButtonClick } = useSound()

  // 音乐播放器状态 - 从本地存储读取初始状态
  const [isPlaying, setIsPlaying] = useState(() => {
    const saved = localStorage.getItem('sidebar_music_playing')
    const pausedAt = localStorage.getItem('sidebar_music_paused_at')

    // 如果是暂停状态，检查是否超过一天
    if (saved === 'false' && pausedAt) {
      const pausedTime = parseInt(pausedAt, 10)
      const now = Date.now()
      const oneDayInMs = 24 * 60 * 60 * 1000 // 24小时

      // 超过一天，自动恢复为播放状态
      if (now - pausedTime > oneDayInMs) {
        localStorage.setItem('sidebar_music_playing', 'true')
        localStorage.removeItem('sidebar_music_paused_at')
        return true
      }
    }

    return saved === 'true'
  })
  const audioRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)
  const canvasRef = useRef(null)
  const animationIdRef = useRef(null)

  // Web Audio API 初始化
  useEffect(() => {
    if (!audioRef.current || sourceRef.current) return

    audioRef.current.volume = 0.8

    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 64
    const source = audioContext.createMediaElementSource(audioRef.current)
    source.connect(analyser)
    analyser.connect(audioContext.destination)

    audioContextRef.current = audioContext
    analyserRef.current = analyser
    sourceRef.current = source

    const renderWaveformInternal = () => {
      if (!analyserRef.current || !canvasRef.current) return

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const bufferLength = analyserRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const draw = () => {
        animationIdRef.current = requestAnimationFrame(draw)
        analyserRef.current.getByteFrequencyData(dataArray)

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const barWidth = canvas.width / bufferLength
        let x = 0

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height * 0.8
          const hue = (i / bufferLength) * 360

          // 绘制发光效果
          ctx.shadowBlur = 15
          ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.8)`
          ctx.fillStyle = `hsla(${hue}, 90%, 65%, 0.85)`
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)

          x += barWidth + 1
        }

        // 重置阴影
        ctx.shadowBlur = 0
      }

      draw()
    }

    const attemptAutoPlay = async () => {
      // 只在用户之前主动开启过音乐时才自动播放
      const shouldAutoPlay = localStorage.getItem('sidebar_music_playing') === 'true'
      if (!shouldAutoPlay) return

      try {
        if (audioContext.state === 'suspended') await audioContext.resume()
        await audioRef.current.play()
        setIsPlaying(true)
        renderWaveformInternal()
      } catch (error) {
        // 自动播放失败，重置状态
        setIsPlaying(false)
        localStorage.setItem('sidebar_music_playing', 'false')
      }
    }

    attemptAutoPlay()

    const handleFirstInteraction = async () => {
      // 只在用户之前主动开启过音乐时才在首次交互时播放
      const shouldAutoPlay = localStorage.getItem('sidebar_music_playing') === 'true'
      if (!shouldAutoPlay || audioContext.state === 'closed') return

      try {
        if (audioContext.state === 'suspended') await audioContext.resume()
        await audioRef.current.play()
        setIsPlaying(true)
        renderWaveformInternal()
      } catch (e) {
        setIsPlaying(false)
        localStorage.setItem('sidebar_music_playing', 'false')
      }
    }

    document.addEventListener('click', handleFirstInteraction, { once: true, passive: true })

    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)
    }
  }, [])

  // 播放/暂停切换
  const togglePlay = async (e) => {
    e.stopPropagation()
    playButtonClick()
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)
      setIsPlaying(false)
      localStorage.setItem('sidebar_music_playing', 'false')
      localStorage.setItem('sidebar_music_paused_at', Date.now().toString())
    } else {
      try {
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume()
        }
        await audioRef.current.play()
        setIsPlaying(true)
        localStorage.setItem('sidebar_music_playing', 'true')
        localStorage.removeItem('sidebar_music_paused_at') // 清除暂停时间戳

        // 启动波形渲染
        if (!analyserRef.current || !canvasRef.current) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        const draw = () => {
          animationIdRef.current = requestAnimationFrame(draw)
          analyserRef.current.getByteFrequencyData(dataArray)

          ctx.clearRect(0, 0, canvas.width, canvas.height)

          const barWidth = canvas.width / bufferLength
          let x = 0

          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height * 0.8
            const hue = (i / bufferLength) * 360

            // 绘制发光效果
            ctx.shadowBlur = 15
            ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.8)`
            ctx.fillStyle = `hsla(${hue}, 90%, 65%, 0.85)`
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)

            x += barWidth + 1
          }

          // 重置阴影
          ctx.shadowBlur = 0
        }

        draw()
      } catch (error) {
        console.error('[BGM播放失败]', error)
        setIsPlaying(false)
        localStorage.setItem('sidebar_music_playing', 'false')

        // 友好的错误提示
        if (error.name === 'NotAllowedError') {
          console.warn('浏览器阻止自动播放，需要用户交互')
        } else if (error.name === 'NotSupportedError') {
          console.error('音频格式不支持或CORS问题')
        }
      }
    }
  }

  const handleActivityClick = (activity) => {
    playButtonClick()
    const typePath = getGachaTypePath(activity.gacha_type)
    navigate(`/gacha/${typePath}/${activity.id}`)
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
          className="py-3 md:py-4 px-4 border-b border-white/10 bg-gradient-to-br from-slate-950 to-black relative overflow-hidden"
        >
          {/* 音频波纹背景 */}
          <canvas
            ref={canvasRef}
            width={420}
            height={80}
            className="absolute inset-0 w-full h-full opacity-70 pointer-events-none"
          />

          <div className="flex items-center gap-2 md:gap-3 relative z-10">
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

            {/* 文字 - 彩虹渐变光晕效果 */}
            <div className="flex-1 min-w-0">
              <h1
                className="text-[10px] md:text-sm font-bold tracking-wide"
                style={{
                  backgroundImage: 'linear-gradient(to right, #19fdfe 0%, #67e8f9 20%, #a78bfa 40%, #f0abfc 60%, #fef08a 80%, #fef08a 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  filter: 'drop-shadow(0 0 1px rgba(34, 211, 238, 0.4)) drop-shadow(0 0 2px rgba(168, 85, 247, 0.4)) drop-shadow(0 0 3px rgba(232, 121, 249, 0.3)) drop-shadow(0 0 4px rgba(250, 204, 21, 0.3))',
                }}
              >
                现代战舰抽卡模拟器
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
        <div className="flex-1 overflow-y-auto py-4 space-y-3 custom-scrollbar">
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
                      <p className="text-white/80 text-[8px] md:text-sm truncate">{activity.formattedDate}</p>
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
            Made by <span className="text-cyan-400 font-semibold">HORIZN地平线-CHanGO</span>
          </p>
        </div>
      </div>

      {/* 隐藏的音频元素 */}
      <audio
        ref={audioRef}
        src={`${CDN_BASE_URL}/audio/ModernWarships_Menu_Halloween2025_OST.wav`}
        loop
        preload="auto"
        crossOrigin="anonymous"
      />

      {/* 版本信息弹窗 */}
      <VersionModal
        isOpen={versionModalOpen}
        onClose={() => onVersionModalChange(false)}
      />
    </motion.div>
  )
}
