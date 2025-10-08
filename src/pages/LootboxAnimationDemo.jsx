import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CDN_BASE_URL } from '../utils/constants'

/**
 * 宝箱开启动画演示页面 - 精简版
 * 核心动画流程：震动 → 打开 → 奖励展示
 */
export function LootboxAnimationDemo() {
  const [stage, setStage] = useState('idle') // idle, shake, steamBurst, open, reward
  const [isAnimating, setIsAnimating] = useState(false)
  const [debugMode, setDebugMode] = useState(false) // 调试模式：手动控制阶段
  const [selectedLootbox, setSelectedLootbox] = useState('LA96_premium_lootbox_ticket.png')
  const [showSteam, setShowSteam] = useState(false) // 显示烟雾特效
  const [mobileMode, setMobileMode] = useState(false) // 手机端模式：缩小到60%

  // 可用的宝箱列表（仅 Premium 系列）
  const lootboxOptions = [
    'LA96_premium_lootbox_ticket.png',
    'la97_premium_lootbox_ticket.png',
    'bc25_premium_lootbox_ticket.png',
    'bf_premium_lootbox_ticket.png',
    'fop25_premium_lootbox_ticket.png',
    'fp25_premium_lootbox_ticket.png',
    'hp25_premium_lootbox_ticket.png',
    'sf25_premium_lootbox_ticket.png',
  ]

  // 音频引用
  const audioRefs = useRef({
    down: null,
    shaking: null,
    open: null,
  })

  // 预加载音频
  useEffect(() => {
    audioRefs.current.down = new Audio(`${CDN_BASE_URL}/audio/lootbox_premium/lootbox_down.wav`)
    audioRefs.current.shaking = new Audio(`${CDN_BASE_URL}/audio/lootbox_premium/lootbox_shaking_loop.wav`)
    audioRefs.current.shaking.loop = true
    audioRefs.current.open = new Audio(`${CDN_BASE_URL}/audio/lootbox_premium/lootbox_open.wav`)

    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause()
          audio.currentTime = 0
        }
      })
    }
  }, [])

  // 播放音效
  const playSound = (soundName) => {
    const audio = audioRefs.current[soundName]
    if (audio) {
      audio.currentTime = 0
      audio.play().catch(err => console.log('Audio play failed:', err))
    }
  }

  // 停止音效
  const stopSound = (soundName) => {
    const audio = audioRefs.current[soundName]
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
  }

  // 开始开箱动画
  const startAnimation = async () => {
    if (isAnimating) return
    setIsAnimating(true)

    // 1. 震动（重箱子磕到石子的颤抖）
    setStage('shake')
    playSound('down')
    playSound('shaking')
    await new Promise(resolve => setTimeout(resolve, 400))

    // 2. 停止震动音效，播放开箱音效 + 烟雾爆发阶段（大幅度震动）
    stopSound('shaking')
    playSound('open')
    setStage('steamBurst')
    await new Promise(resolve => setTimeout(resolve, 150))

    // 震动结束后显示烟雾
    setShowSteam(true)

    // 等待开箱音效播放到一半再显示开箱动画
    await new Promise(resolve => setTimeout(resolve, 1250))

    // 3. 显示开箱盖和裁剪（开箱音效已经播放了一半）+ 隐藏烟雾
    setShowSteam(false)
    setStage('open')

    // 调试模式：在 open 阶段暂停
    if (debugMode) {
      setIsAnimating(false)
      return
    }

    await new Promise(resolve => setTimeout(resolve, 1400))

    // 4. 显示奖励（音效播放完毕）
    setStage('reward')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 重置
    setStage('idle')
    setIsAnimating(false)
  }

  // 手动切换阶段（调试用）
  const setDebugStage = (newStage) => {
    setStage(newStage)
    setIsAnimating(false)
    stopSound('shaking')
  }

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center overflow-hidden relative">
      {/* 背景光晕 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent pointer-events-none" />

      {/* 标题 */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
        <h1 className="text-3xl font-bold text-white/90 text-center mb-2">
          宝箱开启动画演示
        </h1>
        <p className="text-white/60 text-sm text-center mb-4">
          2D宝箱开启测试
        </p>

        {/* 宝箱选择器 */}
        <div className="flex items-center justify-center gap-2">
          <label className="text-white/70 text-sm">选择宝箱：</label>
          <select
            value={selectedLootbox}
            onChange={(e) => setSelectedLootbox(e.target.value)}
            className="bg-gray-800/80 text-white px-3 py-1 rounded border border-gray-600 text-sm focus:outline-none focus:border-purple-500"
          >
            {lootboxOptions.map((option) => (
              <option key={option} value={option}>
                {option.replace('_lootbox_ticket.png', '').replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 动画舞台 */}
      <div
        className="relative w-full h-full flex items-center justify-center transition-transform duration-300"
        style={{
          transform: mobileMode ? 'scale(0.6)' : 'scale(1)',
        }}
      >

        {/* 待机/震动/打开 - 宝箱主体 */}
        <AnimatePresence mode="wait">
          {(stage === 'idle' || stage === 'shake' || stage === 'steamBurst' || stage === 'open' || stage === 'reward') && (
            <motion.div
              key="lootbox"
              className="relative z-10"
              animate={
                stage === 'shake'
                  ? {
                      rotate: [0, -1.5, 1.5, -2, 2, -1.5, 1.5, -1, 1, -1, 1, -0.5, 0],
                      y: [0, -2, -1, -3, -1.5, -2, -1, -1.5, -1, -1, -0.5, -0.5, 0],
                      x: [0, 2, -2, 3, -2.5, 2, -2, 1.5, -1, 1, -0.5, 0.5, 0],
                    }
                  : stage === 'steamBurst'
                  ? {
                      rotate: [0, -4, 4, 0],
                      y: [0, -6, -4, 0],
                      x: [0, 5, -5, 0],
                    }
                  : { rotate: 0, x: 0, y: 0 }
              }
              transition={{
                duration: stage === 'shake' ? 0.4 : stage === 'steamBurst' ? 0.15 : 0,
                ease: 'linear',
              }}
            >
              {/* 2D宝箱图片 - 底层 */}
              <img
                src={`${CDN_BASE_URL}/lootbox/lootboxtickets.spriteatlas/${selectedLootbox}`}
                alt="Lootbox"
                className="w-56 h-56 object-contain drop-shadow-2xl"
                style={{
                  clipPath: (stage === 'open' || stage === 'reward')
                    ? 'polygon(0 0, 70% 0, 70% 30%, 100% 35%, 100% 75%, 90% 100%, 0 100%)'
                    : 'none',
                  transition: 'clip-path 0s',
                }}
              />

              {/* 烟雾特效图层 - 在蒸汽阶段显示 */}
              {showSteam && (
                <img
                  src={`${CDN_BASE_URL}/lootbox/烟雾.png`}
                  alt="Steam Effect"
                  className="absolute pointer-events-none"
                  style={{
                    width: '800px',
                    height: 'auto',
                    top: '-140px',
                    left: '-305px',
                    maxWidth: 'none',
                    maxHeight: 'none',
                  }}
                />
              )}

              {/* 开箱盖图层 - 在同一个容器内，使用绝对定位覆盖 */}
              {(stage === 'open' || stage === 'reward') && (
                <>
                  <img
                    src={`${CDN_BASE_URL}/lootbox/开箱.png`}
                    alt="Open Lootbox"
                    className="absolute pointer-events-none"
                    style={{
                      width: '230px',
                      height: 'auto',
                      top: '-70px',
                      left: '-10px',
                      maxWidth: 'none',
                      maxHeight: 'none',
                    }}
                  />
                  {/* 开箱时烟雾图层 - 置于更顶层 */}
                  <img
                    src={`${CDN_BASE_URL}/lootbox/开箱时烟雾.png`}
                    alt="Opening Steam"
                    className="absolute pointer-events-none"
                    style={{
                      width: '600px',
                      height: 'auto',
                      top: '-240px',
                      left: '-176px',
                      maxWidth: 'none',
                      maxHeight: 'none',
                      zIndex: 1,
                    }}
                  />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 控制按钮 */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-4 z-30">
        <button
          onClick={startAnimation}
          disabled={isAnimating && !debugMode}
          className={`
            px-8 py-3 rounded-lg font-semibold text-white shadow-lg
            transition-all duration-300 transform
            ${
              isAnimating && !debugMode
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-105 hover:shadow-xl active:scale-95'
            }
          `}
        >
          {isAnimating && !debugMode ? '播放中...' : '开始开箱'}
        </button>

        <button
          onClick={() => setMobileMode(!mobileMode)}
          className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
            mobileMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {mobileMode ? '手机端 60%' : '桌面端 100%'}
        </button>

        <button
          onClick={() => {
            setDebugMode(!debugMode)
            setStage('idle')
            setIsAnimating(false)
            stopSound('shaking')
          }}
          className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
            debugMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {debugMode ? '调试模式 ON' : '调试模式 OFF'}
        </button>

        <button
          onClick={() => {
            setStage('idle')
            setIsAnimating(false)
            stopSound('shaking')
          }}
          className="px-6 py-3 rounded-lg font-semibold text-white bg-gray-700 hover:bg-gray-600 transition-colors"
        >
          重置
        </button>
      </div>

      {/* 调试面板 */}
      {debugMode && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg p-4 z-30">
          <div className="text-white text-sm space-y-2">
            <div className="font-semibold mb-2">阶段切换：</div>
            <div className="flex gap-2">
              {[
                { key: 'idle', label: '待机' },
                { key: 'shake', label: '震动' },
                { key: 'steamBurst', label: '烟雾爆发' },
                { key: 'open', label: '开箱' },
                { key: 'reward', label: '奖励' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setDebugStage(key)}
                  className={`px-3 py-1 rounded transition-all ${
                    stage === key ? 'bg-purple-500 text-white' : 'bg-gray-700 text-white/70 hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 状态指示器 */}
      <div className="absolute top-32 right-8 bg-black/50 backdrop-blur-sm rounded-lg p-4 z-30">
        <div className="text-white/80 text-sm space-y-2">
          <div className="font-semibold mb-3">动画阶段：</div>
          {[
            { key: 'idle', label: '待机' },
            { key: 'shake', label: '震动' },
            { key: 'steamBurst', label: '烟雾爆发' },
            { key: 'open', label: '开箱' },
            { key: 'reward', label: '奖励' },
          ].map(({ key, label }) => (
            <div
              key={key}
              className={`
                px-3 py-1 rounded transition-all
                ${stage === key ? 'bg-purple-500 text-white' : 'text-white/50'}
              `}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
