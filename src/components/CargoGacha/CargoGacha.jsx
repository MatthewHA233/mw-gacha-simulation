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

        // 保存完整的活动配置（保留原始 gacha_type）
        const fullConfig = {
          id: activityId,
          gacha_type: config.gacha_type || '机密货物类',
          ...config
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

  // 添加电池/遥控器的处理函数
  const handleAddBatteries = () => {
    playSound('Buy_01_UI.Buy_01_UI.wav')

    const batteriesToAdd = 450
    const isSpType = activityConfig.gacha_type === '无人机补给类'
    const currencyName = isSpType ? '遥控器' : '电池'

    setGameState(prev => ({
      ...prev,
      commonCurrency: prev.commonCurrency + batteriesToAdd
    }))

    toast.success(`已完成几轮任务，获得${currencyName} ${batteriesToAdd}`, {
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
  const drawLottery = (customItems = null, customCounter = null) => {
    const suffix = selectedCargoType === 'rm' ? '' : '_else'
    const itemsKey = suffix ? `items${suffix}` : 'items'
    const guaranteeCounterKey = suffix ? `guaranteeCounter${suffix}` : 'guaranteeCounter'
    const items = customItems || gameState[itemsKey]

    // 保底机制：机密货物1150抽，货运无人机950抽
    const guaranteeThreshold = selectedCargoType === 'rm' ? 1150 : 950
    const currentCounter = customCounter !== null ? customCounter : (gameState[guaranteeCounterKey] || 0)

    // 检查是否达到保底（在保底抽数-1时触发，因为计数器从0开始）
    if (currentCounter >= guaranteeThreshold - 1) {
      // 强制抽出头奖物品（items[0]）
      const prizeItem = items[0]
      // 检查头奖是否还能抽取
      if (prizeItem && (prizeItem.limit === 0 || prizeItem.obtained < prizeItem.limit)) {
        console.log(`[CargoGacha] 触发保底机制！强制抽出头奖: ${prizeItem.name}`)
        return prizeItem
      }
      // 如果头奖已达上限，正常抽取
      console.log(`[CargoGacha] 头奖已达上限，保底失效，正常抽取`)
    }

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
    // 根据活动类型动态获取货币名称
    const isSpType = activityConfig.gacha_type === '无人机补给类'
    const currencyName = selectedCargoType === 'rm'
      ? (isSpType ? '开锁器' : '授权密钥')
      : (isSpType ? '遥控器' : '无人机电池')

    // gameplay货币（遥控器/电池）消耗是rm货币的30倍
    const singleCost = selectedCargoType === 'rm' ? gameState.singleCost : 30

    if (gameState[currencyKey] < singleCost) {
      toast.error(`${currencyName}不够${selectedCargoType === 'rm' ? '，请充值' : ''}`, {
        duration: 2000,
        position: 'top-center',
        style: {
          background: '#1e293b',
          color: '#fff',
          border: '1px solid #0ea5e9',
        },
      })
      // 只有rm货币不够时才弹出商店
      if (selectedCargoType === 'rm') {
        setShopModal(true)
      }
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
          const guaranteeCounterKey = suffix ? `guaranteeCounter${suffix}` : 'guaranteeCounter'

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

            // 检查是否抽中头奖（items[0]）
            const prizeItem = prev[itemsKey][0]
            const isPrizeItem = prizeItem && result.name === prizeItem.name && result.id === prizeItem.id

            // 更新保底计数器
            let updatedGuaranteeCounter = prev[guaranteeCounterKey] || 0
            if (isPrizeItem) {
              // 抽中头奖，重置保底计数器
              updatedGuaranteeCounter = 0
              console.log(`[CargoGacha] 抽中头奖，重置保底计数器`)
            } else {
              // 未抽中头奖，增加保底计数器
              updatedGuaranteeCounter++
            }

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
              [epicLegendaryHistoryKey]: updatedEpicLegendaryHistory,
              [guaranteeCounterKey]: updatedGuaranteeCounter
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
    // 根据活动类型动态获取货币名称
    const isSpType = activityConfig.gacha_type === '无人机补给类'
    const currencyName = selectedCargoType === 'rm'
      ? (isSpType ? '开锁器' : '授权密钥')
      : (isSpType ? '遥控器' : '无人机电池')

    // gameplay货币（遥控器/电池）消耗是rm货币的30倍
    const multiCost = selectedCargoType === 'rm' ? 10 : 300

    if (gameState[currencyKey] < multiCost) {
      toast.error(`${currencyName}不够${selectedCargoType === 'rm' ? '，请充值' : ''}`, {
        duration: 2000,
        position: 'top-center',
        style: {
          background: '#1e293b',
          color: '#fff',
          border: '1px solid #0ea5e9',
        },
      })
      // 只有rm货币不够时才弹出商店
      if (selectedCargoType === 'rm') {
        setShopModal(true)
      }
      return
    }

    setIsDrawing(true)
    setGameState(prev => ({
      ...prev,
      [currencyKey]: prev[currencyKey] - multiCost,
      [suffix ? `totalDraws${suffix}` : 'totalDraws']: prev[suffix ? `totalDraws${suffix}` : 'totalDraws'] + 10
    }))

    // 播放随机跳动动画
    const itemsKey = suffix ? `items${suffix}` : 'items'
    const availableItems = gameState[itemsKey].filter(item =>
      item.limit === 0 || item.obtained < item.limit
    )

    const shuffle = (array) => {
      const arr = [...array]
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    }

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
        setHighlightedItemId(null)
        // 动画结束后执行抽奖逻辑
        performMultiDraw()
      }
    }

    highlightNext()
  }

  // 执行十连抽逻辑（从 handleMultiDraw 中提取出来）
  const performMultiDraw = () => {
    const suffix = selectedCargoType === 'rm' ? '' : '_else'
    const currencyKey = selectedCargoType === 'rm' ? 'currency' : 'commonCurrency'
    const multiCost = selectedCargoType === 'rm' ? 10 : 300

    setTimeout(() => {
      const itemsKey = suffix ? `items${suffix}` : 'items'
      const totalDrawsKey = suffix ? `totalDraws${suffix}` : 'totalDraws'
      const legendaryCountKey = suffix ? `legendaryCount${suffix}` : 'legendaryCount'
      const epicCountKey = suffix ? `epicCount${suffix}` : 'epicCount'
      const rareCountKey = suffix ? `rareCount${suffix}` : 'rareCount'
      const historyKey = suffix ? `history${suffix}` : 'history'
      const epicLegendaryHistoryKey = suffix ? `epicLegendaryHistory${suffix}` : 'epicLegendaryHistory'
      const guaranteeCounterKey = suffix ? `guaranteeCounter${suffix}` : 'guaranteeCounter'

      const results = []
      let tempGameState = { ...gameState }
      tempGameState[currencyKey] = gameState[currencyKey] - multiCost
      tempGameState[totalDrawsKey] = gameState[totalDrawsKey] + 10

      for (let i = 0; i < 10; i++) {
        const result = drawLottery(tempGameState[itemsKey], tempGameState[guaranteeCounterKey])
        results.push(result)

        const currencyBonus = extractCurrencyAmount(result)

        // 检查是否抽中头奖
        const prizeItem = tempGameState[itemsKey][0]
        const isPrizeItem = prizeItem && result.name === prizeItem.name && result.id === prizeItem.id

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

        // 更新保底计数器
        if (isPrizeItem) {
          tempGameState[guaranteeCounterKey] = 0
        } else {
          tempGameState[guaranteeCounterKey] = (tempGameState[guaranteeCounterKey] || 0) + 1
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
    // 根据活动类型动态获取货币名称
    const isSpType = activityConfig.gacha_type === '无人机补给类'
    const currencyName = selectedCargoType === 'rm'
      ? (isSpType ? '开锁器' : '授权密钥')
      : (isSpType ? '遥控器' : '无人机电池')

    // gameplay货币（遥控器/电池）消耗是rm货币的30倍
    const draw100Cost = selectedCargoType === 'rm' ? 100 : 3000

    if (gameState[currencyKey] < draw100Cost) {
      toast.error(`${currencyName}不够${selectedCargoType === 'rm' ? '，请充值' : ''}`, {
        duration: 2000,
        position: 'top-center',
        style: {
          background: '#1e293b',
          color: '#fff',
          border: '1px solid #0ea5e9',
        },
      })
      // 只有rm货币不够时才弹出商店
      if (selectedCargoType === 'rm') {
        setShopModal(true)
      }
      return
    }

    setIsDrawing(true)
    setGameState(prev => ({
      ...prev,
      [currencyKey]: prev[currencyKey] - draw100Cost,
      [suffix ? `totalDraws${suffix}` : 'totalDraws']: prev[suffix ? `totalDraws${suffix}` : 'totalDraws'] + 100
    }))

    // 播放随机跳动动画
    const itemsKey = suffix ? `items${suffix}` : 'items'
    const availableItems = gameState[itemsKey].filter(item =>
      item.limit === 0 || item.obtained < item.limit
    )

    const shuffle = (array) => {
      const arr = [...array]
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    }

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
        setHighlightedItemId(null)
        // 动画结束后执行抽奖逻辑
        performDraw100()
      }
    }

    highlightNext()
  }

  // 执行百连抽逻辑（从 handleDraw100 中提取出来）
  const performDraw100 = () => {
    const suffix = selectedCargoType === 'rm' ? '' : '_else'
    const currencyKey = selectedCargoType === 'rm' ? 'currency' : 'commonCurrency'
    const draw100Cost = selectedCargoType === 'rm' ? 100 : 3000

    setTimeout(() => {
      const itemsKey = suffix ? `items${suffix}` : 'items'
      const totalDrawsKey = suffix ? `totalDraws${suffix}` : 'totalDraws'
      const legendaryCountKey = suffix ? `legendaryCount${suffix}` : 'legendaryCount'
      const epicCountKey = suffix ? `epicCount${suffix}` : 'epicCount'
      const rareCountKey = suffix ? `rareCount${suffix}` : 'rareCount'
      const historyKey = suffix ? `history${suffix}` : 'history'
      const epicLegendaryHistoryKey = suffix ? `epicLegendaryHistory${suffix}` : 'epicLegendaryHistory'
      const guaranteeCounterKey = suffix ? `guaranteeCounter${suffix}` : 'guaranteeCounter'

      const results = []
      let tempGameState = { ...gameState }
      tempGameState[currencyKey] = gameState[currencyKey] - draw100Cost
      tempGameState[totalDrawsKey] = gameState[totalDrawsKey] + 100

      for (let i = 0; i < 100; i++) {
        const result = drawLottery(tempGameState[itemsKey], tempGameState[guaranteeCounterKey])
        results.push(result)

        const currencyBonus = extractCurrencyAmount(result)

        // 检查是否抽中头奖
        const prizeItem = tempGameState[itemsKey][0]
        const isPrizeItem = prizeItem && result.name === prizeItem.name && result.id === prizeItem.id

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

        // 更新保底计数器
        if (isPrizeItem) {
          tempGameState[guaranteeCounterKey] = 0
        } else {
          tempGameState[guaranteeCounterKey] = (tempGameState[guaranteeCounterKey] || 0) + 1
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
    // 根据活动类型动态获取货币名称
    const isSpType = activityConfig.gacha_type === '无人机补给类'
    const currencyName = selectedCargoType === 'rm'
      ? (isSpType ? '开锁器' : '授权密钥')
      : (isSpType ? '遥控器' : '无人机电池')

    // gameplay货币（遥控器/电池）消耗是rm货币的30倍
    const draw500Cost = selectedCargoType === 'rm' ? 500 : 15000

    if (gameState[currencyKey] < draw500Cost) {
      toast.error(`${currencyName}不够${selectedCargoType === 'rm' ? '，请充值' : ''}`, {
        duration: 2000,
        position: 'top-center',
        style: {
          background: '#1e293b',
          color: '#fff',
          border: '1px solid #0ea5e9',
        },
      })
      // 只有rm货币不够时才弹出商店
      if (selectedCargoType === 'rm') {
        setShopModal(true)
      }
      return
    }

    setIsDrawing(true)
    setGameState(prev => ({
      ...prev,
      [currencyKey]: prev[currencyKey] - draw500Cost,
      [suffix ? `totalDraws${suffix}` : 'totalDraws']: prev[suffix ? `totalDraws${suffix}` : 'totalDraws'] + 500
    }))

    // 播放随机跳动动画
    const itemsKey = suffix ? `items${suffix}` : 'items'
    const availableItems = gameState[itemsKey].filter(item =>
      item.limit === 0 || item.obtained < item.limit
    )

    const shuffle = (array) => {
      const arr = [...array]
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    }

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
        setHighlightedItemId(null)
        // 动画结束后执行抽奖逻辑
        performDraw500()
      }
    }

    highlightNext()
  }

  // 执行五百连抽逻辑（从 handleDraw500 中提取出来）
  const performDraw500 = () => {
    const suffix = selectedCargoType === 'rm' ? '' : '_else'
    const currencyKey = selectedCargoType === 'rm' ? 'currency' : 'commonCurrency'
    const draw500Cost = selectedCargoType === 'rm' ? 500 : 15000

    setTimeout(() => {
      const itemsKey = suffix ? `items${suffix}` : 'items'
      const totalDrawsKey = suffix ? `totalDraws${suffix}` : 'totalDraws'
      const legendaryCountKey = suffix ? `legendaryCount${suffix}` : 'legendaryCount'
      const epicCountKey = suffix ? `epicCount${suffix}` : 'epicCount'
      const rareCountKey = suffix ? `rareCount${suffix}` : 'rareCount'
      const historyKey = suffix ? `history${suffix}` : 'history'
      const epicLegendaryHistoryKey = suffix ? `epicLegendaryHistory${suffix}` : 'epicLegendaryHistory'
      const guaranteeCounterKey = suffix ? `guaranteeCounter${suffix}` : 'guaranteeCounter'

      const results = []
      let tempGameState = { ...gameState }
      tempGameState[currencyKey] = gameState[currencyKey] - draw500Cost
      tempGameState[totalDrawsKey] = gameState[totalDrawsKey] + 500

      for (let i = 0; i < 500; i++) {
        const result = drawLottery(tempGameState[itemsKey], tempGameState[guaranteeCounterKey])
        results.push(result)

        const currencyBonus = extractCurrencyAmount(result)

        // 检查是否抽中头奖
        const prizeItem = tempGameState[itemsKey][0]
        const isPrizeItem = prizeItem && result.name === prizeItem.name && result.id === prizeItem.id

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

        // 更新保底计数器
        if (isPrizeItem) {
          tempGameState[guaranteeCounterKey] = 0
        } else {
          tempGameState[guaranteeCounterKey] = (tempGameState[guaranteeCounterKey] || 0) + 1
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

  // 处理按钮点击（添加音效）
  const handleButtonClick = (callback) => {
    playSound('Button_02_UI.Button_02_UI.wav')
    callback()
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

      {/* 主内容区域 */}
      <div className="relative z-10 h-full flex items-center justify-center px-4 md:px-8 lg:px-12 gap-2 md:gap-4 lg:gap-8 pb-64">
        {/* 左侧：奖池选择标签 */}
        <div className="flex justify-center lg:justify-start scale-[0.65] sm:scale-[0.75] md:scale-[0.85] lg:scale-100 origin-center translate-x-12 translate-y-20 sm:-translate-x-6 sm:translate-y-0 md:translate-x-1 lg:translate-x-2 xl:translate-x-0">
          <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-3xl border border-white/10 bg-slate-950/60 backdrop-blur-md shadow-[0_15px_35px_rgba(15,23,42,0.45)]">
            {(() => {
              // 从 cargos 配置中读取标签名称
              const rmCargo = activityConfig.cargos?.find(c => c.type === 'rm')
              const gameplayCargo = activityConfig.cargos?.find(c => c.type === 'gameplay')

              return [
                { type: 'rm', label: rmCargo?.metadata?.name || '机密货物' },
                { type: 'gameplay', label: gameplayCargo?.metadata?.name || '货运无人机' }
              ]
            })().map((tab) => {
              const isActive = selectedCargoType === tab.type

              return (
                <button
                  key={tab.type}
                  onClick={() => handleTabSelect(tab.type)}
                  className={`group relative min-w-[8.5rem] px-4 py-2 rounded-full font-bold text-xs md:text-xs lg:text-sm whitespace-nowrap text-center transition-all duration-300 ${isActive ? 'scale-105' : 'hover:scale-[1.02]'}`}
                >
                  <span
                    className={`absolute inset-0 rounded-full transition-all duration-300 ${isActive
                      ? 'bg-gradient-to-b from-emerald-400/35 via-emerald-500/20 to-emerald-400/10'
                      : 'bg-slate-900/60 group-hover:bg-slate-900/80'
                    }`}
                  />
                  <span
                    className={`absolute inset-0 rounded-full border transition-all duration-300 ${isActive
                      ? 'border-emerald-300/70 shadow-[0_0_32px_rgba(16,185,129,0.55)]'
                      : 'border-white/10 group-hover:border-white/25'
                    }`}
                  />
                  <span
                    className={`relative z-10 tracking-wide transition-colors duration-300 ${isActive
                      ? 'text-emerald-100 drop-shadow-[0_0_12px_rgba(16,185,129,0.75)]'
                      : 'text-white/55 group-hover:text-white/75'
                    }`}
                  >
                    {tab.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -bottom-1 left-[10%] h-0.5 w-4/5 rounded-full bg-emerald-300/80 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* 中间：物品网格 */}
        <div className="flex flex-col items-center gap-2 md:gap-3 lg:gap-4 scale-[0.65] sm:scale-[0.75] md:scale-[0.85] lg:scale-100 origin-center -translate-x-16 translate-y-20 sm:-translate-x-12 sm:translate-y-0 md:-translate-x-10 lg:-translate-x-8 xl:translate-x-0">
          {/* 物品网格 */}
          <div className="flex flex-col gap-2">
            {/* 上排 4 个 */}
            <div className="flex gap-2">
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
            <div className="flex gap-2 items-center justify-between">
              {getCurrentItems()[4] && (
                <SquareItem
                  item={getCurrentItems()[4]}
                  activityConfig={activityConfig}
                  isHighlighted={highlightedItemId === getCurrentItems()[4].id}
                />
              )}

              <div className="flex-1 flex items-center justify-center px-4">
                {(() => {
                  const currentItems = getCurrentItems()
                  const prizeItem = currentItems[0] // 头奖物品
                  const suffix = selectedCargoType === 'rm' ? '' : '_else'
                  const guaranteeCounterKey = suffix ? `guaranteeCounter${suffix}` : 'guaranteeCounter'
                  const guaranteeThreshold = selectedCargoType === 'rm' ? 1150 : 950
                  const currentCounter = gameState[guaranteeCounterKey] || 0
                  const remainingDraws = guaranteeThreshold - currentCounter

                  // 检查头奖是否已获得（达到上限）
                  const isPrizeObtained = prizeItem && prizeItem.limit > 0 && prizeItem.obtained >= prizeItem.limit

                  return (
                    <p className="text-emerald-400 text-xs font-bold text-center leading-snug">
                      {prizeItem ? prizeItem.name : '头奖物品'}
                      <br/>
                      {isPrizeObtained ? '已得到' : `在${remainingDraws}次抽奖后必得`}
                    </p>
                  )
                })()}
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
            <div className="flex gap-2">
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
        <div className="flex-1 flex justify-center items-center max-w-xl -translate-x-28 translate-y-20 sm:-translate-x-20 sm:translate-y-0 md:-translate-x-20 lg:-translate-x-16 xl:translate-x-0">
          {/* 图片容器 */}
          <motion.div
            key={selectedCargoType}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            {/* 提示文字 - 悬浮在图片左上区域 */}
            <motion.p
              key={`text-${selectedCargoType}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`absolute text-white text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs lg:text-sm xl:text-lg font-bold drop-shadow-lg z-10 whitespace-nowrap -translate-x-32 xs:-translate-x-28 sm:-translate-x-24 md:-translate-x-24 lg:-translate-x-20 xl:translate-x-0 ${
                selectedCargoType === 'rm' ? 'top-[15%] left-6 sm:left-8 md:left-10 lg:left-12 xl:left-16' : 'top-[12%] left-3 sm:left-4 md:left-5 lg:left-6 xl:left-8'
              }`}
            >
              {(() => {
                // 从 cargos 配置中读取奖池名称
                const cargo = activityConfig.cargos?.find(c => c.type === selectedCargoType)
                const cargoName = cargo?.metadata?.name

                // 根据活动类型和奖池类型生成文案
                const isSpType = activityConfig.gacha_type === '无人机补给类'

                if (selectedCargoType === 'gameplay') {
                  const currencyName = isSpType ? '遥控器' : '无人机电池'
                  return `使用${currencyName}启动${cargoName || '货运无人机'}，以获取炫酷奖励！`
                } else {
                  return `开启${cargoName || '机密货物'}，以获取稀有及史诗级物品！`
                }
              })()}
            </motion.p>

            <img
              src={poolImageUrl}
              alt={(() => {
                const cargo = activityConfig.cargos?.find(c => c.type === selectedCargoType)
                return cargo?.metadata?.name || (selectedCargoType === 'gameplay' ? '货运无人机' : '机密货物')
              })()}
              className="w-full h-auto min-w-[200px] object-contain drop-shadow-2xl"
            />
          </motion.div>
        </div>
      </div>

      {/* 底部：抽奖按钮区域 */}
      <div className="absolute bottom-16 md:bottom-20 lg:bottom-24 left-0 right-0 flex justify-center items-center z-20">
        <div className="flex flex-wrap gap-2 md:gap-4 lg:gap-8 justify-center scale-[0.65] sm:scale-[0.75] md:scale-[0.85] lg:scale-100 origin-center translate-y-10 sm:translate-y-0">
          {/* 抽奖 x1 */}
          <button
            onClick={() => handleButtonClick(handleSingleDraw)}
            disabled={isDrawing}
            className="relative inline-flex h-10 overflow-hidden rounded-md p-[1px] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#10b981_0%,#059669_50%,#10b981_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-md bg-gradient-to-b from-emerald-500 to-emerald-700 px-8 py-1 text-sm font-bold text-white backdrop-blur-3xl hover:from-emerald-400 hover:to-emerald-600 transition-all">
              抽奖 ×1
            </span>
          </button>

          {/* 抽奖 x10 */}
          <button
            onClick={() => handleButtonClick(handleMultiDraw)}
            disabled={isDrawing}
            className="relative inline-flex h-10 overflow-hidden rounded-md p-[1px] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#10b981_0%,#059669_50%,#10b981_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-md bg-gradient-to-b from-emerald-500 to-emerald-700 px-8 py-1 text-sm font-bold text-white backdrop-blur-3xl hover:from-emerald-400 hover:to-emerald-600 transition-all">
              抽奖 ×10
            </span>
          </button>

          {/* 抽奖 x100 - 金色主题 */}
          <button
            onClick={() => handleButtonClick(handleDraw100)}
            disabled={isDrawing}
            className="relative inline-flex h-10 overflow-hidden rounded-full p-[1px] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#fde047_0%,#ea580c_50%,#fde047_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-8 py-1 text-sm font-bold text-white backdrop-blur-3xl hover:bg-slate-900 transition-all">
              抽奖 ×100
            </span>
          </button>

          {/* 抽奖 x500 - 特殊紫色主题 */}
          <button
            onClick={() => handleButtonClick(handleDraw500)}
            disabled={isDrawing}
            className="relative inline-flex h-10 overflow-hidden rounded-full p-[1px] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-8 py-1 text-sm font-bold text-white backdrop-blur-3xl hover:bg-slate-900 transition-all">
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
