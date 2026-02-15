'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { CDN_BASE_URL } from '../../utils/constants'
import { useSound } from '../../hooks/useSound'
import { useAuth } from '../../hooks/useAuth'
import { useMilestoneTracker } from '../../hooks/useMilestoneTracker'
import { loadActivityConfig, buildItemImageUrl, IMG_WEBP } from '../../services/cdnService'
import { loadGameState, saveGameState, getDefaultGameState, clearGameState, clearAllGameStates } from '../../utils/gameStateStorage'
import { HeaderSpacer } from '../Layout/HeaderSpacer'
import { LootboxSelector } from './LootboxSelector'
import { LootboxAnimation } from './LootboxAnimation'
import { LootboxRewardBar } from './LootboxRewardBar'
import { LootboxItemGrid } from './LootboxItemGrid'
import { ResultModal } from '../ui/ResultModal'
import { ShopModal } from '../ChipGacha/ShopModal'
import { HistoryModal } from '../ChipGacha/HistoryModal'
import { InfoModal } from '../ChipGacha/InfoModal'
import { SponsorModal } from '../ChipGacha/SponsorModal'
import { ConfirmModal } from '../ui/ConfirmModal'
import { ResetModal } from '../ui/ResetModal'
import { MembershipModal } from '../ui/MembershipModal'

/**
 * 旗舰宝箱类抽卡组件
 */
export function FlagshipGacha({
  activityId,
  itemScale,
  sponsorModal,
  onSetSponsorModal,
  onUpdateHeader
}) {
  const { playSound } = useSound()
  const { isPremium } = useAuth()
  const [infoModal, setInfoModal] = useState(false)
  const [shopModal, setShopModal] = useState(false)
  const [historyModal, setHistoryModal] = useState(false)
  const [resetModal, setResetModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState(false)
  const [showMembershipModal, setShowMembershipModal] = useState(false)

  // 选中的宝箱类型
  const [selectedLootboxType, setSelectedLootboxType] = useState('event_premium')

  // 宝箱动画引用
  const lootboxAnimationRef = useRef(null)

  // 动画状态
  const [isAnimating, setIsAnimating] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)

  // 待显示的奖励
  const pendingRewardsRef = useRef([])

  // 待执行的抽奖参数
  const pendingDrawRef = useRef(null)

  // 防止 performDraw 重复执行的锁
  const isPerformingDrawRef = useRef(false)

  // 停止动画标志
  const stopAnimationRef = useRef(false)

  // 活动配置
  const [activityConfig, setActivityConfig] = useState({
    id: activityId,
    metadata: {
      name: '旗舰宝箱',
      nameEn: 'Flagship Lootbox'
    }
  })

  // 游戏状态
  const [gameState, setGameState] = useState(getDefaultGameState('旗舰宝箱类'))

  // 结果弹窗状态
  const [resultModal, setResultModal] = useState({
    show: false,
    items: [],
    displayedItems: [],
    isMulti: false,
    drawType: 'single',
    isGenerating: false,
    isPaused: false,
    isComplete: false,
    processedIndex: 0,
    canSkip: false  // 是否可以双击快进
  })

  // 用于防止初始加载时触发保存
  const isInitialLoad = useRef(true)

  // ========== 里程碑追踪 ==========
  const { resetMilestones } = useMilestoneTracker(
    gameState.rmb,
    `flagship_${activityId}`
  )

  // 商店套餐数据（旗舰钥匙）
  const [shopPackages, setShopPackages] = useState([
    {
      id: 1,
      coins: 20,
      bonus: 0,
      price: 18,
      discount: null,
      quantity: 1,
      image: `${CDN_BASE_URL}/assets/contentseparated_assets_offers/eventgachaoffer_${activityId}_limited_2_small_widget.png${IMG_WEBP}`
    },
    {
      id: 2,
      coins: 104,
      bonus: 6,
      price: 88,
      discount: '-5%',
      quantity: 1,
      image: `${CDN_BASE_URL}/assets/contentseparated_assets_offers/eventgachaoffer_${activityId}_limited_2_medium_widget.png${IMG_WEBP}`
    },
    {
      id: 3,
      coins: 234,
      bonus: 26,
      price: 209,
      discount: '-10%',
      quantity: 1,
      image: `${CDN_BASE_URL}/assets/contentseparated_assets_offers/eventgachaoffer_${activityId}_limited_2_big_widget.png${IMG_WEBP}`
    }
  ])

  // 旗舰钥匙购买数量调整函数
  const handleUpdateQuantity = (id, newQuantity) => {
    setShopPackages(prev =>
      prev.map(pkg =>
        pkg.id === id
          ? { ...pkg, quantity: Math.max(1, newQuantity) } // 防止出现0或负数
          : pkg
      )
    )
  }

  // 从 JSON 配置加载物品数据和活动配置
  useEffect(() => {
    const loadActivityData = async () => {
      try {
        console.log(`[FlagshipGacha] Loading activity: ${activityId}`)

        const config = await loadActivityConfig('flagship', activityId)

        // 保存完整的活动配置
        const fullConfig = {
          ...config,
          id: activityId
        }
        setActivityConfig(fullConfig)

        console.log(`[FlagshipGacha] Loaded config:`, fullConfig)

        // 旗舰宝箱配置有 lootboxes 数组，同时加载两种类型
        let itemsWithIcons = []
        let itemsWithIcons_else = []

        if (fullConfig.lootboxes && Array.isArray(fullConfig.lootboxes)) {
          // 加载旗舰宝箱物品
          const flagshipLootbox = fullConfig.lootboxes.find(lb => lb.type === 'flagship')
          if (flagshipLootbox && flagshipLootbox.items) {
            itemsWithIcons = flagshipLootbox.items.map(item => ({
              ...item,
              icon: buildItemImageUrl(item, fullConfig),
              obtained: 0,
              tier: (item.rarity === 'epic' || item.rarity === 'legendary') ? true : undefined
            }))
            console.log(`[FlagshipGacha] Found ${itemsWithIcons.length} items for flagship`)
          }

          // 加载普通宝箱物品
          const containerLootbox = fullConfig.lootboxes.find(lb => lb.type === 'container')
          if (containerLootbox && containerLootbox.items) {
            itemsWithIcons_else = containerLootbox.items.map(item => ({
              ...item,
              icon: buildItemImageUrl(item, fullConfig),
              obtained: 0,
              tier: (item.rarity === 'epic' || item.rarity === 'legendary') ? true : undefined
            }))
            console.log(`[FlagshipGacha] Found ${itemsWithIcons_else.length} items for container`)
          }
        } else if (fullConfig.items) {
          // 兼容旧格式（直接有 items 字段）
          itemsWithIcons = fullConfig.items.map(item => ({
            ...item,
            icon: buildItemImageUrl(item, fullConfig),
            obtained: 0,
            tier: (item.rarity === 'epic' || item.rarity === 'legendary') ? true : undefined
          }))
        }

        console.log(`[FlagshipGacha] Items with icons:`, itemsWithIcons)

        // 尝试从 localStorage 加载该活动的状态
        const savedState = loadGameState(activityId)

        if (savedState && savedState.items && savedState.items.length > 0) {
          console.log(`[FlagshipGacha] Loaded saved state for ${activityId}`)

          // 合并旗舰宝箱物品数据
          const mergedItems = itemsWithIcons.map(newItem => {
            const savedItem = savedState.items.find(item => item.id === newItem.id)
            return {
              ...newItem,
              obtained: savedItem ? savedItem.obtained : 0
            }
          })

          // 合并普通宝箱物品数据
          const mergedItems_else = itemsWithIcons_else.map(newItem => {
            const savedItem = savedState.items_else?.find(item => item.id === newItem.id)
            return {
              ...newItem,
              obtained: savedItem ? savedItem.obtained : 0
            }
          })

          const defaultState = getDefaultGameState('旗舰宝箱类')

          // 确保使用旗舰宝箱类的默认值，但保留用户数据
          setGameState({
            ...defaultState,
            ...savedState,
            singleCost: defaultState.singleCost,  // 强制使用新的消耗值
            currencyName: '旗舰钥匙',  // 确保货币名称正确
            items: mergedItems,
            items_else: mergedItems_else
          })
        } else {
          console.log(`[FlagshipGacha] No saved state for ${activityId}, using default`)

          setGameState({
            ...getDefaultGameState('旗舰宝箱类'),
            items: itemsWithIcons,
            items_else: itemsWithIcons_else
          })
        }

        // 标记初始加载完成
        isInitialLoad.current = false
      } catch (error) {
        console.error('加载物品配置失败:', error)
      }
    }

    if (activityId) {
      isInitialLoad.current = true
      loadActivityData()
    }
  }, [activityId])

  // 自动保存 gameState 到 localStorage
  useEffect(() => {
    if (isInitialLoad.current) {
      return
    }

    if (activityId && gameState.items.length > 0) {
      console.log(`[FlagshipGacha] Saving state for ${activityId}`)
      saveGameState(activityId, gameState)
    }
  }, [activityId, gameState])

  // 获取当前宝箱类型对应的数据字段名后缀
  const getFieldSuffix = () => {
    return selectedLootboxType === 'event_premium' ? '' : '_else'
  }

  // 获取当前宝箱类型的物品列表
  const getCurrentItems = () => {
    const suffix = getFieldSuffix()
    return suffix ? gameState[`items${suffix}`] : gameState.items
  }

  // 更新 Header 数据
  useEffect(() => {
    onUpdateHeader({
      activityConfig,
      gameState,
      activityName: activityConfig.metadata?.name || '',
      activityNameEn: activityConfig.metadata?.nameEn || '',
      isModalOpen: resultModal.show || infoModal || shopModal || historyModal || resetModal || sponsorModal,
      onOpenInfo: () => setInfoModal(true),
      onOpenShop: () => setShopModal(true),
      onResetData: handleResetData,
      onAddCommonKeys: handleAddCommonKeys
    })
  }, [activityConfig, gameState, resultModal.show, infoModal, shopModal, historyModal, resetModal, sponsorModal, onUpdateHeader])

  // ========== 抽奖核心逻辑 ==========
  const drawLottery = (customItems = null) => {
    const items = customItems || getCurrentItems()

    const availableItems = items.filter(item =>
      item.limit === 0 || item.obtained < item.limit
    )
    const unavailableItems = items.filter(item =>
      item.limit > 0 && item.obtained >= item.limit
    )

    const unavailableProbability = unavailableItems.reduce((sum, item) => sum + item.probability, 0)

    // 找到概率最高的common物品作为兜底
    const highestProbCommon = availableItems
      .filter(item => item.rarity === 'common' && item.limit === 0)
      .reduce((max, item) => item.probability > max.probability ? item : max, { probability: 0 })

    const itemsWithAdjustedProb = availableItems.map(item => {
      if (highestProbCommon.name && item.name === highestProbCommon.name) {
        return { ...item, probability: item.probability + unavailableProbability }
      }
      return { ...item }
    })

    const totalProbability = itemsWithAdjustedProb.reduce((sum, item) => sum + item.probability, 0)
    const rand = Math.random() * totalProbability
    let cumulativeProbability = 0

    for (const item of itemsWithAdjustedProb) {
      cumulativeProbability += item.probability
      if (rand < cumulativeProbability) {
        return items.find(i => i.name === item.name && i.rarity === item.rarity)
      }
    }
    return { ...availableItems[availableItems.length - 1] }
  }

  // 提取货币数量
  const extractCurrencyAmount = (item) => {
    if (item.id.startsWith('currency_')) {
      const match = item.name.match(/^(\d+)\s*/)
      return match ? parseInt(match[1]) : 1
    }
    return 0
  }

  // 检查奖池中剩余未抽满的限定史诗/传说物品数量
  const getRemainingLimitedEpicLegendary = (items) => {
    return items.filter(item =>
      (item.rarity === 'epic' || item.rarity === 'legendary') &&
      item.limit > 0 &&
      item.obtained < item.limit
    ).length
  }

  // 逐个显示物品
  const progressivelyShowItems = (allItems, drawType) => {
    stopAnimationRef.current = false // 重置停止标志
    let currentIndex = 0

    const showNextItem = () => {
      // 检查是否需要停止动画
      if (stopAnimationRef.current) {
        return
      }

      if (currentIndex >= allItems.length) {
        const hasEpicOrLegendary = allItems.some(item =>
          item.rarity === 'epic' || item.rarity === 'legendary'
        )

        if (!hasEpicOrLegendary) {
          playSound('UpgradeFailed_01_UI.UpgradeFailed_01_UI.wav')
        }

        setResultModal(prev => ({
          ...prev,
          isGenerating: false,
          isComplete: true
        }))
        return
      }

      const nextItem = allItems[currentIndex]

      if (nextItem.rarity === 'epic' || nextItem.rarity === 'legendary') {
        playSound('Reward_Daily_02_UI.Reward_Daily_02_UI.wav')
      }

      setResultModal(prev => {
        let newDisplayedItems = [...prev.displayedItems, nextItem]

        if ((drawType === 'multi100' || drawType === 'multi500') && newDisplayedItems.length > 20) {
          const epicLegendary = newDisplayedItems.filter(item =>
            item.rarity === 'epic' || item.rarity === 'legendary'
          )
          const others = newDisplayedItems.filter(item =>
            item.rarity !== 'epic' && item.rarity !== 'legendary'
          )

          const remainingOthers = others.slice(Math.max(0, others.length - (20 - epicLegendary.length)))
          newDisplayedItems = [...epicLegendary, ...remainingOthers]
        }

        return {
          ...prev,
          displayedItems: newDisplayedItems,
          processedIndex: currentIndex + 1
        }
      })

      currentIndex++

      if ((drawType === 'multi100' || drawType === 'multi500') &&
          (nextItem.rarity === 'epic' || nextItem.rarity === 'legendary')) {
        setResultModal(prev => ({
          ...prev,
          isPaused: true,
          isGenerating: false
        }))
      } else {
        setTimeout(showNextItem, 50)
      }
    }

    showNextItem()
  }

  // 继续生成
  const continueGeneration = () => {
    if (!resultModal.isPaused) return

    stopAnimationRef.current = false // 重置停止标志

    setResultModal(prev => ({
      ...prev,
      isPaused: false,
      isGenerating: true
    }))

    const allItems = resultModal.items
    const drawType = resultModal.drawType
    let index = resultModal.processedIndex

    const showNextItem = () => {
      // 检查是否需要停止动画
      if (stopAnimationRef.current) {
        return
      }

      if (index >= allItems.length) {
        const hasEpicOrLegendary = allItems.some(item =>
          item.rarity === 'epic' || item.rarity === 'legendary'
        )

        if (!hasEpicOrLegendary) {
          playSound('UpgradeFailed_01_UI.UpgradeFailed_01_UI.wav')
        }

        setResultModal(prev => ({
          ...prev,
          isGenerating: false,
          isComplete: true
        }))
        return
      }

      const nextItem = allItems[index]

      if (nextItem.rarity === 'epic' || nextItem.rarity === 'legendary') {
        playSound('Reward_Daily_02_UI.Reward_Daily_02_UI.wav')
      }

      setResultModal(prev => {
        let newDisplayedItems = [...prev.displayedItems, nextItem]

        if ((drawType === 'multi100' || drawType === 'multi500') && newDisplayedItems.length > 20) {
          const epicLegendary = newDisplayedItems.filter(item =>
            item.rarity === 'epic' || item.rarity === 'legendary'
          )
          const others = newDisplayedItems.filter(item =>
            item.rarity !== 'epic' && item.rarity !== 'legendary'
          )

          const remainingOthers = others.slice(Math.max(0, others.length - (20 - epicLegendary.length)))
          newDisplayedItems = [...epicLegendary, ...remainingOthers]
        }

        return {
          ...prev,
          displayedItems: newDisplayedItems,
          processedIndex: index + 1
        }
      })

      index++

      if ((drawType === 'multi100' || drawType === 'multi500') &&
          (nextItem.rarity === 'epic' || nextItem.rarity === 'legendary')) {
        setResultModal(prev => ({
          ...prev,
          isPaused: true,
          isGenerating: false
        }))
      } else {
        setTimeout(showNextItem, 50)
      }
    }

    showNextItem()
  }

  // 快进到下一个史诗/传说物品或结束
  const skipToNext = () => {
    // 只有在可以快进时才执行（剩余史诗/传说物品 ≤ 1）
    if (!resultModal.canSkip) return
    if (!resultModal.isGenerating || resultModal.isPaused) return

    // 停止当前的动画流程
    stopAnimationRef.current = true

    const allItems = resultModal.items
    const drawType = resultModal.drawType
    const currentIndex = resultModal.processedIndex

    // 从当前位置开始查找下一个 epic/legendary 物品
    let nextEpicLegendaryIndex = -1
    for (let i = currentIndex; i < allItems.length; i++) {
      if (allItems[i].rarity === 'epic' || allItems[i].rarity === 'legendary') {
        nextEpicLegendaryIndex = i
        break
      }
    }

    if (nextEpicLegendaryIndex !== -1) {
      // 找到了下一个 epic/legendary，添加从当前到这个位置的所有物品
      const itemsToAdd = allItems.slice(currentIndex, nextEpicLegendaryIndex + 1)

      setResultModal(prev => {
        let newDisplayedItems = [...prev.displayedItems, ...itemsToAdd]

        // 如果是大批量抽奖，只保留 epic/legendary 和最近的 common 物品
        if ((drawType === 'multi100' || drawType === 'multi500') && newDisplayedItems.length > 20) {
          const epicLegendary = newDisplayedItems.filter(item =>
            item.rarity === 'epic' || item.rarity === 'legendary'
          )
          const others = newDisplayedItems.filter(item =>
            item.rarity !== 'epic' && item.rarity !== 'legendary'
          )

          const remainingOthers = others.slice(Math.max(0, others.length - (20 - epicLegendary.length)))
          newDisplayedItems = [...epicLegendary, ...remainingOthers]
        }

        return {
          ...prev,
          displayedItems: newDisplayedItems,
          processedIndex: nextEpicLegendaryIndex + 1,
          isPaused: true,
          isGenerating: false
        }
      })

      // 播放音效
      playSound('Reward_Daily_02_UI.Reward_Daily_02_UI.wav')
    } else {
      // 没有找到更多 epic/legendary，直接显示所有剩余物品
      const itemsToAdd = allItems.slice(currentIndex)

      setResultModal(prev => {
        let newDisplayedItems = [...prev.displayedItems, ...itemsToAdd]

        // 如果是大批量抽奖，只保留 epic/legendary 和最近的 common 物品
        if ((drawType === 'multi100' || drawType === 'multi500') && newDisplayedItems.length > 20) {
          const epicLegendary = newDisplayedItems.filter(item =>
            item.rarity === 'epic' || item.rarity === 'legendary'
          )
          const others = newDisplayedItems.filter(item =>
            item.rarity !== 'epic' && item.rarity !== 'legendary'
          )

          const remainingOthers = others.slice(Math.max(0, others.length - (20 - epicLegendary.length)))
          newDisplayedItems = [...epicLegendary, ...remainingOthers]
        }

        return {
          ...prev,
          displayedItems: newDisplayedItems,
          processedIndex: allItems.length,
          isGenerating: false,
          isComplete: true
        }
      })

      const hasEpicOrLegendary = allItems.some(item =>
        item.rarity === 'epic' || item.rarity === 'legendary'
      )

      if (!hasEpicOrLegendary) {
        playSound('UpgradeFailed_01_UI.UpgradeFailed_01_UI.wav')
      }
    }
  }

  // 执行抽奖逻辑
  const performDraw = (count, drawType, expectedTotalDraws) => {
    // 防止重复执行（Strict Mode 可能导致双重调用）
    if (isPerformingDrawRef.current) {
      console.log(`[FlagshipGacha] performDraw 已在执行中，跳过重复调用`)
      return
    }
    isPerformingDrawRef.current = true

    const suffix = getFieldSuffix()
    const itemsKey = suffix ? `items${suffix}` : 'items'
    const totalDrawsKey = suffix ? `totalDraws${suffix}` : 'totalDraws'
    const legendaryCountKey = suffix ? `legendaryCount${suffix}` : 'legendaryCount'
    const epicCountKey = suffix ? `epicCount${suffix}` : 'epicCount'
    const rareCountKey = suffix ? `rareCount${suffix}` : 'rareCount'
    const historyKey = suffix ? `history${suffix}` : 'history'
    const epicLegendaryHistoryKey = suffix ? `epicLegendaryHistory${suffix}` : 'epicLegendaryHistory'

    console.log(`[FlagshipGacha] performDraw called: count=${count}, drawType=${drawType}, expectedTotalDraws=${expectedTotalDraws}, suffix=${suffix}`)
    console.log(`[FlagshipGacha] gameState[${itemsKey}].length=${gameState[itemsKey]?.length}`)

    if (!gameState[itemsKey] || gameState[itemsKey].length === 0) {
      console.error(`[FlagshipGacha] 物品列表为空，无法抽奖 (${itemsKey})`)
      isPerformingDrawRef.current = false
      return
    }

    // 在 setGameState 之前保存预抽取结果（避免 Strict Mode 双重调用问题）
    const savedPendingRewards = [...pendingRewardsRef.current]
    pendingRewardsRef.current = []  // 立即清空，防止重复使用

    // 使用传入的 expectedTotalDraws 计算抽数编号（避免 setGameState 异步问题）
    const totalDrawsForCalc = expectedTotalDraws

    // 为预抽取结果添加抽数编号
    const resultsForModal = savedPendingRewards.map((result, index) => {
      if (result.rarity === 'epic' || result.rarity === 'legendary') {
        return { ...result, drawNumber: totalDrawsForCalc - count + index + 1 }
      }
      return result
    })

    // 计算剩余限定物品数量（基于预抽取后的状态）
    let tempItemsForCheck = [...gameState[itemsKey]]
    savedPendingRewards.forEach(result => {
      tempItemsForCheck = tempItemsForCheck.map(item => {
        if (item.name === result.name && item.rarity === result.rarity) {
          return { ...item, obtained: item.obtained + 1 }
        }
        return item
      })
    })
    const remainingLimited = getRemainingLimitedEpicLegendary(tempItemsForCheck)

    setGameState(prev => {
      const results = []
      let tempItems = [...prev[itemsKey]]
      let premiumKeyTotal = 0  // 旗舰钥匙累计
      let commonKeyTotal = 0   // 普通钥匙累计
      let legendaryCount = prev[legendaryCountKey]
      let epicCount = prev[epicCountKey]
      let rareCount = prev[rareCountKey]

      for (let i = 0; i < count; i++) {
        // 如果已经有预抽取的结果，使用它
        const result = (savedPendingRewards.length > i)
          ? savedPendingRewards[i]
          : drawLottery(tempItems)
        results.push(result)

        // 根据钥匙类型分别累计
        if (result.id === 'currency_premium_lootboxkey') {
          const amount = extractCurrencyAmount(result)
          premiumKeyTotal += amount
        } else if (result.id === 'currency_common_lootboxkey') {
          const amount = extractCurrencyAmount(result)
          commonKeyTotal += amount
        }

        tempItems = tempItems.map(item => {
          if (item.name === result.name && item.rarity === result.rarity) {
            return { ...item, obtained: item.obtained + 1 }
          }
          return item
        })

        if (result.rarity === 'legendary') {
          legendaryCount = 0
          epicCount = 0
          rareCount = 0
        } else if (result.rarity === 'epic') {
          epicCount = 0
          rareCount = 0
          legendaryCount++
        } else if (result.rarity === 'rare') {
          rareCount = 0
          epicCount++
          legendaryCount++
        } else {
          rareCount++
          epicCount++
          legendaryCount++
        }
      }

      console.log(`[FlagshipGacha] 抽奖结果:`, results)

      const resultsWithDrawNum = results.map((result, index) => {
        if (result.rarity === 'epic' || result.rarity === 'legendary') {
          return { ...result, drawNumber: prev[totalDrawsKey] - count + index + 1 }
        }
        return result
      })

      let updatedEpicLegendaryHistory = [...prev[epicLegendaryHistoryKey]]
      resultsWithDrawNum.forEach((result, index) => {
        if (result.rarity === 'epic' || result.rarity === 'legendary') {
          updatedEpicLegendaryHistory.push({
            item: result,
            drawNumber: prev[totalDrawsKey] - count + index + 1
          })
        }
      })

      return {
        ...prev,
        currency: prev.currency + premiumKeyTotal,           // 旗舰钥匙返回
        commonCurrency: (prev.commonCurrency || 0) + commonKeyTotal,  // 普通钥匙返回
        [itemsKey]: tempItems,
        [legendaryCountKey]: legendaryCount,
        [epicCountKey]: epicCount,
        [rareCountKey]: rareCount,
        [historyKey]: [...prev[historyKey], ...results],
        [epicLegendaryHistoryKey]: updatedEpicLegendaryHistory
      }
    })

    // 停止滚动动画
    setIsScrolling(false)

    // 显示结果弹窗（使用预抽取的结果，同步执行，不依赖 setGameState 回调）
    if (drawType === 'single') {
      if (resultsForModal[0].rarity === 'epic' || resultsForModal[0].rarity === 'legendary') {
        playSound('Reward_Daily_02_UI.Reward_Daily_02_UI.wav')
      } else {
        playSound('UpgradeFailed_01_UI.UpgradeFailed_01_UI.wav')
      }

      console.log('[FlagshipGacha] 显示单抽结果弹窗')
      setResultModal({
        show: true,
        items: resultsForModal,
        displayedItems: resultsForModal,
        isMulti: false,
        drawType: 'single',
        isGenerating: false,
        isPaused: false,
        isComplete: true,
        processedIndex: 1,
        canSkip: false
      })
    } else {
      console.log('[FlagshipGacha] 显示多抽结果弹窗')
      const canSkip = (drawType === 'multi100' || drawType === 'multi500') && remainingLimited <= 1

      setResultModal({
        show: true,
        items: resultsForModal,
        displayedItems: [],
        isMulti: true,
        drawType,
        isGenerating: true,
        isPaused: false,
        isComplete: false,
        processedIndex: 0,
        canSkip
      })

      setTimeout(() => {
        progressivelyShowItems(resultsForModal, drawType)
      }, 100)
    }

    // 释放执行锁
    isPerformingDrawRef.current = false
  }

  // 抽卡函数
  const handleSingleDraw = async () => {
    if (isAnimating) return

    // 根据宝箱类型决定钥匙类型和单价
    const isPremium = selectedLootboxType === 'event_premium'
    const singleCost = gameState.singleCost // 两种宝箱都是 10 钥匙/次
    const currentKeys = isPremium ? gameState.currency : (gameState.commonCurrency || 0)
    const keyName = isPremium ? '旗舰钥匙' : '普通钥匙'

    // 检查钥匙是否足够
    if (currentKeys < singleCost) {
      toast.error(`${keyName}不够`, {
        duration: 2000,
        position: 'top-center',
        style: {
          background: '#1e293b',
          color: '#fff',
          border: isPremium ? '1px solid #f59e0b' : '1px solid #9ca3af',
        },
      })
      if (isPremium) {
        setShopModal(true)
      }
      return
    }

    console.log('抽奖 x1')

    // 先执行抽奖获取结果（用于滚动条）
    const result = drawLottery(getCurrentItems())
    pendingRewardsRef.current = [result]

    // 点击按钮时立即扣除钥匙，并增加对应的抽奖次数
    const suffix = getFieldSuffix()
    const totalDrawsKey = suffix ? `totalDraws${suffix}` : 'totalDraws'

    setGameState(prev => ({
      ...prev,
      ...(isPremium
        ? { currency: prev.currency - singleCost }
        : { commonCurrency: (prev.commonCurrency || 0) - singleCost }
      ),
      [totalDrawsKey]: prev[totalDrawsKey] + 1
    }))

    if (lootboxAnimationRef.current) {
      setIsAnimating(true)

      // 设置待执行的抽奖参数，携带预期的 totalDraws 值
      const expectedTotalDraws = gameState[totalDrawsKey] + 1
      pendingDrawRef.current = { count: 1, drawType: 'single', expectedTotalDraws }

      // 启动滚动条动画
      setIsScrolling(true)

      try {
        await lootboxAnimationRef.current.start()
        console.log('[FlagshipGacha] 动画完成')
      } catch (error) {
        console.error('[FlagshipGacha] 动画执行失败:', error)
      } finally {
        setIsAnimating(false)
        // 停止滚动在performDraw中处理
      }
    }
  }

  const handleMultiDraw = async () => {
    if (isAnimating) return

    // 根据宝箱类型决定钥匙类型和单价
    const isPremium = selectedLootboxType === 'event_premium'
    const singleCost = gameState.singleCost // 两种宝箱都是 10 钥匙/次
    const totalCost = singleCost * 10
    const currentKeys = isPremium ? gameState.currency : (gameState.commonCurrency || 0)
    const keyName = isPremium ? '旗舰钥匙' : '普通钥匙'

    // 检查钥匙是否足够
    if (currentKeys < totalCost) {
      toast.error(`${keyName}不够`, {
        duration: 2000,
        position: 'top-center',
        style: {
          background: '#1e293b',
          color: '#fff',
          border: isPremium ? '1px solid #f59e0b' : '1px solid #9ca3af',
        },
      })
      if (isPremium) {
        setShopModal(true)
      }
      return
    }

    console.log('抽奖 x10')

    // 先执行抽奖获取所有结果（用于滚动条）
    // 需要模拟每次抽奖后更新物品状态，确保限量物品正确处理
    let tempItems = [...getCurrentItems()]
    const results = []
    for (let i = 0; i < 10; i++) {
      const result = drawLottery(tempItems)
      results.push(result)
      // 更新临时物品状态
      tempItems = tempItems.map(item => {
        if (item.name === result.name && item.rarity === result.rarity) {
          return { ...item, obtained: item.obtained + 1 }
        }
        return item
      })
    }
    pendingRewardsRef.current = results

    // 点击按钮时立即扣除钥匙，并增加对应的抽奖次数
    const suffix = getFieldSuffix()
    const totalDrawsKey = suffix ? `totalDraws${suffix}` : 'totalDraws'

    setGameState(prev => ({
      ...prev,
      ...(isPremium
        ? { currency: prev.currency - totalCost }
        : { commonCurrency: (prev.commonCurrency || 0) - totalCost }
      ),
      [totalDrawsKey]: prev[totalDrawsKey] + 10
    }))

    if (lootboxAnimationRef.current) {
      setIsAnimating(true)

      // 设置待执行的抽奖参数，携带预期的 totalDraws 值
      const expectedTotalDraws = gameState[totalDrawsKey] + 10
      pendingDrawRef.current = { count: 10, drawType: 'multi10', expectedTotalDraws }

      // 启动滚动条动画
      setIsScrolling(true)

      try {
        await lootboxAnimationRef.current.start()
        console.log('[FlagshipGacha] 动画完成')
      } catch (error) {
        console.error('[FlagshipGacha] 动画执行失败:', error)
      } finally {
        setIsAnimating(false)
      }
    }
  }

  const handleDraw100 = async () => {
    if (isAnimating) return

    // 根据宝箱类型决定钥匙类型和单价
    const isPremium = selectedLootboxType === 'event_premium'
    const singleCost = gameState.singleCost // 两种宝箱都是 10 钥匙/次
    const totalCost = singleCost * 100
    const currentKeys = isPremium ? gameState.currency : (gameState.commonCurrency || 0)
    const keyName = isPremium ? '旗舰钥匙' : '普通钥匙'

    // 检查钥匙是否足够
    if (currentKeys < totalCost) {
      toast.error(`${keyName}不够`, {
        duration: 2000,
        position: 'top-center',
        style: {
          background: '#1e293b',
          color: '#fff',
          border: isPremium ? '1px solid #f59e0b' : '1px solid #9ca3af',
        },
      })
      if (isPremium) {
        setShopModal(true)
      }
      return
    }

    console.log('抽奖 x100')

    // 先执行抽奖获取所有结果（用于滚动条）
    // 需要模拟每次抽奖后更新物品状态，确保限量物品正确处理
    let tempItems = [...getCurrentItems()]
    const results = []
    for (let i = 0; i < 100; i++) {
      const result = drawLottery(tempItems)
      results.push(result)
      // 更新临时物品状态
      tempItems = tempItems.map(item => {
        if (item.name === result.name && item.rarity === result.rarity) {
          return { ...item, obtained: item.obtained + 1 }
        }
        return item
      })
    }
    pendingRewardsRef.current = results

    // 点击按钮时立即扣除钥匙，并增加对应的抽奖次数
    const suffix = getFieldSuffix()
    const totalDrawsKey = suffix ? `totalDraws${suffix}` : 'totalDraws'

    setGameState(prev => ({
      ...prev,
      ...(isPremium
        ? { currency: prev.currency - totalCost }
        : { commonCurrency: (prev.commonCurrency || 0) - totalCost }
      ),
      [totalDrawsKey]: prev[totalDrawsKey] + 100
    }))

    if (lootboxAnimationRef.current) {
      setIsAnimating(true)

      // 设置待执行的抽奖参数，携带预期的 totalDraws 值
      const expectedTotalDraws = gameState[totalDrawsKey] + 100
      pendingDrawRef.current = { count: 100, drawType: 'multi100', expectedTotalDraws }

      // 启动滚动条动画
      setIsScrolling(true)

      try {
        await lootboxAnimationRef.current.start()
        console.log('[FlagshipGacha] 动画完成')
      } catch (error) {
        console.error('[FlagshipGacha] 动画执行失败:', error)
      } finally {
        setIsAnimating(false)
      }
    }
  }

  const handleDraw500 = async () => {
    if (isAnimating) return

    // 根据宝箱类型决定钥匙类型和单价
    const isPremium = selectedLootboxType === 'event_premium'
    const singleCost = gameState.singleCost // 两种宝箱都是 10 钥匙/次
    const totalCost = singleCost * 500
    const currentKeys = isPremium ? gameState.currency : (gameState.commonCurrency || 0)
    const keyName = isPremium ? '旗舰钥匙' : '普通钥匙'

    // 检查钥匙是否足够
    if (currentKeys < totalCost) {
      toast.error(`${keyName}不够`, {
        duration: 2000,
        position: 'top-center',
        style: {
          background: '#1e293b',
          color: '#fff',
          border: isPremium ? '1px solid #f59e0b' : '1px solid #9ca3af',
        },
      })
      if (isPremium) {
        setShopModal(true)
      }
      return
    }

    console.log('抽奖 x500')

    // 先执行抽奖获取所有结果（用于滚动条）
    // 需要模拟每次抽奖后更新物品状态，确保限量物品正确处理
    let tempItems = [...getCurrentItems()]
    const results = []
    for (let i = 0; i < 500; i++) {
      const result = drawLottery(tempItems)
      results.push(result)
      // 更新临时物品状态
      tempItems = tempItems.map(item => {
        if (item.name === result.name && item.rarity === result.rarity) {
          return { ...item, obtained: item.obtained + 1 }
        }
        return item
      })
    }
    pendingRewardsRef.current = results

    // 点击按钮时立即扣除钥匙，并增加对应的抽奖次数
    const suffix = getFieldSuffix()
    const totalDrawsKey = suffix ? `totalDraws${suffix}` : 'totalDraws'

    setGameState(prev => ({
      ...prev,
      ...(isPremium
        ? { currency: prev.currency - totalCost }
        : { commonCurrency: (prev.commonCurrency || 0) - totalCost }
      ),
      [totalDrawsKey]: prev[totalDrawsKey] + 500
    }))

    if (lootboxAnimationRef.current) {
      setIsAnimating(true)

      // 设置待执行的抽奖参数，携带预期的 totalDraws 值
      const expectedTotalDraws = gameState[totalDrawsKey] + 500
      pendingDrawRef.current = { count: 500, drawType: 'multi500', expectedTotalDraws }

      // 启动滚动条动画
      setIsScrolling(true)

      try {
        await lootboxAnimationRef.current.start()
        console.log('[FlagshipGacha] 动画完成')
      } catch (error) {
        console.error('[FlagshipGacha] 动画执行失败:', error)
      } finally {
        setIsAnimating(false)
      }
    }
  }

  // 动画完成回调
  const handleAnimationComplete = () => {
    console.log('宝箱动画完成')
  }

  // 奖励阶段回调（动画进入 reward 阶段时触发）
  const handleRewardStage = () => {
    console.log('[FlagshipGacha] 进入奖励阶段，显示抽奖结果')
    if (pendingDrawRef.current) {
      const { count, drawType, expectedTotalDraws } = pendingDrawRef.current
      performDraw(count, drawType, expectedTotalDraws)
      pendingDrawRef.current = null
    }
  }

  // 商店相关函数
  const handleBuyPackage = (pkg) => {
    // 安全检查：非会员由 ShopModal 拦截，此处为兜底
    if (!isPremium) {
      setShopModal(false)
      setShowMembershipModal(true)
      return
    }

    playSound('Buy_01_UI.Buy_01_UI.wav')

    // --- 修改：考虑批量购买数量
    const totalKeys = (pkg.coins + (pkg.bonus || 0)) * (pkg.quantity || 1)

    setGameState(prev => ({
      ...prev,
      currency: prev.currency + totalKeys,
      // --- 修改：乘以购买数量
      rmb: prev.rmb - (pkg.price * (pkg.quantity || 1))
    }))
    setShopModal(false)
  }

  // 重置数据
  const handleResetData = () => {
    playSound('Button_01_UI.Button_01_UI.wav')
    setResetModal(true)
  }

  // 重置当前活动数据
  const handleResetCurrent = () => {
    console.log(`[FlagshipGacha] Resetting data for ${activityId}`)

    // 清除 localStorage
    clearGameState(activityId)

    // 重置里程碑
    resetMilestones()

    // 重置状态，保留物品列表但清零obtained
    setGameState(prev => {
      const defaultState = getDefaultGameState('旗舰宝箱类')
      return {
        ...defaultState,
        items: prev.items.map(item => ({ ...item, obtained: 0 })),
        items_else: prev.items_else.map(item => ({ ...item, obtained: 0 }))
      }
    })

    // 清空结果弹窗
    setResultModal({
      show: false,
      items: [],
      displayedItems: [],
      isMulti: false,
      drawType: 'single',
      isGenerating: false,
      isPaused: false,
      isComplete: false,
      processedIndex: 0,
      canSkip: false
    })

    setResetModal(false)
    playSound('Button_02_UI.Button_02_UI.wav')

    toast.success('当前活动数据已重置！', {
      duration: 2000,
      position: 'top-center',
      style: {
        background: '#000',
        color: '#fff',
        border: '1px solid #ef4444',
        borderRadius: '12px',
        padding: '12px 24px'
      }
    })
  }

  // 打开重置全部确认弹窗
  const handleResetAll = () => {
    setResetModal(false)
    setConfirmModal(true)
  }

  // 确认重置所有活动数据
  const handleConfirmResetAll = () => {
    console.log('[FlagshipGacha] Resetting all activities')

    // 清除所有 localStorage
    clearAllGameStates()

    // 清除所有活动的里程碑记录
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.endsWith('_milestones')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
        console.log(`[里程碑] 已清除 ${keysToRemove.length} 个活动的里程碑记录`)
      } catch (error) {
        console.error('Failed to clear milestone data:', error)
      }
    }

    // 重置当前活动的里程碑（清空内存状态）
    resetMilestones()

    // 重置当前状态，保留物品列表但清零obtained
    setGameState(prev => {
      const defaultState = getDefaultGameState('旗舰宝箱类')
      return {
        ...defaultState,
        items: prev.items.map(item => ({ ...item, obtained: 0 })),
        items_else: prev.items_else.map(item => ({ ...item, obtained: 0 }))
      }
    })

    // 清空结果弹窗
    setResultModal({
      show: false,
      items: [],
      displayedItems: [],
      isMulti: false,
      drawType: 'single',
      isGenerating: false,
      isPaused: false,
      isComplete: false,
      processedIndex: 0,
      canSkip: false
    })

    setConfirmModal(false)
    setResetModal(false)
    playSound('Button_02_UI.Button_02_UI.wav')

    toast.success('所有活动数据已重置！', {
      duration: 3000,
      position: 'top-center',
      style: {
        background: '#000',
        color: '#fff',
        border: '1px solid #dc2626',
        borderRadius: '12px',
        padding: '12px 24px'
      }
    })
  }

  const handleButtonClick = (callback) => {
    playSound('Button_02_UI.Button_02_UI.wav')
    callback()
  }

  // 增加普通钥匙
  const handleAddCommonKeys = () => {
    playSound('Buy_01_UI.Buy_01_UI.wav')

    setGameState(prev => ({
      ...prev,
      commonCurrency: (prev.commonCurrency || 0) + 150
    }))

    toast.success('做完6轮当日任务奖励150个钥匙', {
      duration: 2000,
      position: 'top-center',
      style: {
        background: '#1e293b',
        color: '#fff',
        border: '1px solid #9ca3af',
      },
    })
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Header 占位容器 */}
      <HeaderSpacer />

      {/* 背景图片 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${CDN_BASE_URL}/assets/ui-common/sharedassets1_BackgroundBattleResults_Chest_2048x1024.png${IMG_WEBP})`
        }}
      />

      {/* 主内容区域 */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 md:px-12">
        {/* 左上角：宝箱选择器 */}
        <div className="absolute top-4 md:top-8 left-2 md:left-8 scale-[0.65] md:scale-100 origin-top-left">
          <LootboxSelector
            activityId={activityId}
            selectedType={selectedLootboxType}
            onSelect={setSelectedLootboxType}
            isScrolling={isScrolling}
          />
        </div>

        {/* 右上角：物品展示栏 */}
        <div className="absolute top-4 md:top-8 right-2 md:right-8 w-64 scale-[0.65] md:scale-100 origin-top-right">
          <LootboxItemGrid items={getCurrentItems()} isScrolling={isScrolling} />
        </div>

        {/* 中间：宝箱动画区域 */}
        <div className="flex items-center justify-center scale-50 md:scale-100">
          <LootboxAnimation
            ref={lootboxAnimationRef}
            activityId={activityId}
            lootboxType={selectedLootboxType}
            onComplete={handleAnimationComplete}
            onRewardStage={handleRewardStage}
          />
        </div>

        {/* 底部：抽奖按钮/滚动条区域 */}
        <div className="relative w-full -mt-16 md:mt-12 flex justify-center items-center" style={{ minHeight: '112px' }}>
          {/* 抽奖按钮组 */}
          {!isScrolling && (
            <div className="flex flex-wrap gap-2 md:gap-8 justify-center">
              {/* 抽奖 x1 */}
              <button
                onClick={() => handleButtonClick(handleSingleDraw)}
                disabled={isAnimating}
                className="relative inline-flex h-8 md:h-10 overflow-hidden rounded-md p-[1px] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#10b981_0%,#059669_50%,#10b981_100%)]" />
                <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-md bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 md:px-8 py-1 text-xs md:text-sm font-bold text-white backdrop-blur-3xl hover:from-emerald-400 hover:to-emerald-600 transition-all">
                  抽奖 ×1
                </span>
              </button>

              {/* 抽奖 x10 */}
              <button
                onClick={() => handleButtonClick(handleMultiDraw)}
                disabled={isAnimating}
                className="relative inline-flex h-8 md:h-10 overflow-hidden rounded-md p-[1px] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#10b981_0%,#059669_50%,#10b981_100%)]" />
                <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-md bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 md:px-8 py-1 text-xs md:text-sm font-bold text-white backdrop-blur-3xl hover:from-emerald-400 hover:to-emerald-600 transition-all">
                  抽奖 ×10
                </span>
              </button>

              {/* 抽奖 x100 - 金色主题（会员专属） */}
              {isPremium && (
                <button
                  onClick={() => handleButtonClick(handleDraw100)}
                  disabled={isAnimating}
                  className="relative inline-flex h-8 md:h-10 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#fde047_0%,#ea580c_50%,#fde047_100%)]" />
                  <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-4 md:px-8 py-1 text-xs md:text-sm font-bold text-white backdrop-blur-3xl hover:bg-slate-900 transition-all">
                    抽奖 ×100
                  </span>
                </button>
              )}

              {/* 抽奖 x500 - 特殊紫色主题（会员专属） */}
              {isPremium && (
                <button
                  onClick={() => handleButtonClick(handleDraw500)}
                  disabled={isAnimating}
                  className="relative inline-flex h-8 md:h-10 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                  <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-4 md:px-8 py-1 text-xs md:text-sm font-bold text-white backdrop-blur-3xl hover:bg-slate-900 transition-all">
                    抽奖 ×500
                  </span>
                </button>
              )}
            </div>
          )}

          {/* 抽奖结果展示条 - 顶替按钮位置 */}
          <div
            className="absolute inset-0 flex items-center justify-center px-8"
            style={{ pointerEvents: isScrolling ? 'auto' : 'none' }}
          >
            <LootboxRewardBar
              items={getCurrentItems()}
              rewards={pendingRewardsRef.current}
              isScrolling={isScrolling}
              scrollDuration={3500}
            />
          </div>
        </div>
      </div>

      {/* 结果弹窗 */}
      <ResultModal
        resultModal={resultModal}
        itemScale={itemScale}
        onContinueGeneration={continueGeneration}
        onSkipToNext={skipToNext}
        onClose={() => setResultModal({ ...resultModal, show: false })}
      />

      {/* 商店弹窗 */}
      <ShopModal
        isOpen={shopModal}
        onClose={() => setShopModal(false)}
        shopPackages={shopPackages}
        onBuyPackage={handleBuyPackage}
        onUpdateQuantity={handleUpdateQuantity} // +++ 新增：传入数量调整函数
        activityConfig={activityConfig}
        mode="flagship"
        isPremium={isPremium}
        onOpenMembership={() => setShowMembershipModal(true)}
      />

      {/* 历史记录弹窗 */}
      <HistoryModal
        isOpen={historyModal}
        onClose={() => setHistoryModal(false)}
        history={selectedLootboxType === 'event_premium' ? gameState.epicLegendaryHistory : gameState.epicLegendaryHistory_else}
      />

      {/* 信息弹窗 */}
      <InfoModal
        isOpen={infoModal}
        onClose={() => setInfoModal(false)}
        epicLegendaryHistory={selectedLootboxType === 'event_premium' ? gameState.epicLegendaryHistory : gameState.epicLegendaryHistory_else}
        itemScale={itemScale}
        activityId={activityId}
        totalDraws={selectedLootboxType === 'event_premium' ? gameState.totalDraws : gameState.totalDraws_else}
      />

      {/* 赞助弹窗 */}
      <SponsorModal
        isOpen={sponsorModal}
        onClose={() => onSetSponsorModal(false)}
      />

      {/* 会员购买弹窗 */}
      <MembershipModal
        isOpen={showMembershipModal}
        onClose={() => setShowMembershipModal(false)}
      />

      {/* 重置数据弹窗 */}
      <ResetModal
        isOpen={resetModal}
        onClose={() => setResetModal(false)}
        onResetCurrent={handleResetCurrent}
        onResetAll={handleResetAll}
        activityName={activityConfig.metadata?.name || '当前活动'}
      />

      {/* 重置全部确认弹窗 */}
      <ConfirmModal
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        onConfirm={handleConfirmResetAll}
        title="确认重置所有活动"
        message="此操作将清除所有活动的抽奖记录，包括物品获取记录、抽奖历史等。此操作不可恢复！"
        confirmText="确认重置"
        cancelText="取消"
      />
    </div>
  )
}
