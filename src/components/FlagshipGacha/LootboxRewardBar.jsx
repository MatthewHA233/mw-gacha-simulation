import { useState, useEffect, useRef } from 'react'
import { SquareItem } from '../SquareItem'

export function LootboxRewardBar({ items = [], rewards = [], isScrolling = false, scrollDuration = 3500 }) {
  const [translateX, setTranslateX] = useState(0)
  const [displayItems, setDisplayItems] = useState([])
  const [hasTransition, setHasTransition] = useState(false)
  const [opacity, setOpacity] = useState(0)
  const containerRef = useRef(null)
  const contentRef = useRef(null) // 内容层容器引用
  const fadeOutTimerRef = useRef(null)
  const wasScrollingRef = useRef(false) // 记录上一次的滚动状态
  const itemSize = 60 // SquareItem size
  const itemGap = 8 // gap-2 = 8px
  const itemWidth = itemSize + itemGap // 68px

  // 监听 isScrolling 变化，触发淡出
  useEffect(() => {
    // 从 true 变为 false：开始淡出
    if (wasScrollingRef.current && !isScrolling) {
      console.log('[LootboxRewardBar] isScrolling 变为 false，开始淡出')
      setOpacity(0)

      // 淡出完成后清空显示内容
      fadeOutTimerRef.current = setTimeout(() => {
        setDisplayItems([])
        setHasTransition(false)
      }, 500) // 淡出动画500ms
    }

    wasScrollingRef.current = isScrolling
  }, [isScrolling])

  useEffect(() => {
    if (!isScrolling || items.length === 0 || rewards.length === 0) {
      return
    }

    // 开始淡入
    setOpacity(1)

    // 找到第一个奖励物品在items数组中的索引
    const firstReward = rewards[0]
    const targetIndex = items.findIndex(item => item.id === firstReward.id && item.name === firstReward.name)

    if (targetIndex === -1) {
      console.warn('[LootboxRewardBar] 未找到目标奖励物品:', firstReward)
      return
    }

    // 最左侧填充（因为初始位置就在左边，需要避免断开）
    const farLeftPaddingCount = 30
    // 左侧填充（滚动距离）
    const leftPaddingCount = 30
    // 右侧填充（避免视觉截断）
    const rightPaddingCount = 30
    const generatedItems = []

    // 最左侧填充（循环items数组）
    for (let i = 0; i < farLeftPaddingCount; i++) {
      const item = items[i % items.length]
      if (item) {
        generatedItems.push({ ...item, uniqueKey: `far-left-${i}` })
      }
    }

    // 左侧填充
    for (let i = 0; i < leftPaddingCount; i++) {
      generatedItems.push({ ...items[i % items.length], uniqueKey: `left-${i}` })
    }

    // 添加从items开头到目标物品（包含目标物品）
    for (let i = 0; i <= targetIndex; i++) {
      generatedItems.push({ ...items[i], uniqueKey: `main-${i}` })
    }

    // 右侧填充：从目标物品后一位开始循环填充
    for (let i = 0; i < rightPaddingCount; i++) {
      const sourceIndex = (targetIndex + 1 + i) % items.length
      generatedItems.push({ ...items[sourceIndex], uniqueKey: `right-${i}` })
    }

    // 检查是否有无效物品
    const invalidItems = generatedItems.filter(item => !item || !item.name || !item.id)
    if (invalidItems.length > 0) {
      console.error('[LootboxRewardBar] 发现无效物品:', invalidItems)
    }

    console.log('[LootboxRewardBar] 生成的物品数组:', {
      total: generatedItems.length,
      farLeftCount: farLeftPaddingCount,
      leftCount: leftPaddingCount,
      rightCount: rightPaddingCount,
      itemsLength: items.length
    })

    setDisplayItems(generatedItems)

    // 使用内容层容器的宽度来计算中心位置
    const centerOffset = contentRef.current ? contentRef.current.offsetWidth / 2 - itemSize / 2 : 0
    const manualOffset = -20 // 手动左偏移量，修正右偏问题

    // 初始位置：让左侧填充的第一个物品居中（farLeftPaddingCount位置）
    const initialItemIndex = farLeftPaddingCount
    const initialOffset = -initialItemIndex * itemWidth + centerOffset + manualOffset

    // 关闭过渡效果
    setHasTransition(false)

    // 立即设置初始位置（无过渡）
    setTranslateX(initialOffset)

    // 先定住500ms（确保淡入完成并让用户看清），然后再开始滚动动画
    const holdTimer = setTimeout(() => {
      // 目标位置：让目标物品（位于 farLeftPaddingCount + leftPaddingCount + targetIndex）居中
      const targetItemIndex = farLeftPaddingCount + leftPaddingCount + targetIndex
      const targetOffset = -targetItemIndex * itemWidth + centerOffset + manualOffset

      console.log('[LootboxRewardBar] 开始滚动:', {
        targetItemIndex,
        targetOffset,
        centerOffset,
        itemWidth,
        targetItem: generatedItems[targetItemIndex]
      })

      // 启用过渡效果
      setHasTransition(true)

      // 稍微延迟一下，确保transition生效
      requestAnimationFrame(() => {
        setTranslateX(targetOffset)
      })
    }, 500)

    return () => {
      clearTimeout(holdTimer)
      if (fadeOutTimerRef.current) {
        clearTimeout(fadeOutTimerRef.current)
      }
    }
  }, [isScrolling, items, rewards])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-28 pointer-events-none select-none"
      style={{
        opacity: opacity,
        transition: 'opacity 500ms ease-in-out'
      }}
    >
      {/* ======= 金属边框主体 ======= */}
      <svg
        className="absolute inset-0 w-full h-full z-0"
        viewBox="0 0 100 14"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* 外层深金属渐变 */}
          <linearGradient id="outerMetal" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#2a2b2f" />
            <stop offset="25%" stopColor="#3b3e44" />
            <stop offset="75%" stopColor="#2a2b2f" />
            <stop offset="100%" stopColor="#242528" />
          </linearGradient>

          {/* 内层亮金描线 */}
          <linearGradient id="innerGold" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#a38733" />
            <stop offset="40%" stopColor="#f1d67a" />
            <stop offset="60%" stopColor="#fff3b0" />
            <stop offset="100%" stopColor="#a38733" />
          </linearGradient>

          {/* 内阴影 / 内发光 */}
          <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.7" />
            <feDropShadow dx="0" dy="-1" stdDeviation="1" floodColor="#fff6b1" floodOpacity="0.1" />
          </filter>

          {/* 边缘发光（微金属反射） */}
          <linearGradient id="edgeLight" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          {/* 蓝色荧光中线渐变 */}
          <linearGradient id="centerLineGlow" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
          </linearGradient>

          {/* 蓝色外发光滤镜 */}
          <filter id="blueGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feFlood floodColor="#60a5fa" floodOpacity="0.8" />
            <feComposite in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 外框主体 */}
        <path
          d="
            M 2 1
            L 46 1
            L 47 2
            L 53 2
            L 54 1
            L 98 1
            L 99 2
            L 99 12
            L 98 13
            L 54 13
            L 53 12
            L 47 12
            L 46 13
            L 2 13
            L 1 12
            L 1 2
            Z
          "
          fill="url(#outerMetal)"
          stroke="#1c1d20"
          strokeWidth="0.5"
          filter="url(#innerShadow)"
        />

        {/* 内层亮金描边 */}
        <path
          d="
            M 2.3 1.3
            L 45.7 1.3
            L 46.7 2.3
            L 53.3 2.3
            L 54.3 1.3
            L 97.7 1.3
            L 98.7 2.3
            L 98.7 11.7
            L 97.7 12.7
            L 54.3 12.7
            L 53.3 11.7
            L 46.7 11.7
            L 45.7 12.7
            L 2.3 12.7
            L 1.3 11.7
            L 1.3 2.3
            Z
          "
          fill="none"
          stroke="url(#innerGold)"
          strokeWidth="0.5"
        />

        {/* 上下反射亮线（内边缘） */}
        <rect x="2.3" y="1.3" width="95.4" height="0.3" fill="url(#edgeLight)" />
        <rect x="2.3" y="12.4" width="95.4" height="0.3" fill="url(#edgeLight)" transform="scale(1,-1) translate(0,-25.4)" />
      </svg>

      {/* ======= 内容层（滑动奖励） ======= */}
      <div
        ref={contentRef}
        className="absolute z-10 flex items-center overflow-hidden"
        style={{
          left: '1.65%',   // 对应 (1 + 2.3) / 2
          right: '1.65%',  // 对应 (1 + 2.3) / 2
          top: '16.4%',    // 对应 SVG y=2.3 (2.3/14≈16.4%)
          bottom: '16.4%'  // 对应 SVG y=11.7 ((14-11.7)/14≈16.4%)
        }}
      >
        <div
          className="flex items-center gap-2 px-4"
          style={{
            transform: `translateX(${translateX}px)`,
            // 更激进的缓动曲线：开始极快、结束时快速减速
            transition: hasTransition ? `transform ${scrollDuration}ms cubic-bezier(0.11, 0.99, 0.28, 1)` : 'none',
          }}
        >
          {displayItems.map((item, index) => (
            <div key={item.uniqueKey || `${item.id}-${index}`} className="flex-shrink-0">
              <SquareItem item={item} size={60} />
            </div>
          ))}
        </div>
      </div>

      {/* ======= 居中定位竖线（蓝色荧光质感） ======= */}
      <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 z-40 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
        <svg className="h-full w-[20px]" viewBox="0 0 10 100" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="blueLine" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="50%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>

            {/* 蓝色外发光滤镜 */}
            <filter id="blueGlow2" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feFlood floodColor="#3b82f6" floodOpacity="1" />
              <feComposite in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 外层蓝色荧光（模糊背景） */}
          <line
            x1="5"
            y1="12"
            x2="5"
            y2="88"
            stroke="#3b82f6"
            strokeWidth="10"
            strokeLinecap="round"
            opacity="0.8"
            filter="url(#blueGlow2)"
          />

          {/* 主体蓝色金属质感线 */}
          <line
            x1="5"
            y1="12"
            x2="5"
            y2="88"
            stroke="url(#blueLine)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* 内层明亮反光线 - 降低透明度 */}
          <line
            x1="3.5"
            y1="12"
            x2="3.5"
            y2="88"
            stroke="white"
            strokeOpacity="0.3"
            strokeWidth="1"
            strokeLinecap="round"
          />

          {/* 右侧暗部阴影 */}
          <line
            x1="6.5"
            y1="12"
            x2="6.5"
            y2="88"
            stroke="#1e3a8a"
            strokeOpacity="0.8"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  )
}
