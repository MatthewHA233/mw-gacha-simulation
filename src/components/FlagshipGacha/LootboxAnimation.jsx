'use client'

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CDN_BASE_URL } from '../../utils/constants'
import { buildLootboxTicketUrl } from '../../services/cdnService'

/**
 * 宝箱开启动画组件
 * 核心动画流程：震动 → 打开 → 奖励展示
 */
export const LootboxAnimation = forwardRef(({ activityId, lootboxType = 'event_premium', onComplete, onRewardStage }, ref) => {
  const [stage, setStage] = useState('idle') // idle, shake, steamBurst, open, reward
  const [isAnimating, setIsAnimating] = useState(false)
  const [showSteam, setShowSteam] = useState(false)

  // 音频引用
  const audioRefs = useRef({
    down: null,
    shaking: null,
    open: null,
  })

  // 预加载音频
  useEffect(() => {
    // 根据宝箱类型选择音效路径
    const audioPath = lootboxType === 'event_premium' ? 'lootbox_premium' : 'lootbox_common'
    audioRefs.current.down = new Audio(`${CDN_BASE_URL}/audio/${audioPath}/lootbox_down.wav`)
    audioRefs.current.shaking = new Audio(`${CDN_BASE_URL}/audio/${audioPath}/lootbox_shaking_loop.wav`)
    audioRefs.current.shaking.loop = true
    audioRefs.current.open = new Audio(`${CDN_BASE_URL}/audio/${audioPath}/lootbox_open.wav`)

    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause()
          audio.currentTime = 0
        }
      })
    }
  }, [lootboxType])

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
    await new Promise(resolve => setTimeout(resolve, 1400))

    // 4. 显示奖励（音效播放完毕）
    setStage('reward')

    // 触发奖励阶段回调（此时显示奖励弹窗）
    if (onRewardStage) {
      onRewardStage()
    }

    await new Promise(resolve => setTimeout(resolve, 800))

    // 完成回调
    if (onComplete) {
      onComplete()
    }

    // 重置
    setStage('idle')
    setIsAnimating(false)
  }

  // 重置动画
  const resetAnimation = () => {
    setStage('idle')
    setIsAnimating(false)
    setShowSteam(false)
    stopSound('shaking')
  }

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    start: startAnimation,
    reset: resetAnimation,
  }))

  // 构建宝箱图片路径 - 使用动态路由（使用传入的 lootboxType 参数）
  const lootboxImageUrl = buildLootboxTicketUrl(lootboxType, activityId)

  console.log('[LootboxAnimation] Activity ID:', activityId)
  console.log('[LootboxAnimation] Lootbox Image URL:', lootboxImageUrl)
  console.log('[LootboxAnimation] Current Stage:', stage)

  return (
    <div className="relative w-full h-full flex items-center justify-center">
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
              src={lootboxImageUrl}
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
  )
})

LootboxAnimation.displayName = 'LootboxAnimation'
