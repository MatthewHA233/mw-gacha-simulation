import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { CDN_BASE_URL } from '../../utils/constants'
import { useSound } from '../../hooks/useSound'
import { buildShopPackageUrl, buildItemImageUrl, buildBackgroundUrl, loadActivityConfig } from '../../services/cdnService'
import { loadGameState, saveGameState, getDefaultGameState, clearGameState, clearAllGameStates } from '../../utils/gameStateStorage'
import { HeaderSpacer } from '../Layout/HeaderSpacer'
import { GachaDisplay } from './GachaDisplay'
import { ResultModal } from '../ui/ResultModal'
import { InfoModal } from './InfoModal'
import { HistoryModal } from './HistoryModal'
import { ShopModal } from './ShopModal'
import { SponsorModal } from './SponsorModal'
import { ResetModal } from '../ui/ResetModal'
import { ConfirmModal } from '../ui/ConfirmModal'

/**
 * 筹码类抽卡主组件
 * 包含所有抽卡逻辑和UI展示
 */
export function ChipGacha({
  activityId,
  itemScale = 1,
  sponsorModal = false,
  onSetSponsorModal,
  onUpdateHeader
}) {
  const playSound = useSound()

  // 活动配置（包含 metadata 和可能的 image 字段）
  const [activityConfig, setActivityConfig] = useState({
    id: activityId,
    metadata: {
      name: '暗影交易',
      nameEn: 'Deal with the Shadow'
    }
  })

  // ========== 状态管理 ==========
  const [gameState, setGameState] = useState(getDefaultGameState())

  // 用于防止初始加载时触发保存
  const isInitialLoad = useRef(true)

  // 从 JSON 配置加载物品数据和活动配置
  useEffect(() => {
    const loadActivityData = async () => {
      try {
        console.log(`[ChipGacha] Loading activity: ${activityId}`)

        const config = await loadActivityConfig('chip', activityId)

        // 保存完整的活动配置（确保有 id 字段）
        const fullConfig = {
          ...config,
          id: activityId  // 确保 id 存在
        }
        setActivityConfig(fullConfig)

        // 为每个物品生成 icon URL 并添加 tier 字段
        const itemsWithIcons = config.items.map(item => ({
          ...item,
          icon: buildItemImageUrl(item, fullConfig),
          obtained: 0,
          tier: (item.rarity === 'epic' || item.rarity === 'legendary') ? true : undefined
        }))

        // 尝试从 localStorage 加载该活动的状态
        const savedState = loadGameState(activityId)

        if (savedState && savedState.items && savedState.items.length > 0) {
          console.log(`[ChipGacha] Loaded saved state for ${activityId}`)

          // 合并物品数据：保留 obtained 数据，更新 icon
          const mergedItems = itemsWithIcons.map(newItem => {
            const savedItem = savedState.items.find(item => item.id === newItem.id)
            return {
              ...newItem,
              obtained: savedItem ? savedItem.obtained : 0
            }
          })

          setGameState({
            ...savedState,
            items: mergedItems
          })
        } else {
          console.log(`[ChipGacha] No saved state for ${activityId}, using default`)

          // 没有保存的状态，使用默认状态
          setGameState({
            ...getDefaultGameState(),
            items: itemsWithIcons
          })
        }

        // 标记初始加载完成
        isInitialLoad.current = false
      } catch (error) {
        console.error('加载物品配置失败:', error)
        toast.error('加载物品配置失败')
      }
    }

    if (activityId) {
      // 切换活动时标记为初始加载
      isInitialLoad.current = true
      loadActivityData()
    }
  }, [activityId])

  // 自动保存 gameState 到 localStorage
  useEffect(() => {
    // 跳过初始加载时的保存
    if (isInitialLoad.current) {
      return
    }

    if (activityId && gameState.items.length > 0) {
      console.log(`[ChipGacha] Saving state for ${activityId}`)
      saveGameState(activityId, gameState)
    }
  }, [activityId, gameState])

  const [resultModal, setResultModal] = useState({
    show: false,
    items: [],
    displayedItems: [],
    isMulti: false,
    drawType: 'single',
    isGenerating: false,
    isPaused: false,
    isComplete: false,
    processedIndex: 0
  })

  const [infoModal, setInfoModal] = useState(false)
  const [historyModal, setHistoryModal] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [shopModal, setShopModal] = useState(false)
  const [resetModal, setResetModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState(false)
  const [highlightedItemName, setHighlightedItemName] = useState(null)

  // 商店套餐状态
  const [shopPackages, setShopPackages] = useState([
    { id: 1, coins: 22, price: 25, image: '', discount: '-10%' },
    { id: 2, coins: 60, price: 60, image: '', discount: '-15%' },
    { id: 3, coins: 135, baseCoins: 135, price: 120, basePrice: 120, image: '', discount: '-25%', quantity: 1 },
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

  // 更新 Header 数据
  useEffect(() => {
    onUpdateHeader({
      activityConfig,
      gameState,
      activityName: activityConfig.metadata?.name || '',
      activityNameEn: activityConfig.metadata?.nameEn || '',
      isModalOpen: resultModal.show || infoModal || historyModal || shopModal || sponsorModal,
      onOpenInfo: () => setInfoModal(true),
      onOpenShop: () => setShopModal(true),
      onResetData: handleResetData
    })
  }, [activityConfig, gameState, resultModal.show, infoModal, historyModal, shopModal, sponsorModal, onUpdateHeader])

  // ========== 重置相关函数 ==========
  // 打开重置弹窗
  const handleResetData = () => {
    setResetModal(true)
  }

  // 重置当前活动数据
  const handleResetCurrent = () => {
    console.log(`[ChipGacha] Resetting data for ${activityId}`)

    // 清除 localStorage
    clearGameState(activityId)

    // 重置状态为默认值（保留items配置）
    setGameState(prev => ({
      ...getDefaultGameState(),
      items: prev.items.map(item => ({
        ...item,
        obtained: 0
      }))
    }))

    // 清空历史记录和结果弹窗
    setResultModal({
      show: false,
      items: [],
      displayedItems: [],
      isMulti: false,
      drawType: 'single',
      isGenerating: false,
      isPaused: false,
      isComplete: false,
      processedIndex: 0
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

  // 重置全部活动数据（打开确认弹窗）
  const handleResetAll = () => {
    setConfirmModal(true)
  }

  // 确认重置全部活动
  const handleConfirmResetAll = () => {
    console.log('[ChipGacha] Resetting all activities')

    // 清除所有 localStorage 数据
    clearAllGameStates()

    // 重置当前活动状态
    setGameState(prev => ({
      ...getDefaultGameState(),
      items: prev.items.map(item => ({
        ...item,
        obtained: 0
      }))
    }))

    // 清空历史记录和结果弹窗
    setResultModal({
      show: false,
      items: [],
      displayedItems: [],
      isMulti: false,
      drawType: 'single',
      isGenerating: false,
      isPaused: false,
      isComplete: false,
      processedIndex: 0
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

  // ========== 逐个显示物品的函数 ==========
  const progressivelyShowItems = (allItems, drawType) => {
    let currentIndex = 0

    const showNextItem = () => {
      if (currentIndex >= allItems.length) {
        // 所有物品显示完毕
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

  // ========== 继续生成（从暂停中恢复）==========
  const continueGeneration = () => {
    if (!resultModal.isPaused) return

    setResultModal(prev => ({
      ...prev,
      isPaused: false,
      isGenerating: true
    }))

    const allItems = resultModal.items
    const drawType = resultModal.drawType
    let index = resultModal.processedIndex

    const showNextItem = () => {
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

  // ========== 抽奖函数 ==========
  // ========== 抽奖核心逻辑（支持传入自定义状态） ==========
  const drawLottery = (customItems = null) => {
    // 使用传入的items或默认使用gameState.items
    const items = customItems || gameState.items

    const availableItems = items.filter(item =>
      item.limit === 0 || item.obtained < item.limit
    )
    const unavailableItems = items.filter(item =>
      item.limit > 0 && item.obtained >= item.limit
    )

    const unavailableProbability = unavailableItems.reduce((sum, item) => sum + item.probability, 0)

    const itemsWithAdjustedProb = availableItems.map(item => {
      if (item.name === '15 黄金') {
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

  // ========== 辅助函数：提取筹码数量 ==========
  const extractCurrencyAmount = (item) => {
    // 通过 id 判断是否为货币类物品（以 currency_ 开头）
    if (item.id.startsWith('currency_')) {
      // 从名称中提取数量，如 "1 筹码" → 1, "3 筹码" → 3, "筹码" → 1
      const match = item.name.match(/^(\d+)\s*筹码/)
      return match ? parseInt(match[1]) : 1 // 默认为 1
    }
    return 0
  }

  // ========== 单抽 ==========
  const singleDraw = () => {
    if (gameState.currency < gameState.singleCost) {
      toast.error('筹码不够，请充值', {
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
    setGameState(prev => ({ ...prev, currency: prev.currency - prev.singleCost, totalDraws: prev.totalDraws + 1 }))

    // 先抽出结果
    const result = drawLottery()

    // 获取可抽取物品列表
    const availableItems = gameState.items.filter(item =>
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

    // 高亮动画 - 伪随机洗牌（初始就洗牌）
    let shuffledItems = shuffle(availableItems)
    let shuffleIndex = 0
    let currentCount = 0
    let delay = 50 // 初始延迟50ms
    const maxDelay = 300 // 最大延迟300ms
    const delayIncrement = 15 // 每次延迟增加15ms

    const highlightNext = () => {
      if (currentCount < 20) {
        // 如果当前洗牌用完了，重新洗牌
        if (shuffleIndex >= shuffledItems.length) {
          shuffledItems = shuffle(availableItems)
          shuffleIndex = 0
        }

        setHighlightedItemName(shuffledItems[shuffleIndex].name)
        shuffleIndex++
        currentCount++
        delay += delayIncrement
        setTimeout(highlightNext, Math.min(delay, maxDelay))
      } else {
        // 最后定格在抽中的物品上
        setHighlightedItemName(result.name)
        setTimeout(() => {
          setGameState(prev => {
            const updatedItems = prev.items.map(item => {
              if (item.name === result.name && item.rarity === result.rarity) {
                return { ...item, obtained: item.obtained + 1 }
              }
              return item
            })

            // 检查是否抽到筹码，如果是则增加筹码数量
            const currencyBonus = extractCurrencyAmount(result)

            let updatedEpicCount = prev.epicCount
            let updatedLegendaryCount = prev.legendaryCount
            let updatedRareCount = prev.rareCount
            let updatedEpicLegendaryHistory = [...prev.epicLegendaryHistory]

            if (result.rarity === 'legendary') {
              updatedLegendaryCount++
              updatedEpicCount = 0
              updatedRareCount = 0
              updatedEpicLegendaryHistory = [...updatedEpicLegendaryHistory, { item: result, drawNumber: prev.totalDraws }]
            } else if (result.rarity === 'epic') {
              updatedEpicCount++
              updatedRareCount = 0
              updatedEpicLegendaryHistory = [...updatedEpicLegendaryHistory, { item: result, drawNumber: prev.totalDraws }]
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
              items: updatedItems,
              currency: prev.currency + currencyBonus,
              epicCount: updatedEpicCount,
              legendaryCount: updatedLegendaryCount,
              rareCount: updatedRareCount,
              history: [...prev.history, result],
              epicLegendaryHistory: updatedEpicLegendaryHistory
            }
          })

          const resultWithDrawNum = (result.rarity === 'epic' || result.rarity === 'legendary')
            ? { ...result, drawNumber: gameState.totalDraws + 1 }
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
            processedIndex: 1
          })
          setIsDrawing(false)
          setHighlightedItemName(null)
        }, 500)
      }
    }

    highlightNext()
  }

  // ========== 十连抽 ==========
  const multiDraw = () => {
    if (gameState.currency < 10) {
      toast.error('筹码不够，请充值', {
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
    setGameState(prev => ({ ...prev, currency: prev.currency - 10, totalDraws: prev.totalDraws + 10 }))

    setTimeout(() => {
      const results = []
      let tempGameState = { ...gameState }
      tempGameState.currency = gameState.currency - 10
      tempGameState.totalDraws = gameState.totalDraws + 10

      for (let i = 0; i < 10; i++) {
        // 传入当前临时状态的items，确保正确跟踪已获得数量
        const result = drawLottery(tempGameState.items)
        results.push(result)

        // 检查是否抽到筹码
        const currencyBonus = extractCurrencyAmount(result)

        tempGameState = {
          ...tempGameState,
          currency: tempGameState.currency + currencyBonus,
          items: tempGameState.items.map(item => {
            if (item.name === result.name && item.rarity === result.rarity) {
              return { ...item, obtained: item.obtained + 1 }
            }
            return item
          })
        }

        if (result.rarity === 'legendary') {
          tempGameState.legendaryCount = 0
          tempGameState.epicCount = 0
          tempGameState.rareCount = 0
        } else if (result.rarity === 'epic') {
          tempGameState.epicCount = 0
          tempGameState.rareCount = 0
          tempGameState.legendaryCount++
        } else if (result.rarity === 'rare') {
          tempGameState.rareCount = 0
          tempGameState.epicCount++
          tempGameState.legendaryCount++
        } else {
          tempGameState.rareCount++
          tempGameState.epicCount++
          tempGameState.legendaryCount++
        }
      }

      const resultsWithDrawNum = results.map((result, index) => {
        if (result.rarity === 'epic' || result.rarity === 'legendary') {
          return { ...result, drawNumber: gameState.totalDraws + index + 1 }
        }
        return result
      })

      let updatedEpicLegendaryHistory = [...gameState.epicLegendaryHistory]
      resultsWithDrawNum.forEach((result, index) => {
        if (result.rarity === 'epic' || result.rarity === 'legendary') {
          updatedEpicLegendaryHistory.push({
            item: result,
            drawNumber: gameState.totalDraws + index + 1
          })
        }
      })

      setGameState(prev => ({
        ...tempGameState,
        history: [...prev.history, ...results],
        epicLegendaryHistory: updatedEpicLegendaryHistory
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
        processedIndex: 0
      })
      setIsDrawing(false)

      setTimeout(() => {
        progressivelyShowItems(resultsWithDrawNum, 'multi10')
      }, 100)
    }, 300)
  }

  // ========== 百连抽 ==========
  const draw100 = () => {
    if (gameState.currency < 100) {
      toast.error('筹码不够，请充值', {
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
    setGameState(prev => ({ ...prev, currency: prev.currency - 100, totalDraws: prev.totalDraws + 100 }))

    setTimeout(() => {
      const results = []
      let tempGameState = { ...gameState }
      tempGameState.currency = gameState.currency - 100
      tempGameState.totalDraws = gameState.totalDraws + 100

      for (let i = 0; i < 100; i++) {
        // 传入当前临时状态的items，确保正确跟踪已获得数量
        const result = drawLottery(tempGameState.items)
        results.push(result)

        // 检查是否抽到筹码
        const currencyBonus = extractCurrencyAmount(result)

        tempGameState = {
          ...tempGameState,
          currency: tempGameState.currency + currencyBonus,
          items: tempGameState.items.map(item => {
            if (item.name === result.name && item.rarity === result.rarity) {
              return { ...item, obtained: item.obtained + 1 }
            }
            return item
          })
        }

        if (result.rarity === 'legendary') {
          tempGameState.legendaryCount = 0
          tempGameState.epicCount = 0
          tempGameState.rareCount = 0
        } else if (result.rarity === 'epic') {
          tempGameState.epicCount = 0
          tempGameState.rareCount = 0
          tempGameState.legendaryCount++
        } else if (result.rarity === 'rare') {
          tempGameState.rareCount = 0
          tempGameState.epicCount++
          tempGameState.legendaryCount++
        } else {
          tempGameState.rareCount++
          tempGameState.epicCount++
          tempGameState.legendaryCount++
        }
      }

      const resultsWithDrawNum = results.map((result, index) => {
        if (result.rarity === 'epic' || result.rarity === 'legendary') {
          return { ...result, drawNumber: gameState.totalDraws + index + 1 }
        }
        return result
      })

      let updatedEpicLegendaryHistory = [...gameState.epicLegendaryHistory]
      resultsWithDrawNum.forEach((result, index) => {
        if (result.rarity === 'epic' || result.rarity === 'legendary') {
          updatedEpicLegendaryHistory.push({
            item: result,
            drawNumber: gameState.totalDraws + index + 1
          })
        }
      })

      setGameState(prev => ({
        ...tempGameState,
        history: [...prev.history, ...results],
        epicLegendaryHistory: updatedEpicLegendaryHistory
      }))

      setResultModal({
        show: true,
        items: resultsWithDrawNum,
        displayedItems: [],
        isMulti: true,
        drawType: 'multi100',
        isGenerating: true,
        isPaused: false,
        isComplete: false,
        processedIndex: 0
      })
      setIsDrawing(false)

      setTimeout(() => {
        progressivelyShowItems(resultsWithDrawNum, 'multi100')
      }, 100)
    }, 300)
  }

  // ========== 五百连抽 ==========
  const draw500 = () => {
    if (gameState.currency < 500) {
      toast.error('筹码不够，请充值', {
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
    setGameState(prev => ({ ...prev, currency: prev.currency - 500, totalDraws: prev.totalDraws + 500 }))

    setTimeout(() => {
      const results = []
      let tempGameState = { ...gameState }
      tempGameState.currency = gameState.currency - 500
      tempGameState.totalDraws = gameState.totalDraws + 500

      for (let i = 0; i < 500; i++) {
        // 传入当前临时状态的items，确保正确跟踪已获得数量
        const result = drawLottery(tempGameState.items)
        results.push(result)

        // 检查是否抽到筹码
        const currencyBonus = extractCurrencyAmount(result)

        tempGameState = {
          ...tempGameState,
          currency: tempGameState.currency + currencyBonus,
          items: tempGameState.items.map(item => {
            if (item.name === result.name && item.rarity === result.rarity) {
              return { ...item, obtained: item.obtained + 1 }
            }
            return item
          })
        }

        if (result.rarity === 'legendary') {
          tempGameState.legendaryCount = 0
          tempGameState.epicCount = 0
          tempGameState.rareCount = 0
        } else if (result.rarity === 'epic') {
          tempGameState.epicCount = 0
          tempGameState.rareCount = 0
          tempGameState.legendaryCount++
        } else if (result.rarity === 'rare') {
          tempGameState.rareCount = 0
          tempGameState.epicCount++
          tempGameState.legendaryCount++
        } else {
          tempGameState.rareCount++
          tempGameState.epicCount++
          tempGameState.legendaryCount++
        }
      }

      const resultsWithDrawNum = results.map((result, index) => {
        if (result.rarity === 'epic' || result.rarity === 'legendary') {
          return { ...result, drawNumber: gameState.totalDraws + index + 1 }
        }
        return result
      })

      let updatedEpicLegendaryHistory = [...gameState.epicLegendaryHistory]
      resultsWithDrawNum.forEach((result, index) => {
        if (result.rarity === 'epic' || result.rarity === 'legendary') {
          updatedEpicLegendaryHistory.push({
            item: result,
            drawNumber: gameState.totalDraws + index + 1
          })
        }
      })

      setGameState(prev => ({
        ...tempGameState,
        history: [...prev.history, ...results],
        epicLegendaryHistory: updatedEpicLegendaryHistory
      }))

      setResultModal({
        show: true,
        items: resultsWithDrawNum,
        displayedItems: [],
        isMulti: true,
        drawType: 'multi500',
        isGenerating: true,
        isPaused: false,
        isComplete: false,
        processedIndex: 0
      })
      setIsDrawing(false)

      setTimeout(() => {
        progressivelyShowItems(resultsWithDrawNum, 'multi500')
      }, 100)
    }, 300)
  }

  // ========== 购买充值包 ==========
  const buyPackage = (pkg) => {
    playSound('Buy_01_UI.Buy_01_UI.wav')
    setGameState(prev => ({
      ...prev,
      currency: prev.currency + pkg.coins,
      rmb: prev.rmb - pkg.price
    }))
    setShopModal(false)
  }

  // ========== 更新135筹码档位的数量 ==========
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

  // ========== 获取所有物品（纯粹按概率从小到大排序）==========
  const getPremiumItems = () => {
    return gameState.items.sort((a, b) => a.probability - b.probability)
  }

  return (
    <>
      {/* Header 占位容器 */}
      <HeaderSpacer />

      {/* 背景图 - 横向铺满 */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: activityConfig.id ? `url(${buildBackgroundUrl(activityConfig)})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#000'
        }}
      >
        {/* 黑色透明蒙版，让背景变暗 */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* 主内容区域 */}
      <GachaDisplay
        premiumItems={getPremiumItems()}
        highlightedItemName={highlightedItemName}
        onSingleDraw={singleDraw}
        onMultiDraw={multiDraw}
        onDraw100={draw100}
        onDraw500={draw500}
        onPlaySound={playSound}
        isDrawing={isDrawing}
      />

      {/* 结果弹窗 */}
      <ResultModal
        resultModal={resultModal}
        itemScale={itemScale}
        onContinueGeneration={continueGeneration}
        onClose={() => setResultModal({ ...resultModal, show: false })}
      />

      {/* 史诗/传说历史记录弹窗 */}
      <InfoModal
        isOpen={infoModal}
        onClose={() => setInfoModal(false)}
        epicLegendaryHistory={gameState.epicLegendaryHistory}
        itemScale={itemScale}
        activityId={activityId}
        totalDraws={gameState.totalDraws}
      />

      {/* 所有抽奖记录弹窗 */}
      <HistoryModal
        isOpen={historyModal}
        onClose={() => setHistoryModal(false)}
        history={gameState.history}
      />

      {/* 充值商店弹窗 */}
      <ShopModal
        isOpen={shopModal}
        onClose={() => setShopModal(false)}
        shopPackages={shopPackages}
        onBuyPackage={buyPackage}
        onUpdateQuantity={updateQuantity}
        activityConfig={activityConfig}
      />

      {/* 赞助作者弹窗 */}
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
        title="危险操作"
        message="确定要重置所有活动的数据吗？将清除所有活动的筹码、人民币余额、抽奖记录和已获得物品。此操作不可撤销！"
        confirmText="确认重置"
        cancelText="取消"
      />
    </>
  )
}
