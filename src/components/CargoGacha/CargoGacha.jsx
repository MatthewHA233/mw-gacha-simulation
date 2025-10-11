import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { loadActivityConfig, buildBackgroundUrl, buildCargoPoolImageUrl, buildItemImageUrl, buildShopPackageUrl } from '../../services/cdnService'
import { loadGameState, saveGameState, getDefaultGameState, clearGameState, clearAllGameStates } from '../../utils/gameStateStorage'
import { HeaderSpacer } from '../Layout/HeaderSpacer'
import { useSound } from '../../hooks/useSound'
import { useMilestoneTracker } from '../../hooks/useMilestoneTracker'
import { SquareItem } from '../SquareItem'
import { ResultModal } from '../ui/ResultModal'
import { InfoModal } from '../ChipGacha/InfoModal'
import { HistoryModal } from '../ChipGacha/HistoryModal'
import { ShopModal } from '../ChipGacha/ShopModal'
import { SponsorModal } from '../ChipGacha/SponsorModal'
import { ResetModal } from '../ui/ResetModal'
import { ConfirmModal } from '../ui/ConfirmModal'

/**
 * 机密货物类抽卡组件
 */
export function CargoGacha({
  activityId,
  sponsorModal,
  onSetSponsorModal,
  onUpdateHeader
}) {
  const { playSound } = useSound()

  // 选中的奖池类型
  const [selectedCargoType, setSelectedCargoType] = useState('rm') // 'rm' | 'gameplay'

  // 活动配置
  const [activityConfig, setActivityConfig] = useState({
    id: activityId,
    gacha_type: '机密货物类',
    metadata: {
      name: '机密货物',
      nameEn: 'Cargo'
    }
  })

  // 游戏状态
  const [gameState, setGameState] = useState(getDefaultGameState('机密货物类'))

  // 用于防止初始加载时触发保存
  const isInitialLoad = useRef(true)

  // ========== 里程碑追踪 ==========
  const { resetMilestones } = useMilestoneTracker(
    gameState.rmb,
    `cargo_${activityId}`
  )

  // 从 JSON 配置加载活动配置
  useEffect(() => {
    const loadActivityData = async () => {
      try {
        console.log(`[CargoGacha] Loading activity: ${activityId}`)

        const config = await loadActivityConfig('cargo', activityId)

        // 保存完整的活动配置
        const fullConfig = {
          ...config,
          id: activityId,
          gacha_type: '机密货物类'
        }
        setActivityConfig(fullConfig)

        console.log(`[CargoGacha] Loaded config:`, fullConfig)

        // 加载两个奖池的物品数据
        let itemsWithIcons = []
        let itemsWithIcons_else = []

        if (fullConfig.cargos && Array.isArray(fullConfig.cargos)) {
          // 加载 rm (机密货物) 奖池
          const rmCargo = fullConfig.cargos.find(c => c.type === 'rm')
          if (rmCargo && rmCargo.items) {
            itemsWithIcons = rmCargo.items.map(item => ({
              ...item,
              icon: buildItemImageUrl(item, fullConfig),
              obtained: 0,
              tier: (item.rarity === 'epic' || item.rarity === 'legendary') ? true : undefined
            }))
            console.log(`[CargoGacha] Found ${itemsWithIcons.length} items for rm cargo`)
          }

          // 加载 gameplay (货运无人机) 奖池
          const gameplayCargo = fullConfig.cargos.find(c => c.type === 'gameplay')
          if (gameplayCargo && gameplayCargo.items) {
            itemsWithIcons_else = gameplayCargo.items.map(item => ({
              ...item,
              icon: buildItemImageUrl(item, fullConfig),
              obtained: 0,
              tier: (item.rarity === 'epic' || item.rarity === 'legendary') ? true : undefined
            }))
            console.log(`[CargoGacha] Found ${itemsWithIcons_else.length} items for gameplay cargo`)
          }
        }

        // 尝试从 localStorage 加载该活动的状态
        const savedState = loadGameState(activityId)

        if (savedState && savedState.items && savedState.items.length > 0) {
          console.log(`[CargoGacha] Loaded saved state for ${activityId}`)

          // 合并 rm 奖池物品数据
          const mergedItems = itemsWithIcons.map(newItem => {
            const savedItem = savedState.items.find(item => item.id === newItem.id)
            return {
              ...newItem,
              obtained: savedItem ? savedItem.obtained : 0
            }
          })

          // 合并 gameplay 奖池物品数据
          const mergedItems_else = itemsWithIcons_else.map(newItem => {
            const savedItem = savedState.items_else?.find(item => item.id === newItem.id)
            return {
              ...newItem,
              obtained: savedItem ? savedItem.obtained : 0
            }
          })

          const defaultState = getDefaultGameState('机密货物类')

          setGameState({
            ...defaultState,
            ...savedState,
            items: mergedItems,
            items_else: mergedItems_else
          })
        } else {
          console.log(`[CargoGacha] No saved state for ${activityId}, using default`)
          setGameState({
            ...getDefaultGameState('机密货物类'),
            items: itemsWithIcons,
            items_else: itemsWithIcons_else
          })
        }

        // 标记初始加载完成
        isInitialLoad.current = false
      } catch (error) {
        console.error('加载活动配置失败:', error)
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

    if (activityId) {
      console.log(`[CargoGacha] Saving state for ${activityId}`)
      saveGameState(activityId, gameState)
    }
  }, [activityId, gameState])

  // Modal 状态
  const [infoModal, setInfoModal] = useState(false)
  const [shopModal, setShopModal] = useState(false)
  const [historyModal, setHistoryModal] = useState(false)
  const [resetModal, setResetModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState(false)

  // 抽奖动画状态
  const [isDrawing, setIsDrawing] = useState(false)
  const [highlightedItemId, setHighlightedItemId] = useState(null)

  // 停止动画标志
  const stopAnimationRef = useRef(false)

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
    canSkip: false
  })

  // 添加电池的处理函数
  const handleAddBatteries = () => {
    playSound('Buy_01_UI.Buy_01_UI.wav')

    const batteriesToAdd = 3000

    setGameState(prev => ({
      ...prev,
      commonCurrency: prev.commonCurrency + batteriesToAdd
    }))

    toast.success(`已完成几轮任务，获得电池 ${batteriesToAdd}`, {
      duration: 2000,
      position: 'top-center',
      style: {
        background: '#000',
        color: '#fff',
        border: '1px solid #3b82f6',
        borderRadius: '12px',
        padding: '12px 24px'
      }
    })
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
      onResetData: () => setResetModal(true),
      onAddBatteries: handleAddBatteries
    })
  }, [activityConfig, gameState, resultModal.show, infoModal, shopModal, historyModal, resetModal, sponsorModal, onUpdateHeader])

  // 获取当前奖池的物品列表
  const getCurrentItems = () => {
    return selectedCargoType === 'rm' ? gameState.items : gameState.items_else
  }

  // ========== 抽奖核心逻辑 ==========
  const drawLottery = (customItems = null) => {
    const suffix = selectedCargoType === 'rm' ? '' : '_else'
    const itemsKey = suffix ? `items${suffix}` : 'items'
    const items = customItems || gameState[itemsKey]

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
    if (item.id.startsWith('currency_') || item.id.startsWith('bigevent_currency_')) {
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
    stopAnimationRef.current = false
    let currentIndex = 0

    const showNextItem = () => {
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

    stopAnimationRef.current = false

    setResultModal(prev => ({
      ...prev,
      isPaused: false,
      isGenerating: true
    }))

    const allItems = resultModal.items
    const drawType = resultModal.drawType
    let index = resultModal.processedIndex

    const showNextItem = () => {
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
    if (!resultModal.canSkip) return
    if (!resultModal.isGenerating || resultModal.isPaused) return

    stopAnimationRef.current = true

    const allItems = resultModal.items
    const drawType = resultModal.drawType
    const currentIndex = resultModal.processedIndex

    let nextEpicLegendaryIndex = -1
    for (let i = currentIndex; i < allItems.length; i++) {
      if (allItems[i].rarity === 'epic' || allItems[i].rarity === 'legendary') {
        nextEpicLegendaryIndex = i
        break
      }
    }

    if (nextEpicLegendaryIndex !== -1) {
      const itemsToAdd = allItems.slice(currentIndex, nextEpicLegendaryIndex + 1)

      setResultModal(prev => {
        let newDisplayedItems = [...prev.displayedItems, ...itemsToAdd]

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

      playSound('Reward_Daily_02_UI.Reward_Daily_02_UI.wav')
    } else {
      const itemsToAdd = allItems.slice(currentIndex)

      setResultModal(prev => {
        let newDisplayedItems = [...prev.displayedItems, ...itemsToAdd]

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

  // ========== 单抽 ==========
  const handleSingleDraw = () => {
    const suffix = selectedCargoType === 'rm' ? '' : '_else'
    const currencyKey = selectedCargoType === 'rm' ? 'currency' : 'commonCurrency'
    const currencyName = selectedCargoType === 'rm' ? '授权密钥' : '无人机电池'
    const singleCost = gameState.singleCost

    if (gameState[currencyKey] < singleCost) {
      toast.error(`${currencyName}不够，请充值`, {
        duration: 2000,
        position: 'top-center',
        style: {
          background: '#1e293b',
          color: '#fff',
          border: '1px solid #0ea5e9',
        },
      })
      setShopModal(true)
      return
    }

    setIsDrawing(true)
    setGameState(prev => ({
      ...prev,
      [currencyKey]: prev[currencyKey] - singleCost,
      [suffix ? `totalDraws${suffix}` : 'totalDraws']: prev[suffix ? `totalDraws${suffix}` : 'totalDraws'] + 1
    }))

    // 先抽出结果
    const result = drawLottery()

    // 获取可抽取物品列表
    const itemsKey = suffix ? `items${suffix}` : 'items'
    const availableItems = gameState[itemsKey].filter(item =>
      item.limit === 0 || item.obtained < item.limit
    )

    // Fisher-Yates洗牌算法
    const shuffle = (array) => {
      const arr = [...array]
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    }

    // 高亮动画 - 伪随机洗牌
    let shuffledItems = shuffle(availableItems)
    let shuffleIndex = 0
    let currentCount = 0
    let delay = 50
    const maxDelay = 300
    const delayIncrement = 15

    const highlightNext = () => {
      if (currentCount < 20) {
        if (shuffleIndex >= shuffledItems.length) {
          shuffledItems = shuffle(availableItems)
          shuffleIndex = 0
        }

        setHighlightedItemId(shuffledItems[shuffleIndex].id)
        shuffleIndex++
        currentCount++
        delay += delayIncrement
        setTimeout(highlightNext, Math.min(delay, maxDelay))
      } else {
        // 最后定格在抽中的物品上
        setHighlightedItemId(result.id)
        setTimeout(() => {
          const totalDrawsKey = suffix ? `totalDraws${suffix}` : 'totalDraws'
          const legendaryCountKey = suffix ? `legendaryCount${suffix}` : 'legendaryCount'
          const epicCountKey = suffix ? `epicCount${suffix}` : 'epicCount'
          const rareCountKey = suffix ? `rareCount${suffix}` : 'rareCount'
          const historyKey = suffix ? `history${suffix}` : 'history'
          const epicLegendaryHistoryKey = suffix ? `epicLegendaryHistory${suffix}` : 'epicLegendaryHistory'

          setGameState(prev => {
            const updatedItems = prev[itemsKey].map(item => {
              if (item.name === result.name && item.rarity === result.rarity) {
                return { ...item, obtained: item.obtained + 1 }
              }
              return item
            })

            const currencyBonus = extractCurrencyAmount(result)

            let updatedEpicCount = prev[epicCountKey]
            let updatedLegendaryCount = prev[legendaryCountKey]
            let updatedRareCount = prev[rareCountKey]
            let updatedEpicLegendaryHistory = [...prev[epicLegendaryHistoryKey]]

            if (result.rarity === 'legendary') {
              updatedLegendaryCount++
              updatedEpicCount = 0
              updatedRareCount = 0
              updatedEpicLegendaryHistory = [...updatedEpicLegendaryHistory, { item: result, drawNumber: prev[totalDrawsKey] }]
            } else if (result.rarity === 'epic') {
              updatedEpicCount++
              updatedRareCount = 0
              updatedEpicLegendaryHistory = [...updatedEpicLegendaryHistory, { item: result, drawNumber: prev[totalDrawsKey] }]
            } else if (result.rarity === 'rare') {
              updatedRareCount++
              updatedEpicCount++
              updatedLegendaryCount++
            } else {
              updatedRareCount++
              updatedEpicCount++
              updatedLegendaryCount++
            }

            return {
              ...prev,
              [itemsKey]: updatedItems,
              [currencyKey]: prev[currencyKey] + currencyBonus,
              [epicCountKey]: updatedEpicCount,
              [legendaryCountKey]: updatedLegendaryCount,
              [rareCountKey]: updatedRareCount,
              [historyKey]: [...prev[historyKey], result],
              [epicLegendaryHistoryKey]: updatedEpicLegendaryHistory
            }
          })

          const resultWithDrawNum = (result.rarity === 'epic' || result.rarity === 'legendary')
            ? { ...result, drawNumber: gameState[totalDrawsKey] + 1 }
            : result

          if (result.rarity === 'epic' || result.rarity === 'legendary') {
            playSound('Reward_Daily_02_UI.Reward_Daily_02_UI.wav')
          } else {
            playSound('UpgradeFailed_01_UI.UpgradeFailed_01_UI.wav')
          }

          setResultModal({
            show: true,
            items: [resultWithDrawNum],
            displayedItems: [resultWithDrawNum],
            isMulti: false,
            drawType: 'single',
            isGenerating: false,
            isPaused: false,
            isComplete: true,
            processedIndex: 1,
            canSkip: false
          })
          setIsDrawing(false)
          setHighlightedItemId(null)
        }, 500)
      }
    }

    highlightNext()
  }

  // ========== 十连抽 ==========
  const handleMultiDraw = () => {
    const suffix = selectedCargoType === 'rm' ? '' : '_else'
    const currencyKey = selectedCargoType === 'rm' ? 'currency' : 'commonCurrency'
    const currencyName = selectedCargoType === 'rm' ? '授权密钥' : '无人机电池'

    if (gameState[currencyKey] < 10) {
      toast.error(`${currencyName}不够，请充值`, {
        duration: 2000,
        position: 'top-center',
        style: {
          background: '#1e293b',
          color: '#fff',
          border: '1px solid #0ea5e9',
        },
      })
      setShopModal(true)
      return
    }

    setIsDrawing(true)
    setGameState(prev => ({
      ...prev,
      [currencyKey]: prev[currencyKey] - 10,
      [suffix ? `totalDraws${suffix}` : 'totalDraws']: prev[suffix ? `totalDraws${suffix}` : 'totalDraws'] + 10
    }))

    setTimeout(() => {
      const itemsKey = suffix ? `items${suffix}` : 'items'
      const totalDrawsKey = suffix ? `totalDraws${suffix}` : 'totalDraws'
      const legendaryCountKey = suffix ? `legendaryCount${suffix}` : 'legendaryCount'
      const epicCountKey = suffix ? `epicCount${suffix}` : 'epicCount'
      const rareCountKey = suffix ? `rareCount${suffix}` : 'rareCount'
      const historyKey = suffix ? `history${suffix}` : 'history'
      const epicLegendaryHistoryKey = suffix ? `epicLegendaryHistory${suffix}` : 'epicLegendaryHistory'

      const results = []
      let tempGameState = { ...gameState }
      tempGameState[currencyKey] = gameState[currencyKey] - 10
      tempGameState[totalDrawsKey] = gameState[totalDrawsKey] + 10

      for (let i = 0; i < 10; i++) {
        const result = drawLottery(tempGameState[itemsKey])
        results.push(result)

        const currencyBonus = extractCurrencyAmount(result)

        tempGameState = {
          ...tempGameState,
          [currencyKey]: tempGameState[currencyKey] + currencyBonus,
          [itemsKey]: tempGameState[itemsKey].map(item => {
            if (item.name === result.name && item.rarity === result.rarity) {
              return { ...item, obtained: item.obtained + 1 }
            }
            return item
          })
        }

        if (result.rarity === 'legendary') {
          tempGameState[legendaryCountKey] = 0
          tempGameState[epicCountKey] = 0
          tempGameState[rareCountKey] = 0
        } else if (result.rarity === 'epic') {
          tempGameState[epicCountKey] = 0
          tempGameState[rareCountKey] = 0
          tempGameState[legendaryCountKey]++
        } else if (result.rarity === 'rare') {
          tempGameState[rareCountKey] = 0
          tempGameState[epicCountKey]++
          tempGameState[legendaryCountKey]++
        } else {
          tempGameState[rareCountKey]++
          tempGameState[epicCountKey]++
          tempGameState[legendaryCountKey]++
        }
      }

      const resultsWithDrawNum = results.map((result, index) => {
        if (result.rarity === 'epic' || result.rarity === 'legendary') {
          return { ...result, drawNumber: gameState[totalDrawsKey] + index + 1 }
        }
        return result
      })

      let updatedEpicLegendaryHistory = [...gameState[epicLegendaryHistoryKey]]
      resultsWithDrawNum.forEach((result, index) => {
        if (result.rarity === 'epic' || result.rarity === 'legendary') {
          updatedEpicLegendaryHistory.push({
            item: result,
            drawNumber: gameState[totalDrawsKey] + index + 1
          })
        }
      })

      setGameState(prev => ({
        ...tempGameState,
        [historyKey]: [...prev[historyKey], ...results],
        [epicLegendaryHistoryKey]: updatedEpicLegendaryHistory
      }))

      setResultModal({
        show: true,
        items: resultsWithDrawNum,
        displayedItems: [],
        isMulti: true,
        drawType: 'multi10',
        isGenerating: true,
        isPaused: false,
        isComplete: false,
        processedIndex: 0,
        canSkip: false
      })
      setIsDrawing(false)

      setTimeout(() => {
        progressivelyShowItems(resultsWithDrawNum, 'multi10')
      }, 100)
    }, 300)
  }

  // ========== 百连抽 ==========
  const handleDraw100 = () => {
    const suffix = selectedCargoType === 'rm' ? '' : '_else'
    const currencyKey = selectedCargoType === 'rm' ? 'currency' : 'commonCurrency'
    const currencyName = selectedCargoType === 'rm' ? '授权密钥' : '无人机电池'

    if (gameState[currencyKey] < 100) {
      toast.error(`${currencyName}不够，请充值`, {
        duration: 2000,
        position: 'top-center',
        style: {
          background: '#1e293b',
          color: '#fff',
          border: '1px solid #0ea5e9',
        },
      })
      setShopModal(true)
      return
    }

    setIsDrawing(true)
    setGameState(prev => ({
      ...prev,
      [currencyKey]: prev[currencyKey] - 100,
      [suffix ? `totalDraws${suffix}` : 'totalDraws']: prev[suffix ? `totalDraws${suffix}` : 'totalDraws'] + 100
    }))

    setTimeout(() => {
      const itemsKey = suffix ? `items${suffix}` : 'items'
      const totalDrawsKey = suffix ? `totalDraws${suffix}` : 'totalDraws'
      const legendaryCountKey = suffix ? `legendaryCount${suffix}` : 'legendaryCount'
      const epicCountKey = suffix ? `epicCount${suffix}` : 'epicCount'
      const rareCountKey = suffix ? `rareCount${suffix}` : 'rareCount'
      const historyKey = suffix ? `history${suffix}` : 'history'
      const epicLegendaryHistoryKey = suffix ? `epicLegendaryHistory${suffix}` : 'epicLegendaryHistory'

      const results = []
      let tempGameState = { ...gameState }
      tempGameState[currencyKey] = gameState[currencyKey] - 100
      tempGameState[totalDrawsKey] = gameState[totalDrawsKey] + 100

      for (let i = 0; i < 100; i++) {
        const result = drawLottery(tempGameState[itemsKey])
        results.push(result)

        const currencyBonus = extractCurrencyAmount(result)

        tempGameState = {
          ...tempGameState,
          [currencyKey]: tempGameState[currencyKey] + currencyBonus,
          [itemsKey]: tempGameState[itemsKey].map(item => {
            if (item.name === result.name && item.rarity === result.rarity) {
              return { ...item, obtained: item.obtained + 1 }
            }
            return item
          })
        }

        if (result.rarity === 'legendary') {
          tempGameState[legendaryCountKey] = 0
          tempGameState[epicCountKey] = 0
          tempGameState[rareCountKey] = 0
        } else if (result.rarity === 'epic') {
          tempGameState[epicCountKey] = 0
          tempGameState[rareCountKey] = 0
          tempGameState[legendaryCountKey]++
        } else if (result.rarity === 'rare') {
          tempGameState[rareCountKey] = 0
          tempGameState[epicCountKey]++
          tempGameState[legendaryCountKey]++
        } else {
          tempGameState[rareCountKey]++
          tempGameState[epicCountKey]++
          tempGameState[legendaryCountKey]++
        }
      }

      const resultsWithDrawNum = results.map((result, index) => {
        if (result.rarity === 'epic' || result.rarity === 'legendary') {
          return { ...result, drawNumber: gameState[totalDrawsKey] + index + 1 }
        }
        return result
      })

      let updatedEpicLegendaryHistory = [...gameState[epicLegendaryHistoryKey]]
      resultsWithDrawNum.forEach((result, index) => {
        if (result.rarity === 'epic' || result.rarity === 'legendary') {
          updatedEpicLegendaryHistory.push({
            item: result,
            drawNumber: gameState[totalDrawsKey] + index + 1
          })
        }
      })

      setGameState(prev => ({
        ...tempGameState,
        [historyKey]: [...prev[historyKey], ...results],
        [epicLegendaryHistoryKey]: updatedEpicLegendaryHistory
      }))

      const remainingLimited = getRemainingLimitedEpicLegendary(tempGameState[itemsKey])
      const canSkip = remainingLimited <= 1

      setResultModal({
        show: true,
        items: resultsWithDrawNum,
        displayedItems: [],
        isMulti: true,
        drawType: 'multi100',
        isGenerating: true,
        isPaused: false,
        isComplete: false,
        processedIndex: 0,
        canSkip
      })
      setIsDrawing(false)

      setTimeout(() => {
        progressivelyShowItems(resultsWithDrawNum, 'multi100')
      }, 100)
    }, 300)
  }

  // ========== 五百连抽 ==========
  const handleDraw500 = () => {
    const suffix = selectedCargoType === 'rm' ? '' : '_else'
    const currencyKey = selectedCargoType === 'rm' ? 'currency' : 'commonCurrency'
    const currencyName = selectedCargoType === 'rm' ? '授权密钥' : '无人机电池'

    if (gameState[currencyKey] < 500) {
      toast.error(`${currencyName}不够，请充值`, {
        duration: 2000,
        position: 'top-center',
        style: {
          background: '#1e293b',
          color: '#fff',
          border: '1px solid #0ea5e9',
        },
      })
      setShopModal(true)
      return
    }

    setIsDrawing(true)
    setGameState(prev => ({
      ...prev,
      [currencyKey]: prev[currencyKey] - 500,
      [suffix ? `totalDraws${suffix}` : 'totalDraws']: prev[suffix ? `totalDraws${suffix}` : 'totalDraws'] + 500
    }))

    setTimeout(() => {
      const itemsKey = suffix ? `items${suffix}` : 'items'
      const totalDrawsKey = suffix ? `totalDraws${suffix}` : 'totalDraws'
      const legendaryCountKey = suffix ? `legendaryCount${suffix}` : 'legendaryCount'
      const epicCountKey = suffix ? `epicCount${suffix}` : 'epicCount'
      const rareCountKey = suffix ? `rareCount${suffix}` : 'rareCount'
      const historyKey = suffix ? `history${suffix}` : 'history'
      const epicLegendaryHistoryKey = suffix ? `epicLegendaryHistory${suffix}` : 'epicLegendaryHistory'

      const results = []
      let tempGameState = { ...gameState }
      tempGameState[currencyKey] = gameState[currencyKey] - 500
      tempGameState[totalDrawsKey] = gameState[totalDrawsKey] + 500

      for (let i = 0; i < 500; i++) {
        const result = drawLottery(tempGameState[itemsKey])
        results.push(result)

        const currencyBonus = extractCurrencyAmount(result)

        tempGameState = {
          ...tempGameState,
          [currencyKey]: tempGameState[currencyKey] + currencyBonus,
          [itemsKey]: tempGameState[itemsKey].map(item => {
            if (item.name === result.name && item.rarity === result.rarity) {
              return { ...item, obtained: item.obtained + 1 }
            }
            return item
          })
        }

        if (result.rarity === 'legendary') {
          tempGameState[legendaryCountKey] = 0
          tempGameState[epicCountKey] = 0
          tempGameState[rareCountKey] = 0
        } else if (result.rarity === 'epic') {
          tempGameState[epicCountKey] = 0
          tempGameState[rareCountKey] = 0
          tempGameState[legendaryCountKey]++
        } else if (result.rarity === 'rare') {
          tempGameState[rareCountKey] = 0
          tempGameState[epicCountKey]++
          tempGameState[legendaryCountKey]++
        } else {
          tempGameState[rareCountKey]++
          tempGameState[epicCountKey]++
          tempGameState[legendaryCountKey]++
        }
      }

      const resultsWithDrawNum = results.map((result, index) => {
        if (result.rarity === 'epic' || result.rarity === 'legendary') {
          return { ...result, drawNumber: gameState[totalDrawsKey] + index + 1 }
        }
        return result
      })

      let updatedEpicLegendaryHistory = [...gameState[epicLegendaryHistoryKey]]
      resultsWithDrawNum.forEach((result, index) => {
        if (result.rarity === 'epic' || result.rarity === 'legendary') {
          updatedEpicLegendaryHistory.push({
            item: result,
            drawNumber: gameState[totalDrawsKey] + index + 1
          })
        }
      })

      setGameState(prev => ({
        ...tempGameState,
        [historyKey]: [...prev[historyKey], ...results],
        [epicLegendaryHistoryKey]: updatedEpicLegendaryHistory
      }))

      const remainingLimited = getRemainingLimitedEpicLegendary(tempGameState[itemsKey])
      const canSkip = remainingLimited <= 1

      setResultModal({
        show: true,
        items: resultsWithDrawNum,
        displayedItems: [],
        isMulti: true,
        drawType: 'multi500',
        isGenerating: true,
        isPaused: false,
        isComplete: false,
        processedIndex: 0,
        canSkip
      })
      setIsDrawing(false)

      setTimeout(() => {
        progressivelyShowItems(resultsWithDrawNum, 'multi500')
      }, 100)
    }, 300)
  }

  // 处理标签切换
  const handleTabSelect = (type) => {
    setSelectedCargoType(type)
  }

  // 重置当前活动数据
  const handleResetCurrent = () => {
    console.log(`[CargoGacha] Resetting data for ${activityId}`)

    // 清除 localStorage
    clearGameState(activityId)

    // 重置里程碑
    resetMilestones()

    // 重置状态，保留物品列表但清零obtained
    setGameState(prev => {
      const defaultState = getDefaultGameState('机密货物类')
      return {
        ...defaultState,
        items: prev.items.map(item => ({ ...item, obtained: 0 })),
        items_else: prev.items_else.map(item => ({ ...item, obtained: 0 }))
      }
    })

    setResetModal(false)

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
    console.log('[CargoGacha] Resetting all activities')

    // 清除所有 localStorage
    clearAllGameStates()

    // 清除所有活动的里程碑记录
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

    // 重置当前活动的里程碑（清空内存状态）
    resetMilestones()

    // 重置当前状态，保留物品列表但清零obtained
    setGameState(prev => {
      const defaultState = getDefaultGameState('机密货物类')
      return {
        ...defaultState,
        items: prev.items.map(item => ({ ...item, obtained: 0 })),
        items_else: prev.items_else.map(item => ({ ...item, obtained: 0 }))
      }
    })

    setConfirmModal(false)
    setResetModal(false)

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

  // 商店套餐数据
  const [shopPackages, setShopPackages] = useState([
    { id: 1, coins: 22, price: 25, image: '', discount: '-10%' },
    { id: 2, coins: 60, price: 60, image: '', discount: '-15%' },
    { id: 3, coins: 135, baseCoins: 135, price: 120, basePrice: 120, image: '', discount: '-25%', quantity: 1 }
  ])

  // 根据 activityId 更新商店套餐图片
  useEffect(() => {
    if (activityId) {
      setShopPackages(prev => prev.map(pkg => ({
        ...pkg,
        image: buildShopPackageUrl(activityId, pkg.id)
      })))
    }
  }, [activityId])

  // 更新135密钥档位的数量
  const updateQuantity = (packageId, newQuantity) => {
    if (packageId !== 3 || newQuantity < 1) return
    setShopPackages(prev => prev.map(pkg => {
      if (pkg.id === packageId) {
        return {
          ...pkg,
          quantity: newQuantity,
          coins: pkg.baseCoins * newQuantity,
          price: pkg.basePrice * newQuantity
        }
      }
      return pkg
    }))
  }

  // 商店购买处理
  const handleBuyPackage = (pkg) => {
    playSound('Buy_01_UI.Buy_01_UI.wav')

    setGameState(prev => ({
      ...prev,
      // 根据当前选择的奖池类型决定增加哪种货币
      ...(selectedCargoType === 'rm'
        ? { currency: prev.currency + pkg.coins }
        : { commonCurrency: prev.commonCurrency + pkg.coins }
      ),
      rmb: prev.rmb - pkg.price
    }))

    setShopModal(false)

    toast.success(`成功购买 ${pkg.coins} 个${selectedCargoType === 'rm' ? '授权密钥' : '无人机电池'}！`, {
      duration: 2000,
      position: 'top-center'
    })
  }

  // 获取当前奖池图片URL（gameplay=gacha2, rm=gacha1）
  const poolImageUrl = buildCargoPoolImageUrl(activityId, selectedCargoType === 'gameplay' ? 2 : 1)
  const backgroundUrl = buildBackgroundUrl(activityConfig)

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Header 占位容器 */}
      <HeaderSpacer />

      {/* 背景图片 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${backgroundUrl})`
        }}
      />

      {/* 背景蒙版，提升前景对比度 */}
      <div className="absolute inset-0 bg-black/35" />

      {/* 主内容区域 */}
      <div className="relative z-10 h-full px-4 sm:px-6 lg:px-12 pt-4 sm:pt-8 pb-32 sm:pb-40 lg:pb-64">
        <div className="mx-auto flex h-full w-full max-w-7xl flex-col lg:flex-row items-center lg:items-start justify-center gap-6 md:gap-8">
          {/* 左侧：奖池选择标签 */}
          <div className="order-1 lg:order-none w-full lg:w-auto flex justify-center lg:justify-start">
            <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 sm:gap-3 p-2 sm:p-3 lg:py-4 rounded-full lg:rounded-3xl border border-white/10 bg-slate-950/60 backdrop-blur-md shadow-[0_15px_35px_rgba(15,23,42,0.45)]">
              {[
                { type: 'rm', label: '机密货物' },
                { type: 'gameplay', label: '货运无人机' }
              ].map((tab) => (
                <button
                  key={tab.type}
                  onClick={() => handleTabSelect(tab.type)}
                  className={`relative min-w-[7.5rem] sm:min-w-[8.5rem] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap transition-all text-center lg:text-right border ${selectedCargoType === tab.type
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60 shadow-[0_0_18px_rgba(16,185,129,0.45)] scale-105'
                    : 'text-white/60 hover:text-white/80 border-white/10 hover:border-white/30'
                  }`}
                >
                  {tab.label}
                  {selectedCargoType === tab.type && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -bottom-1 right-4 left-4 h-0.5 bg-emerald-400/80"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 中间：物品网格 */}
          <div className="order-2 flex w-full justify-center">
            <div className="flex flex-col items-center gap-2 sm:gap-3 origin-center scale-[0.68] sm:scale-90 md:scale-95 lg:scale-100">
              {/* 上排 4 个 */}
              <div className="flex gap-2 sm:gap-3">
                {getCurrentItems().slice(0, 4).map((item, i) => (
                  <SquareItem
                    key={item.id || i}
                    item={item}
                    activityConfig={activityConfig}
                    isHighlighted={highlightedItemId === item.id}
                  />
                ))}
              </div>

              {/* 中间行：左1 + 提示文字 + 右1 */}
              <div className="flex w-full items-center justify-between gap-2 sm:gap-3">
                {getCurrentItems()[4] && (
                  <SquareItem
                    item={getCurrentItems()[4]}
                    activityConfig={activityConfig}
                    isHighlighted={highlightedItemId === getCurrentItems()[4].id}
                  />
                )}

                <div className="flex-1 flex items-center justify-center px-2 sm:px-4">
                  <p className="text-emerald-400 text-[10px] sm:text-xs font-bold text-center leading-snug">
                    开启{selectedCargoType === 'gameplay' ? '货运无人机' : '机密货物'}
                    <br/>
                    获取稀有及史诗级物品
                  </p>
                </div>

                {getCurrentItems()[5] && (
                  <SquareItem
                    item={getCurrentItems()[5]}
                    activityConfig={activityConfig}
                    isHighlighted={highlightedItemId === getCurrentItems()[5].id}
                  />
                )}
              </div>

              {/* 下排 4 个 */}
              <div className="flex gap-2 sm:gap-3">
                {getCurrentItems().slice(6, 10).map((item, i) => (
                  <SquareItem
                    key={item.id || i + 6}
                    item={item}
                    activityConfig={activityConfig}
                    isHighlighted={highlightedItemId === item.id}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：大图展示 */}
          <div className="order-3 lg:order-none w-full lg:flex-1 flex justify-center items-center pt-6 lg:pt-12">
            {/* 图片容器 */}
            <motion.div
              key={selectedCargoType}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-[420px] sm:max-w-[520px] lg:max-w-none"
            >
              {/* 提示文字 - 悬浮在图片左上区域 */}
              <motion.p
                key={`text-${selectedCargoType}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`absolute text-white text-sm sm:text-base lg:text-lg font-bold drop-shadow-lg z-10 whitespace-nowrap ${
                  selectedCargoType === 'rm'
                    ? 'top-6 left-6 sm:top-10 sm:left-12 lg:top-16 lg:left-16'
                    : 'top-4 left-4 sm:top-6 sm:left-6 lg:top-8 lg:left-8'
                }`}
              >
                {selectedCargoType === 'gameplay'
                  ? '使用无人机电池启动货运无人机，以获取炫酷奖励！'
                  : '开启机密货物，以获取稀有及史诗级物品！'}
              </motion.p>

              <img
                src={poolImageUrl}
                alt={selectedCargoType === 'gameplay' ? '货运无人机' : '机密货物'}
                className="w-full h-auto object-contain drop-shadow-2xl"
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* 底部：抽奖按钮区域 */}
      <div className="absolute left-0 right-0 bottom-8 sm:bottom-12 md:bottom-16 lg:bottom-24 flex justify-center items-center z-20 px-4">
        <div className="flex flex-wrap gap-2 sm:gap-4 md:gap-6 lg:gap-8 justify-center">
          {/* 抽奖 x1 */}
          <button
            onClick={handleSingleDraw}
            className="relative inline-flex h-8 md:h-10 overflow-hidden rounded-md p-[1px] focus:outline-none"
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#10b981_0%,#059669_50%,#10b981_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-md bg-gradient-to-b from-emerald-500 to-emerald-700 px-3 sm:px-4 md:px-8 py-1 text-xs md:text-sm font-bold text-white backdrop-blur-3xl hover:from-emerald-400 hover:to-emerald-600 transition-all">
              抽奖 ×1
            </span>
          </button>

          {/* 抽奖 x10 */}
          <button
            onClick={handleMultiDraw}
            className="relative inline-flex h-8 md:h-10 overflow-hidden rounded-md p-[1px] focus:outline-none"
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#10b981_0%,#059669_50%,#10b981_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-md bg-gradient-to-b from-emerald-500 to-emerald-700 px-3 sm:px-4 md:px-8 py-1 text-xs md:text-sm font-bold text-white backdrop-blur-3xl hover:from-emerald-400 hover:to-emerald-600 transition-all">
              抽奖 ×10
            </span>
          </button>

          {/* 抽奖 x100 - 金色主题 */}
          <button
            onClick={handleDraw100}
            disabled={isDrawing}
            className="relative inline-flex h-8 md:h-10 overflow-hidden rounded-full p-[1px] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#fde047_0%,#ea580c_50%,#fde047_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 sm:px-4 md:px-8 py-1 text-xs md:text-sm font-bold text-white backdrop-blur-3xl hover:bg-slate-900 transition-all">
              抽奖 ×100
            </span>
          </button>

          {/* 抽奖 x500 - 特殊紫色主题 */}
          <button
            onClick={handleDraw500}
            disabled={isDrawing}
            className="relative inline-flex h-8 md:h-10 overflow-hidden rounded-full p-[1px] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 sm:px-4 md:px-8 py-1 text-xs md:text-sm font-bold text-white backdrop-blur-3xl hover:bg-slate-900 transition-all">
              抽奖 ×500
            </span>
          </button>
        </div>
      </div>

      {/* 结果弹窗 */}
      <ResultModal
        resultModal={resultModal}
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
        onUpdateQuantity={updateQuantity}
        activityConfig={activityConfig}
        mode="cargo"
      />

      {/* 历史记录弹窗 */}
      <HistoryModal
        isOpen={historyModal}
        onClose={() => setHistoryModal(false)}
        history={selectedCargoType === 'rm' ? gameState.epicLegendaryHistory : gameState.epicLegendaryHistory_else}
      />

      {/* 信息弹窗 */}
      <InfoModal
        isOpen={infoModal}
        onClose={() => setInfoModal(false)}
        epicLegendaryHistory={selectedCargoType === 'rm' ? gameState.epicLegendaryHistory : gameState.epicLegendaryHistory_else}
        activityId={activityId}
        totalDraws={selectedCargoType === 'rm' ? gameState.totalDraws : gameState.totalDraws_else}
      />

      {/* 赞助弹窗 */}
      <SponsorModal
        isOpen={sponsorModal}
        onClose={() => onSetSponsorModal(false)}
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
