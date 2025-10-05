import { useState, useEffect } from 'react'
import './App.css'
import { defaultItems } from './data/defaultItems'
import { HexGrid } from './components/HexGrid'
import { SquareItem } from './components/SquareItem'
import { motion } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'
import { Analytics } from '@vercel/analytics/react'

// CDN 基础 URL
const CDN_BASE_URL = 'https://assets.lingflow.cn/mw-gacha-simulation'

// 音效播放函数
const playSound = (soundName) => {
  const audio = new Audio(`${CDN_BASE_URL}/audio/${soundName}`)
  audio.volume = 0.5 // 设置音量为50%
  audio.play().catch(err => {
    console.log('音效播放失败:', err)
  })
}

function App() {
  const [shouldRotate, setShouldRotate] = useState(false)
  const [itemScale, setItemScale] = useState(1)

  useEffect(() => {
    const checkOrientation = () => {
      // 当宽度小于高度时（接近1:1或更窄），触发横屏旋转
      const shouldRotateNow = window.innerWidth < window.innerHeight && window.innerWidth < 900
      setShouldRotate(shouldRotateNow)

      // 计算物品缩放比例：基于标准桌面宽度按比例缩放，但设置最小值
      const width = window.innerWidth
      const baseWidth = 1920 // 标准桌面宽度
      const minScale = 0.5 // 最小缩放比例
      const scale = Math.max(width / baseWidth, minScale)
      setItemScale(scale)

      // 检查是否为移动端
      setIsMobile(width < 768)
    }

    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    return () => window.removeEventListener('resize', checkOrientation)
  }, [])
  const [gameState, setGameState] = useState({
    currency: 40,
    currencyName: "筹码",
    rmb: -25, // 人民币余额（可以为负）
    singleCost: 1,
    totalDraws: 0,
    legendaryCount: 0,
    epicCount: 0,
    rareCount: 0,
    history: [],
    epicLegendaryHistory: [], // 史诗/传奇抽取记录 [{item, drawNumber}]
    items: [...defaultItems]
  })

  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const [resultModal, setResultModal] = useState({
    show: false,
    items: [],           // 所有要显示的物品
    displayedItems: [],  // 当前已显示的物品
    isMulti: false,
    drawType: 'single',  // 'single', 'multi10', 'multi100', 'multi500'
    isGenerating: false, // 是否正在生成中
    isPaused: false,     // 是否暂停（遇到史诗/传奇）
    isComplete: false,   // 是否完成生成
    processedIndex: 0    // 已处理到的物品索引
  })
  const [infoModal, setInfoModal] = useState(false)
  const [historyModal, setHistoryModal] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [shopModal, setShopModal] = useState(false) // 充值商店弹窗
  const [sponsorModal, setSponsorModal] = useState(false) // 赞助作者弹窗
  const [sidebarOpen, setSidebarOpen] = useState(false) // 侧边栏状态
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768) // 是否为移动端
  const [highlightedItemName, setHighlightedItemName] = useState(null) // 当前高亮的物品名称
  const [shopPackages, setShopPackages] = useState([
    { id: 1, coins: 22, price: 25, image: '/10月月头筹码抽奖暗影交易/购买/eventgachaoffer_ag97_2_thumbnail.png', discount: '-10%' },
    { id: 2, coins: 60, price: 60, image: '/10月月头筹码抽奖暗影交易/购买/eventgachaoffer_ag97_3_thumbnail.png', discount: '-15%' },
    { id: 3, coins: 135, baseCoins: 135, price: 120, basePrice: 120, image: '/10月月头筹码抽奖暗影交易/购买/eventgachaoffer_ag97_4_thumbnail.png', discount: '-25%', quantity: 1 },
  ])

  // 逐个显示物品的函数
  const progressivelyShowItems = (allItems, drawType) => {
    let currentIndex = 0;

    const showNextItem = () => {
      if (currentIndex >= allItems.length) {
        // 所有物品显示完毕
        // 检查是否有史诗或传奇物品
        const hasEpicOrLegendary = allItems.some(item =>
          item.rarity === 'epic' || item.rarity === 'legendary'
        );

        // 如果没有史诗或传奇物品，播放失败音效
        if (!hasEpicOrLegendary) {
          playSound('UpgradeFailed_01_UI.UpgradeFailed_01_UI.wav');
        }

        setResultModal(prev => ({
          ...prev,
          isGenerating: false,
          isComplete: true
        }));
        return;
      }

      const nextItem = allItems[currentIndex];

      // 如果是史诗或传奇物品，播放奖励音效
      if (nextItem.rarity === 'epic' || nextItem.rarity === 'legendary') {
        playSound('Reward_Daily_02_UI.Reward_Daily_02_UI.wav')
      }

      // 添加当前物品到显示列表
      setResultModal(prev => {
        let newDisplayedItems = [...prev.displayedItems, nextItem];

        // 对于100连和500连，限制最多显示20个物品
        if ((drawType === 'multi100' || drawType === 'multi500') && newDisplayedItems.length > 20) {
          // 分离史诗/传奇物品和普通/稀有物品
          const epicLegendary = newDisplayedItems.filter(item =>
            item.rarity === 'epic' || item.rarity === 'legendary'
          );
          const others = newDisplayedItems.filter(item =>
            item.rarity !== 'epic' && item.rarity !== 'legendary'
          );

          // 保留最新的 (20 - 史诗/传奇数量) 个普通/稀有物品
          const remainingOthers = others.slice(Math.max(0, others.length - (20 - epicLegendary.length)));

          // 史诗/传奇在前，其他在后
          newDisplayedItems = [...epicLegendary, ...remainingOthers];
        }

        return {
          ...prev,
          displayedItems: newDisplayedItems,
          processedIndex: currentIndex + 1
        };
      });

      currentIndex++;

      // 检查是否是史诗或传奇（仅100连和500连）
      if ((drawType === 'multi100' || drawType === 'multi500') &&
          (nextItem.rarity === 'epic' || nextItem.rarity === 'legendary')) {
        // 暂停
        setResultModal(prev => ({
          ...prev,
          isPaused: true,
          isGenerating: false
        }));
      } else {
        // 继续显示下一个
        setTimeout(showNextItem, 50); // 50ms间隔
      }
    };

    showNextItem();
  };

  // 继续生成（从暂停中恢复）
  const continueGeneration = () => {
    if (!resultModal.isPaused) return;

    setResultModal(prev => ({
      ...prev,
      isPaused: false,
      isGenerating: true
    }));

    const allItems = resultModal.items;
    const drawType = resultModal.drawType;
    let index = resultModal.processedIndex;

    const showNextItem = () => {
      if (index >= allItems.length) {
        // 所有物品显示完毕
        // 检查是否有史诗或传奇物品
        const hasEpicOrLegendary = allItems.some(item =>
          item.rarity === 'epic' || item.rarity === 'legendary'
        );

        // 如果没有史诗或传奇物品，播放失败音效
        if (!hasEpicOrLegendary) {
          playSound('UpgradeFailed_01_UI.UpgradeFailed_01_UI.wav');
        }

        setResultModal(prev => ({
          ...prev,
          isGenerating: false,
          isComplete: true
        }));
        return;
      }

      const nextItem = allItems[index];

      // 如果是史诗或传奇物品，播放奖励音效
      if (nextItem.rarity === 'epic' || nextItem.rarity === 'legendary') {
        playSound('Reward_Daily_02_UI.Reward_Daily_02_UI.wav')
      }

      setResultModal(prev => {
        let newDisplayedItems = [...prev.displayedItems, nextItem];

        // 对于100连和500连，限制最多显示20个物品
        if ((drawType === 'multi100' || drawType === 'multi500') && newDisplayedItems.length > 20) {
          // 分离史诗/传奇物品和普通/稀有物品
          const epicLegendary = newDisplayedItems.filter(item =>
            item.rarity === 'epic' || item.rarity === 'legendary'
          );
          const others = newDisplayedItems.filter(item =>
            item.rarity !== 'epic' && item.rarity !== 'legendary'
          );

          // 保留最新的 (20 - 史诗/传奇数量) 个普通/稀有物品
          const remainingOthers = others.slice(Math.max(0, others.length - (20 - epicLegendary.length)));

          // 史诗/传奇在前，其他在后
          newDisplayedItems = [...epicLegendary, ...remainingOthers];
        }

        return {
          ...prev,
          displayedItems: newDisplayedItems,
          processedIndex: index + 1
        };
      });

      index++;

      if ((drawType === 'multi100' || drawType === 'multi500') &&
          (nextItem.rarity === 'epic' || nextItem.rarity === 'legendary')) {
        setResultModal(prev => ({
          ...prev,
          isPaused: true,
          isGenerating: false
        }));
      } else {
        setTimeout(showNextItem, 50);
      }
    };

    showNextItem();
  };

  // 稀有度文本映射
  const getRarityText = (rarity) => {
    const map = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传奇' }
    return map[rarity] || '普通'
  }

  // 稀有度颜色类
  const getRarityClass = (rarity) => {
    const map = {
      common: 'bg-slate-500/30 text-slate-400',
      rare: 'bg-blue-500/30 text-blue-400',
      epic: 'bg-amber-500/30 text-amber-400',
      legendary: 'bg-purple-500/30 text-purple-400'
    }
    return map[rarity] || map.common
  }

  // 稀有度背景色类
  const getRarityBgClass = (rarity) => {
    const map = {
      common: 'bg-slate-500',
      rare: 'bg-blue-500',
      epic: 'bg-amber-500',
      legendary: 'bg-purple-500'
    }
    return map[rarity] || map.common
  }

  // 抽奖函数
  const drawLottery = () => {
    const availableItems = gameState.items.filter(item =>
      item.limit === 0 || item.obtained < item.limit
    )
    const unavailableItems = gameState.items.filter(item =>
      item.limit > 0 && item.obtained >= item.limit
    )

    // 计算不可抽取物品的概率总和
    const unavailableProbability = unavailableItems.reduce((sum, item) => sum + item.probability, 0)

    // 将不可抽取物品的概率补给黄金
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
        // 返回原始物品数据，不带调整后的概率
        return gameState.items.find(i => i.name === item.name && i.rarity === item.rarity)
      }
    }
    return { ...availableItems[availableItems.length - 1] }
  }

  // 单抽
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
            // 深拷贝items数组和对象，避免StrictMode导致的重复修改
            const newItems = prev.items.map(item => {
              if (item.name === result.name && item.rarity === result.rarity) {
                return { ...item, obtained: item.obtained + 1 }
              }
              return item
            })

            // 检查是否抽到筹码，如果是则增加筹码数量
            let currencyBonus = 0
            const match = result.name.match(/^(\d+)\s*筹码/)
            if (match) {
              currencyBonus = parseInt(match[1])
            }

            // 记录史诗/传奇抽取
            const newEpicLegendaryHistory = [...prev.epicLegendaryHistory]
            if (result.rarity === 'epic' || result.rarity === 'legendary') {
              newEpicLegendaryHistory.push({
                item: result,
                drawNumber: prev.totalDraws
              })
            }

            return {
              ...prev,
              currency: prev.currency + currencyBonus,
              items: newItems,
              history: [result, ...prev.history],
              epicLegendaryHistory: newEpicLegendaryHistory,
              legendaryCount: prev.legendaryCount + (result.rarity === 'legendary' ? 1 : 0),
              epicCount: prev.epicCount + (result.rarity === 'epic' ? 1 : 0),
              rareCount: prev.rareCount + (result.rarity === 'rare' ? 1 : 0)
            }
          })

          // 为史诗/传奇物品添加抽数
          const resultWithDrawNum = (result.rarity === 'epic' || result.rarity === 'legendary')
            ? { ...result, drawNumber: prev.totalDraws }
            : result;

          // 如果是史诗或传奇物品，播放奖励音效，否则播放失败音效
          if (result.rarity === 'epic' || result.rarity === 'legendary') {
            playSound('Reward_Daily_02_UI.Reward_Daily_02_UI.wav');
          } else {
            playSound('UpgradeFailed_01_UI.UpgradeFailed_01_UI.wav');
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

  // 十连抽
  const multiDraw = () => {
    const cost = gameState.singleCost * 10
    if (gameState.currency < cost) {
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
    setGameState(prev => ({ ...prev, currency: prev.currency - cost, totalDraws: prev.totalDraws + 10 }))

    setTimeout(() => {
      const results = []
      const tempObtained = {} // 临时记录本次十连中已抽取的物品

      for (let i = 0; i < 10; i++) {
        // 可抽取物品
        const availableItems = gameState.items.filter(item => {
          if (item.limit === 0) return true
          const currentObtained = item.obtained + (tempObtained[item.name] || 0)
          return currentObtained < item.limit
        })

        // 不可抽取物品
        const unavailableItems = gameState.items.filter(item => {
          if (item.limit === 0) return false
          const currentObtained = item.obtained + (tempObtained[item.name] || 0)
          return currentObtained >= item.limit
        })

        // 计算不可抽取物品的概率总和
        const unavailableProbability = unavailableItems.reduce((sum, item) => sum + item.probability, 0)

        // 将不可抽取物品的概率补给黄金
        const itemsWithAdjustedProb = availableItems.map(item => {
          if (item.name === '15 黄金') {
            return { ...item, probability: item.probability + unavailableProbability }
          }
          return { ...item }
        })

        const totalProbability = itemsWithAdjustedProb.reduce((sum, item) => sum + item.probability, 0)
        const rand = Math.random() * totalProbability
        let cumulativeProbability = 0

        let selectedItem = null
        for (const item of itemsWithAdjustedProb) {
          cumulativeProbability += item.probability
          if (rand < cumulativeProbability) {
            // 返回原始物品数据，不带调整后的概率
            selectedItem = { ...gameState.items.find(i => i.name === item.name && i.rarity === item.rarity) }
            break
          }
        }

        if (!selectedItem) {
          selectedItem = { ...availableItems[availableItems.length - 1] }
        }

        results.push(selectedItem)
        tempObtained[selectedItem.name] = (tempObtained[selectedItem.name] || 0) + 1
      }

      // 为史诗/传奇物品添加抽数（在更新状态前计算）
      const resultsWithDrawNum = results.map((result, index) => {
        if (result.rarity === 'epic' || result.rarity === 'legendary') {
          return { ...result, drawNumber: gameState.totalDraws + index + 1 };
        }
        return result;
      });

      setGameState(prev => {
        // 统计每个物品被抽到的次数
        const obtainedCount = {}
        let newLegendary = 0, newEpic = 0, newRare = 0
        let currencyBonus = 0

        results.forEach(result => {
          obtainedCount[result.name] = (obtainedCount[result.name] || 0) + 1
          if (result.rarity === 'legendary') newLegendary++
          if (result.rarity === 'epic') newEpic++
          if (result.rarity === 'rare') newRare++

          // 检查是否抽到筹码
          const match = result.name.match(/^(\d+)\s*筹码/)
          if (match) {
            currencyBonus += parseInt(match[1])
          }
        })

        // 深拷贝items并更新obtained
        const newItems = prev.items.map(item => {
          if (obtainedCount[item.name]) {
            return { ...item, obtained: item.obtained + obtainedCount[item.name] }
          }
          return item
        })

        // 记录史诗/传奇抽取（按抽取顺序）
        const newEpicLegendaryHistory = [...prev.epicLegendaryHistory]
        results.forEach((result, index) => {
          if (result.rarity === 'epic' || result.rarity === 'legendary') {
            newEpicLegendaryHistory.push({
              item: result,
              drawNumber: prev.totalDraws - 10 + index + 1
            })
          }
        })

        return {
          ...prev,
          currency: prev.currency + currencyBonus,
          items: newItems,
          history: [...results.reverse(), ...prev.history],
          epicLegendaryHistory: newEpicLegendaryHistory,
          legendaryCount: prev.legendaryCount + newLegendary,
          epicCount: prev.epicCount + newEpic,
          rareCount: prev.rareCount + newRare
        }
      })

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

      // 开始逐个显示
      setTimeout(() => {
        progressivelyShowItems(resultsWithDrawNum, 'multi10')
      }, 100)
    }, 300)
  }

  // 百连抽
  const draw100 = () => {
    const cost = gameState.singleCost * 100
    if (gameState.currency < cost) {
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
    setGameState(prev => ({ ...prev, currency: prev.currency - cost, totalDraws: prev.totalDraws + 100 }))

    setTimeout(() => {
      const results = []
      const tempObtained = {}

      for (let i = 0; i < 100; i++) {
        // 可抽取物品
        const availableItems = gameState.items.filter(item => {
          if (item.limit === 0) return true
          const currentObtained = item.obtained + (tempObtained[item.name] || 0)
          return currentObtained < item.limit
        })

        // 不可抽取物品
        const unavailableItems = gameState.items.filter(item => {
          if (item.limit === 0) return false
          const currentObtained = item.obtained + (tempObtained[item.name] || 0)
          return currentObtained >= item.limit
        })

        // 计算不可抽取物品的概率总和
        const unavailableProbability = unavailableItems.reduce((sum, item) => sum + item.probability, 0)

        // 将不可抽取物品的概率补给黄金
        const itemsWithAdjustedProb = availableItems.map(item => {
          if (item.name === '15 黄金') {
            return { ...item, probability: item.probability + unavailableProbability }
          }
          return { ...item }
        })

        const totalProbability = itemsWithAdjustedProb.reduce((sum, item) => sum + item.probability, 0)
        const rand = Math.random() * totalProbability
        let cumulativeProbability = 0

        let selectedItem = null
        for (const item of itemsWithAdjustedProb) {
          cumulativeProbability += item.probability
          if (rand < cumulativeProbability) {
            // 返回原始物品数据，不带调整后的概率
            selectedItem = { ...gameState.items.find(i => i.name === item.name && i.rarity === item.rarity) }
            break
          }
        }

        if (!selectedItem) {
          selectedItem = { ...availableItems[availableItems.length - 1] }
        }

        results.push(selectedItem)
        tempObtained[selectedItem.name] = (tempObtained[selectedItem.name] || 0) + 1
      }

      // 为史诗/传奇物品添加抽数（在更新状态前计算）
      const resultsWithDrawNum = results.map((result, index) => {
        if (result.rarity === 'epic' || result.rarity === 'legendary') {
          return { ...result, drawNumber: gameState.totalDraws + index + 1 };
        }
        return result;
      });

      setGameState(prev => {
        const obtainedCount = {}
        let newLegendary = 0, newEpic = 0, newRare = 0
        let currencyBonus = 0

        results.forEach(result => {
          obtainedCount[result.name] = (obtainedCount[result.name] || 0) + 1
          if (result.rarity === 'legendary') newLegendary++
          if (result.rarity === 'epic') newEpic++
          if (result.rarity === 'rare') newRare++

          const match = result.name.match(/^(\d+)\s*筹码/)
          if (match) {
            currencyBonus += parseInt(match[1])
          }
        })

        const newItems = prev.items.map(item => {
          if (obtainedCount[item.name]) {
            return { ...item, obtained: item.obtained + obtainedCount[item.name] }
          }
          return item
        })

        // 记录史诗/传奇抽取（按抽取顺序）
        const newEpicLegendaryHistory = [...prev.epicLegendaryHistory]
        results.forEach((result, index) => {
          if (result.rarity === 'epic' || result.rarity === 'legendary') {
            newEpicLegendaryHistory.push({
              item: result,
              drawNumber: prev.totalDraws - 100 + index + 1
            })
          }
        })

        return {
          ...prev,
          currency: prev.currency + currencyBonus,
          items: newItems,
          history: [...results.reverse(), ...prev.history],
          epicLegendaryHistory: newEpicLegendaryHistory,
          legendaryCount: prev.legendaryCount + newLegendary,
          epicCount: prev.epicCount + newEpic,
          rareCount: prev.rareCount + newRare
        }
      })

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

      // 开始逐个显示
      setTimeout(() => {
        progressivelyShowItems(resultsWithDrawNum, 'multi100')
      }, 100)
    }, 300)
  }

  // 五百连抽
  const draw500 = () => {
    const cost = gameState.singleCost * 500
    if (gameState.currency < cost) {
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
    setGameState(prev => ({ ...prev, currency: prev.currency - cost, totalDraws: prev.totalDraws + 500 }))

    setTimeout(() => {
      const results = []
      const tempObtained = {}

      for (let i = 0; i < 500; i++) {
        // 可抽取物品
        const availableItems = gameState.items.filter(item => {
          if (item.limit === 0) return true
          const currentObtained = item.obtained + (tempObtained[item.name] || 0)
          return currentObtained < item.limit
        })

        // 不可抽取物品
        const unavailableItems = gameState.items.filter(item => {
          if (item.limit === 0) return false
          const currentObtained = item.obtained + (tempObtained[item.name] || 0)
          return currentObtained >= item.limit
        })

        // 计算不可抽取物品的概率总和
        const unavailableProbability = unavailableItems.reduce((sum, item) => sum + item.probability, 0)

        // 将不可抽取物品的概率补给黄金
        const itemsWithAdjustedProb = availableItems.map(item => {
          if (item.name === '15 黄金') {
            return { ...item, probability: item.probability + unavailableProbability }
          }
          return { ...item }
        })

        const totalProbability = itemsWithAdjustedProb.reduce((sum, item) => sum + item.probability, 0)
        const rand = Math.random() * totalProbability
        let cumulativeProbability = 0

        let selectedItem = null
        for (const item of itemsWithAdjustedProb) {
          cumulativeProbability += item.probability
          if (rand < cumulativeProbability) {
            // 返回原始物品数据，不带调整后的概率
            selectedItem = { ...gameState.items.find(i => i.name === item.name && i.rarity === item.rarity) }
            break
          }
        }

        if (!selectedItem) {
          selectedItem = { ...availableItems[availableItems.length - 1] }
        }

        results.push(selectedItem)
        tempObtained[selectedItem.name] = (tempObtained[selectedItem.name] || 0) + 1
      }

      // 为史诗/传奇物品添加抽数（在更新状态前计算）
      const resultsWithDrawNum = results.map((result, index) => {
        if (result.rarity === 'epic' || result.rarity === 'legendary') {
          return { ...result, drawNumber: gameState.totalDraws + index + 1 };
        }
        return result;
      });

      setGameState(prev => {
        const obtainedCount = {}
        let newLegendary = 0, newEpic = 0, newRare = 0
        let currencyBonus = 0

        results.forEach(result => {
          obtainedCount[result.name] = (obtainedCount[result.name] || 0) + 1
          if (result.rarity === 'legendary') newLegendary++
          if (result.rarity === 'epic') newEpic++
          if (result.rarity === 'rare') newRare++

          const match = result.name.match(/^(\d+)\s*筹码/)
          if (match) {
            currencyBonus += parseInt(match[1])
          }
        })

        const newItems = prev.items.map(item => {
          if (obtainedCount[item.name]) {
            return { ...item, obtained: item.obtained + obtainedCount[item.name] }
          }
          return item
        })

        // 记录史诗/传奇抽取（按抽取顺序）
        const newEpicLegendaryHistory = [...prev.epicLegendaryHistory]
        results.forEach((result, index) => {
          if (result.rarity === 'epic' || result.rarity === 'legendary') {
            newEpicLegendaryHistory.push({
              item: result,
              drawNumber: prev.totalDraws - 500 + index + 1
            })
          }
        })

        return {
          ...prev,
          currency: prev.currency + currencyBonus,
          items: newItems,
          history: [...results.reverse(), ...prev.history],
          epicLegendaryHistory: newEpicLegendaryHistory,
          legendaryCount: prev.legendaryCount + newLegendary,
          epicCount: prev.epicCount + newEpic,
          rareCount: prev.rareCount + newRare
        }
      })

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

      // 开始逐个显示
      setTimeout(() => {
        progressivelyShowItems(resultsWithDrawNum, 'multi500')
      }, 100)
    }, 300)
  }

  // 增加货币
  const addCurrency = () => {
    const amount = parseInt(prompt(`请输入要增加的${gameState.currencyName}数量:`, "135"))
    if (!isNaN(amount) && amount > 0) {
      setGameState(prev => ({ ...prev, currency: prev.currency + amount }))
    }
  }

  // 购买充值包
  const buyPackage = (pkg) => {
    playSound('Buy_01_UI.Buy_01_UI.wav')
    setGameState(prev => ({
      ...prev,
      currency: prev.currency + pkg.coins,
      rmb: prev.rmb - pkg.price
    }));
    setShopModal(false);
  };

  // 更新135筹码档位的数量
  const updateQuantity = (newQuantity) => {
    if (newQuantity < 1) return;
    setShopPackages(prev => prev.map(pkg => {
      if (pkg.id === 3) {
        return {
          ...pkg,
          quantity: newQuantity,
          coins: pkg.baseCoins * newQuantity,
          price: pkg.basePrice * newQuantity
        };
      }
      return pkg;
    }));
  };

  // 获取所有物品（纯粹按概率从小到大排序）
  const getPremiumItems = () => {
    return gameState.items
      .sort((a, b) => a.probability - b.probability);
  }

  return (
    <div
      className="overflow-hidden relative"
      style={shouldRotate ? {
        width: '100vh',
        height: '100vw',
        transform: 'rotate(90deg) translateY(-100%)',
        transformOrigin: 'top left',
        position: 'fixed',
        top: 0,
        left: 0
      } : {
        width: '100vw',
        height: '100vh',
        position: 'relative'
      }}
    >
      {/* Toast Notifications */}
      <Toaster />

      {/* Vercel Analytics */}
      <Analytics />

      <div className="flex h-full w-full">
        {/* Sidebar - 侧边栏 */}
        <motion.div
          initial={false}
          animate={{ width: sidebarOpen ? (isMobile ? '210px' : '420px') : '0px' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative flex-shrink-0 bg-black overflow-hidden"
          style={{ maxWidth: sidebarOpen ? (isMobile ? '42.5vw' : '85vw') : '0' }}
        >
          {/* 活动卡片 */}
          <div className="relative w-[210px] md:w-[420px] max-w-[42.5vw] md:max-w-[85vw] h-full flex items-start pt-6">
            <div className="relative w-full cursor-pointer" onClick={() => setSidebarOpen(false)}>
              <img
                src={`${CDN_BASE_URL}/10月月头筹码抽奖暗影交易/背景组件/activity_gacha_ag97_widget.png`}
                alt="活动"
                className="w-full h-auto"
              />
              {/* 文本覆盖层 - 底部 */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-white text-[9px] md:text-xl font-bold">暗影交易</h2>
                    <p className="text-cyan-400 text-[6px] md:text-sm">(Deal with the Shadow)</p>
                  </div>
                  <p className="text-white text-[7px] md:text-base">2025年10月 月初</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 主内容区 */}
        <div className="overflow-hidden relative flex-1">
          {/* 背景图 - 横向铺满 */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `url(${CDN_BASE_URL}/10月月头筹码抽奖暗影交易/抽奖界面/activity_gacha_ag97_background.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* 顶部导航栏 */}
      <div className="relative z-50">
        <div className="flex items-center justify-between px-4 py-1 md:py-3 bg-gradient-to-b from-black/80 to-black/40">
          {/* 左侧：返回按钮 + 标题 */}
          <div className="flex items-center gap-4">
            {/* 侧边栏切换按钮 */}
            <motion.button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {sidebarOpen ? (
                <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              ) : (
                <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              )}
            </motion.button>

            {/* 标题 */}
            <div>
              <h1 className="text-white text-sm md:text-lg font-bold">暗影交易</h1>
              <p className="text-cyan-400 text-[8px] md:text-xs">Deal with the Shadow</p>
            </div>
          </div>

          {/* 右侧：信息按钮 + 赞助按钮 + 货币显示 */}
          <div className="flex items-center gap-4">
            {/* 信息按钮 */}
            <button
              onClick={() => setInfoModal(true)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <circle cx="12" cy="8" r="0.5" fill="currentColor" />
              </svg>
            </button>

            {/* 赞助按钮 */}
            <button
              onClick={() => setSponsorModal(true)}
              className="text-white/80 hover:text-yellow-400 transition-colors"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>

            {/* 货币显示 */}
            <div className="flex items-center gap-1.5 md:gap-2">
              {/* 筹码 */}
              <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 rounded-full px-2 py-0.5 md:px-3 md:py-1.5 border border-cyan-500/30">
                <img
                  src={`${CDN_BASE_URL}/10月月头筹码抽奖暗影交易/货币/currency_gachacoins_ag97.png`}
                  alt="筹码"
                  className="w-5 h-5 md:w-6 md:h-6"
                />
                <span className="text-cyan-400 font-bold text-xs md:text-sm">{gameState.currency}</span>
                {/* 加号按钮 */}
                <button
                  onClick={() => setShopModal(true)}
                  className="ml-0.5 md:ml-1 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 rounded-full text-white text-base md:text-lg font-bold transition-colors"
                >
                  +
                </button>
              </div>

              {/* 人民币 */}
              <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 rounded-full px-2 py-0.5 md:px-3 md:py-1.5 border border-red-500/30">
                <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                  <path d="M531.456 529.408c-18.432 0-34.816-16.384-34.816-33.792v-17.408-16.384V428.032h-95.232c-9.216 0-17.408-3.072-23.552-10.24-7.168-7.168-10.24-17.408-10.24-25.6 1.024-19.456 16.384-34.816 33.792-34.816h94.208v-1.024-29.696h-95.232c-18.432 0-33.792-16.384-33.792-33.792 0-9.216 3.072-18.432 10.24-25.6s14.336-10.24 23.552-10.24h61.44l-1.024-2.048c-12.288-20.48-24.576-41.984-35.84-62.464l-1.024-2.048c-13.312-22.528-27.648-45.056-40.96-67.584-3.072-6.144-13.312-21.504-1.024-35.84 7.168-9.216 18.432-13.312 30.72-13.312 4.096 0 9.216 1.024 12.288 2.048 14.336 6.144 23.552 19.456 28.672 28.672 17.408 30.72 33.792 60.416 51.2 90.112l27.648 49.152 20.48-35.84 17.408-29.696c12.288-22.528 25.6-45.056 38.912-67.584 4.096-9.216 12.288-18.432 20.48-24.576 6.144-4.096 13.312-8.192 20.48-8.192 14.336 0 29.696 9.216 34.816 22.528 3.072 8.192 1.024 18.432-2.048 23.552-17.408 29.696-33.792 59.392-51.2 87.04l-12.288 21.504-17.408 30.72h61.44c18.432 0 32.768 16.384 32.768 34.816 0 20.48-14.336 34.816-32.768 34.816h-94.208v-1.024 28.672-2.048h94.208c17.408 0 30.72 11.264 33.792 27.648 4.096 16.384-6.144 34.816-20.48 41.984-3.072 2.048-8.192 2.048-11.264 2.048h-96.256v20.48c-1.024 17.408 0 30.72 0 44.032 1.024 7.168-2.048 16.384-9.216 21.504-8.192 7.168-19.456 13.312-28.672 13.312z" fill="#d81e06"/>
                  <path d="M789.504 776.192m-32.768 0a32.768 32.768 0 1 0 65.536 0 32.768 32.768 0 1 0-65.536 0Z" fill="#d81e06"/>
                  <path d="M928.768 642.048c-16.384-33.792-51.2-56.32-89.088-56.32-12.288 0-23.552 2.048-33.792 6.144L675.84 640l-1.024-1.024c-11.264-31.744-39.936-55.296-74.752-60.416l-39.936-6.144c-33.792-5.12-66.56-13.312-95.232-25.6-31.744-12.288-63.488-17.408-97.28-17.408-46.08 0-94.208 12.288-135.168 34.816L184.32 592.896v-1.024c-5.12 2.048-103.424 51.2-95.232 160.768 5.12 70.656 29.696 118.784 67.584 135.168 8.192 4.096 18.432 6.144 30.72 6.144 16.384 0 35.84-5.12 58.368-21.504 12.288-3.072 23.552-5.12 34.816-5.12 22.528 0 45.056 5.12 64.512 14.336l8.192 4.096c45.056 21.504 96.256 32.768 147.456 32.768 55.296 0 107.52-13.312 153.6-36.864l78.848-40.96c11.264-5.12 19.456-16.384 19.456-30.72 0-18.432-15.36-33.792-33.792-33.792-6.144 0-12.288 2.048-17.408 5.12l-79.872 39.936C582.656 840.704 542.72 849.92 500.736 849.92c-40.96 0-79.872-9.216-116.736-26.624l-7.168-4.096c-29.696-14.336-62.464-21.504-95.232-21.504-24.576 0-51.2 5.12-77.824 14.336l-21.504 8.192c-8.192-8.192-19.456-31.744-22.528-75.776-3.072-43.008 22.528-70.656 40.96-83.968h1.024l68.608-37.888c29.696-18.432 64.512-27.648 101.376-27.648 25.6 0 50.176 4.096 71.68 13.312 32.768 12.288 69.632 22.528 109.568 28.672l39.936 6.144c13.312 2.048 22.528 13.312 22.528 25.6 0 15.36-11.264 26.624-26.624 26.624l-168.96 6.144c-10.24 0-18.432 4.096-24.576 10.24-7.168 8.192-10.24 16.384-9.216 23.552 0 9.216 3.072 17.408 10.24 24.576 8.192 7.168 16.384 10.24 23.552 10.24l166.912-2.048c34.816 0 67.584-20.48 83.968-51.2v-1.024l159.744-59.392 9.216-1.024c10.24 0 19.456 6.144 25.6 15.36l3.072 12.288c0 10.24-6.144 19.456-15.36 23.552l-4.096 2.048c-10.24 6.144-16.384 16.384-16.384 28.672 0 18.432 14.336 32.768 32.768 32.768 6.144 0 12.288-2.048 17.408-5.12l1.024-1.024c31.744-15.36 53.248-50.176 53.248-84.992 0-11.264-3.072-24.576-8.192-36.864z" fill="#d81e06"/>
                </svg>
                <span className="text-red-400 font-bold text-xs md:text-sm">{gameState.rmb}</span>
              </div>

              {/* 艺术硬币 */}
              <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 rounded-full px-2 py-0.5 md:px-3 md:py-1.5 border border-purple-500/30">
                <img
                  src={`${CDN_BASE_URL}/常驻奖励物品/Artstorm.png`}
                  alt="艺术硬币"
                  className="w-5 h-5 md:w-6 md:h-6"
                />
                <span className="text-purple-400 font-bold text-xs md:text-sm">
                  {(() => {
                    let total = 0;
                    gameState.items.forEach(item => {
                      if (item.name.includes('艺术硬币')) {
                        const match = item.name.match(/^(\d+)\s/);
                        const quantity = match ? parseInt(match[1]) : 0;
                        total += item.obtained * quantity;
                      }
                    });
                    return total;
                  })()}
                </span>
              </div>

              {/* 金条 */}
              <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 rounded-full px-2 py-0.5 md:px-3 md:py-1.5 border border-yellow-500/30">
                <img
                  src={`${CDN_BASE_URL}/常驻奖励物品/Hard.png`}
                  alt="黄金"
                  className="w-5 h-5 md:w-6 md:h-6"
                />
                <span className="text-yellow-400 font-bold text-xs md:text-sm">
                  {(() => {
                    let total = 0;
                    gameState.items.forEach(item => {
                      if (item.name.includes('黄金')) {
                        const match = item.name.match(/^(\d+)\s/);
                        const quantity = match ? parseInt(match[1]) : 0;
                        total += item.obtained * quantity;
                      }
                    });
                    return total;
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="relative z-10 h-[calc(100%-60px)]">
        {/* 左侧：商人角色 - 绝对定位，中间偏左 */}
        <div className="absolute left-[5%] top-1/2 -translate-y-1/2">
          <img
            src={`${CDN_BASE_URL}/10月月头筹码抽奖暗影交易/抽奖界面/商人.png`}
            alt="商人"
            className="max-h-[65vh] md:h-[900px] md:max-h-none object-contain drop-shadow-2xl"
          />
        </div>

        {/* 中间偏右：六边形奖池 + 抽奖按钮 */}
        <div className="absolute right-[-8%] md:right-[15%] top-[50%] md:top-[48%] -translate-y-1/2 scale-[0.6] md:scale-100 origin-center">
          <HexGrid
            items={getPremiumItems()}
            onItemClick={(item) => console.log('点击了', item.name)}
            highlightedItemName={highlightedItemName}
          />

          {/* 抽奖按钮（在六边形下方居中） */}
          <div className="flex gap-8 justify-center mt-12">
            {/* 抽奖 x1 */}
            <button
              onClick={() => {
                playSound('Button_01_UI.Button_01_UI.wav')
                singleDraw()
              }}
              className="relative inline-flex h-10 overflow-hidden rounded-md p-[1px] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-50"
            >
              <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#10b981_0%,#059669_50%,#10b981_100%)]" />
              <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-md bg-gradient-to-b from-emerald-500 to-emerald-700 px-8 py-1 text-sm font-bold text-white backdrop-blur-3xl hover:from-emerald-400 hover:to-emerald-600 transition-all">
                抽奖 ×1
              </span>
            </button>

            {/* 抽奖 x10 */}
            <button
              onClick={() => {
                playSound('Button_01_UI.Button_01_UI.wav')
                multiDraw()
              }}
              className="relative inline-flex h-10 overflow-hidden rounded-md p-[1px] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-50"
            >
              <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#10b981_0%,#059669_50%,#10b981_100%)]" />
              <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-md bg-gradient-to-b from-emerald-500 to-emerald-700 px-8 py-1 text-sm font-bold text-white backdrop-blur-3xl hover:from-emerald-400 hover:to-emerald-600 transition-all">
                抽奖 ×10
              </span>
            </button>

            {/* 抽奖 x100 - 金色主题 */}
            <button
              onClick={() => {
                playSound('Button_01_UI.Button_01_UI.wav')
                draw100()
              }}
              className="relative inline-flex h-10 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-50"
            >
              <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#fde047_0%,#ea580c_50%,#fde047_100%)]" />
              <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-8 py-1 text-sm font-bold text-white backdrop-blur-3xl hover:bg-slate-900 transition-all">
                抽奖 ×100
              </span>
            </button>

            {/* 抽奖 x500 - 特殊紫色主题 */}
            <button
              onClick={() => {
                playSound('Button_01_UI.Button_01_UI.wav')
                draw500()
              }}
              className="relative inline-flex h-10 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
            >
              <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
              <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-8 py-1 text-sm font-bold text-white backdrop-blur-3xl hover:bg-slate-900 transition-all">
                抽奖 ×500
              </span>
            </button>
          </div>
        </div>
      </div>

        {/* Result Modal */}
        {resultModal.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="fixed left-0 right-0 bottom-0 top-0 md:top-[60px] z-40"
            style={{
              backgroundImage: `url(${CDN_BASE_URL}/10月月头筹码抽奖暗影交易/抽奖界面/出物品.png)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            onClick={() => {
              // 如果正在暂停（遇到史诗/传奇），点击继续生成
              if (resultModal.isPaused) {
                continueGeneration()
              }
              // 如果生成完毕，点击关闭弹窗
              else if (resultModal.isComplete) {
                setResultModal({ ...resultModal, show: false })
              }
            }}
          >
            {/* 物品展示区域 */}
            <div className="h-full flex items-center justify-center p-8 translate-y-[11px] md:translate-y-[28px]">
              {/* 响应式缩放容器 */}
              <div style={{ transform: `scale(${itemScale})`, transformOrigin: 'center' }}>
                {resultModal.drawType === 'single' ? (
                  // 单抽：居中显示单个物品
                  <div onClick={e => e.stopPropagation()}>
                    <SquareItem
                      item={resultModal.displayedItems[0]}
                      size={120}
                      index={0}
                      drawNumber={resultModal.displayedItems[0]?.drawNumber}
                    />
                  </div>
                ) : resultModal.drawType === 'multi10' ? (
                  // 10连抽：5个一排，两排
                  <div className="flex flex-col gap-6" onClick={e => e.stopPropagation()}>
                    {[0, 1].map(rowIndex => (
                      <div key={rowIndex} className="flex gap-6 justify-center">
                        {resultModal.displayedItems.slice(rowIndex * 5, rowIndex * 5 + 5).map((item, colIndex) => (
                          <SquareItem
                            key={rowIndex * 5 + colIndex}
                            item={item}
                            size={120}
                            index={rowIndex * 5 + colIndex}
                            drawNumber={item.drawNumber}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  // 100连和500连：10个一排，最多显示两排（史诗/传奇在前）
                  <div className="flex flex-col gap-6" onClick={e => e.stopPropagation()}>
                    {[0, 1].map(rowIndex => (
                      <div key={rowIndex} className="flex gap-6 justify-center">
                        {resultModal.displayedItems.slice(rowIndex * 10, rowIndex * 10 + 10).map((item, colIndex) => (
                          <SquareItem
                            key={rowIndex * 10 + colIndex}
                            item={item}
                            size={120}
                            index={rowIndex * 10 + colIndex}
                            drawNumber={item.drawNumber}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* History Modal - 历史记录 */}
        {infoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setInfoModal(false)}
          >
            <div
              className="relative w-full max-h-[85vh] overflow-y-auto rounded-lg scale-90 md:scale-100"
              style={{
                backgroundImage: `url(${CDN_BASE_URL}/10月月头筹码抽奖暗影交易/背景组件/eventgachaoffer_ag97_limited_background.png)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                maxWidth: `${1280 * itemScale}px`,
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col items-center py-6 px-4 md:py-8 md:px-8">
                {/* 标题 */}
                <h2 className="text-xl md:text-3xl font-bold text-white mb-4 md:mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  历史抽奖记录
                </h2>

                {/* 史诗和传奇物品展示（按抽取顺序） */}
                <div
                  className="mb-4 md:mb-6"
                  style={{ transform: `scale(${itemScale})`, transformOrigin: 'center' }}
                >
                  {gameState.epicLegendaryHistory.length === 0 ? (
                    <div className="text-white text-base md:text-lg text-center py-6 bg-black/50 rounded-lg px-4">
                      还未获得史诗或传奇物品
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-4 md:gap-6 justify-center">
                      {gameState.epicLegendaryHistory.map((record, index) => (
                        <div key={index} className="relative mb-2">
                          <SquareItem
                            item={record.item}
                            size={120}
                            index={index}
                            drawNumber={record.drawNumber}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 关闭按钮 */}
                <button
                  onClick={() => setInfoModal(false)}
                  className="bg-slate-800 no-underline group cursor-pointer relative shadow-2xl shadow-zinc-900 rounded-full p-px text-sm font-semibold leading-6 text-white inline-block scale-90 md:scale-100"
                >
                  <span className="absolute inset-0 overflow-hidden rounded-full">
                    <span className="absolute inset-0 rounded-full bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
                  </span>
                  <div className="relative flex items-center justify-center z-10 rounded-full bg-zinc-950 py-1 px-5 ring-1 ring-white/10">
                    <span>关闭</span>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Shop Modal - 充值商店 */}
        {shopModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
            onClick={() => setShopModal(false)}
          >
            {/* 商品展示区域 */}
            <div className="flex gap-6 px-8 scale-[0.6] md:scale-100" onClick={e => e.stopPropagation()}>
              {shopPackages.map((pkg, index) => (
                  <div
                    key={pkg.id}
                    className="relative w-60 bg-gradient-to-b from-slate-800/90 to-slate-900/90 rounded-lg overflow-hidden border border-slate-600/50 hover:border-cyan-400/60 transition-all cursor-pointer group shadow-lg"
                    onClick={() => buyPackage(pkg)}
                  >
                    {/* 顶部标签 */}
                    <div className="bg-gradient-to-r from-slate-700/80 to-slate-600/80 px-3 py-1 text-white text-sm font-bold border-b border-slate-500/30">
                      {index === 0 ? '一组筹码' : index === 1 ? '一盒筹码' : '一箱筹码'}
                    </div>

                    {/* 商品图片 */}
                    <div className="relative p-6 flex items-center justify-center h-48">
                      {/* 135筹码档位：左侧±1控制按钮 */}
                      {pkg.id === 3 && (
                        <div
                          className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 items-center"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => updateQuantity(pkg.quantity + 1)}
                            className="w-8 h-8 bg-slate-700/80 hover:bg-slate-600 rounded text-white text-xs font-bold transition-colors border border-slate-500/50"
                          >
                            ▲
                          </button>
                          <div className="text-gray-300 text-xs font-bold">±1</div>
                          <button
                            onClick={() => updateQuantity(pkg.quantity - 1)}
                            className="w-8 h-8 bg-slate-700/80 hover:bg-slate-600 rounded text-white text-xs font-bold transition-colors border border-slate-500/50"
                          >
                            ▼
                          </button>
                        </div>
                      )}

                      <img
                        src={pkg.image}
                        alt={`${pkg.coins}筹码`}
                        className="max-h-full object-contain group-hover:scale-110 transition-transform"
                      />

                      {/* 135筹码档位：右侧±5控制按钮 */}
                      {pkg.id === 3 && (
                        <div
                          className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 items-center"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => updateQuantity(pkg.quantity + 5)}
                            className="w-8 h-8 bg-slate-700/80 hover:bg-slate-600 rounded text-white text-xs font-bold transition-colors border border-slate-500/50"
                          >
                            ▲
                          </button>
                          <div className="text-gray-300 text-xs font-bold">±5</div>
                          <button
                            onClick={() => updateQuantity(pkg.quantity - 5)}
                            className="w-8 h-8 bg-slate-700/80 hover:bg-slate-600 rounded text-white text-xs font-bold transition-colors border border-slate-500/50"
                          >
                            ▼
                          </button>
                        </div>
                      )}

                      {/* 折扣角标 */}
                      {pkg.discount && (
                        <div className="absolute top-2 right-2 bg-gradient-to-br from-red-600 to-red-700 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                          {pkg.discount}
                        </div>
                      )}

                      {/* 135筹码档位：显示当前数量 */}
                      {pkg.id === 3 && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/80 text-cyan-400 text-xs font-bold px-3 py-1 rounded-full border border-slate-500/50">
                          数量: {pkg.quantity}
                        </div>
                      )}
                    </div>

                    {/* 底部信息条 */}
                    <div className="bg-gradient-to-b from-slate-800/80 to-slate-900/80 px-4 py-3 border-t border-slate-600/50">
                      {/* 筹码数量 */}
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <img
                          src={`${CDN_BASE_URL}/10月月头筹码抽奖暗影交易/货币/currency_gachacoins_ag97.png`}
                          alt="筹码"
                          className="w-5 h-5"
                        />
                        <span className="text-white font-bold text-lg">{pkg.coins}</span>
                      </div>
                      {/* 价格 */}
                      <div className="flex items-center justify-center gap-1">
                        <svg className="w-4 h-4" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                          <path d="M531.456 529.408c-18.432 0-34.816-16.384-34.816-33.792v-17.408-16.384V428.032h-95.232c-9.216 0-17.408-3.072-23.552-10.24-7.168-7.168-10.24-17.408-10.24-25.6 1.024-19.456 16.384-34.816 33.792-34.816h94.208v-1.024-29.696h-95.232c-18.432 0-33.792-16.384-33.792-33.792 0-9.216 3.072-18.432 10.24-25.6s14.336-10.24 23.552-10.24h61.44l-1.024-2.048c-12.288-20.48-24.576-41.984-35.84-62.464l-1.024-2.048c-13.312-22.528-27.648-45.056-40.96-67.584-3.072-6.144-13.312-21.504-1.024-35.84 7.168-9.216 18.432-13.312 30.72-13.312 4.096 0 9.216 1.024 12.288 2.048 14.336 6.144 23.552 19.456 28.672 28.672 17.408 30.72 33.792 60.416 51.2 90.112l27.648 49.152 20.48-35.84 17.408-29.696c12.288-22.528 25.6-45.056 38.912-67.584 4.096-9.216 12.288-18.432 20.48-24.576 6.144-4.096 13.312-8.192 20.48-8.192 14.336 0 29.696 9.216 34.816 22.528 3.072 8.192 1.024 18.432-2.048 23.552-17.408 29.696-33.792 59.392-51.2 87.04l-12.288 21.504-17.408 30.72h61.44c18.432 0 32.768 16.384 32.768 34.816 0 20.48-14.336 34.816-32.768 34.816h-94.208v-1.024 28.672-2.048h94.208c17.408 0 30.72 11.264 33.792 27.648 4.096 16.384-6.144 34.816-20.48 41.984-3.072 2.048-8.192 2.048-11.264 2.048h-96.256v20.48c-1.024 17.408 0 30.72 0 44.032 1.024 7.168-2.048 16.384-9.216 21.504-8.192 7.168-19.456 13.312-28.672 13.312z" fill="#d81e06"/>
                          <path d="M789.504 776.192m-32.768 0a32.768 32.768 0 1 0 65.536 0 32.768 32.768 0 1 0-65.536 0Z" fill="#d81e06"/>
                          <path d="M928.768 642.048c-16.384-33.792-51.2-56.32-89.088-56.32-12.288 0-23.552 2.048-33.792 6.144L675.84 640l-1.024-1.024c-11.264-31.744-39.936-55.296-74.752-60.416l-39.936-6.144c-33.792-5.12-66.56-13.312-95.232-25.6-31.744-12.288-63.488-17.408-97.28-17.408-46.08 0-94.208 12.288-135.168 34.816L184.32 592.896v-1.024c-5.12 2.048-103.424 51.2-95.232 160.768 5.12 70.656 29.696 118.784 67.584 135.168 8.192 4.096 18.432 6.144 30.72 6.144 16.384 0 35.84-5.12 58.368-21.504 12.288-3.072 23.552-5.12 34.816-5.12 22.528 0 45.056 5.12 64.512 14.336l8.192 4.096c45.056 21.504 96.256 32.768 147.456 32.768 55.296 0 107.52-13.312 153.6-36.864l78.848-40.96c11.264-5.12 19.456-16.384 19.456-30.72 0-18.432-15.36-33.792-33.792-33.792-6.144 0-12.288 2.048-17.408 5.12l-79.872 39.936C582.656 840.704 542.72 849.92 500.736 849.92c-40.96 0-79.872-9.216-116.736-26.624l-7.168-4.096c-29.696-14.336-62.464-21.504-95.232-21.504-24.576 0-51.2 5.12-77.824 14.336l-21.504 8.192c-8.192-8.192-19.456-31.744-22.528-75.776-3.072-43.008 22.528-70.656 40.96-83.968h1.024l68.608-37.888c29.696-18.432 64.512-27.648 101.376-27.648 25.6 0 50.176 4.096 71.68 13.312 32.768 12.288 69.632 22.528 109.568 28.672l39.936 6.144c13.312 2.048 22.528 13.312 22.528 25.6 0 15.36-11.264 26.624-26.624 26.624l-168.96 6.144c-10.24 0-18.432 4.096-24.576 10.24-7.168 8.192-10.24 16.384-9.216 23.552 0 9.216 3.072 17.408 10.24 24.576 8.192 7.168 16.384 10.24 23.552 10.24l166.912-2.048c34.816 0 67.584-20.48 83.968-51.2v-1.024l159.744-59.392 9.216-1.024c10.24 0 19.456 6.144 25.6 15.36l3.072 12.288c0 10.24-6.144 19.456-15.36 23.552l-4.096 2.048c-10.24 6.144-16.384 16.384-16.384 28.672 0 18.432 14.336 32.768 32.768 32.768 6.144 0 12.288-2.048 17.408-5.12l1.024-1.024c31.744-15.36 53.248-50.176 53.248-84.992 0-11.264-3.072-24.576-8.192-36.864z" fill="#d81e06"/>
                        </svg>
                        <span className="text-red-400 font-bold text-sm">{pkg.price}</span>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Sponsor Modal - 赞助作者 */}
        {sponsorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setSponsorModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                transition: {
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                }
              }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              className="relative bg-black rounded-2xl p-4 md:p-6 max-w-xs md:max-w-sm w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* 顶部装饰线条 */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent rounded-full" />

              {/* 关闭按钮 */}
              <button
                onClick={() => setSponsorModal(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              {/* 内容区 */}
              <div className="flex flex-col items-center space-y-4 mt-2">
                {/* 标题 */}
                <div className="text-center space-y-1">
                  <h3 className="text-xl md:text-2xl font-bold text-white">赞助作者</h3>
                  <div className="flex items-center gap-2 justify-center">
                    <div className="h-px w-6 bg-gradient-to-r from-transparent to-gray-600" />
                    <p className="text-sm md:text-base text-emerald-400 font-semibold">CHanGO</p>
                    <div className="h-px w-6 bg-gradient-to-l from-transparent to-gray-600" />
                  </div>
                </div>

                {/* 收款码 */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-sky-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-500" />
                  <div className="relative bg-white p-3 rounded-xl">
                    <img
                      src={`${CDN_BASE_URL}/sponsor/payment-qr.png`}
                      alt="收款码"
                      className="w-40 h-40 md:w-48 md:h-48 object-contain"
                    />
                  </div>
                  {/* 支付说明 */}
                  <div className="text-center mt-2">
                    <p className="text-gray-500 text-xs">使用支付宝扫码支付</p>
                  </div>
                </div>

                {/* QQ号复制按钮 */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('1528919811')
                    toast.success('QQ号已复制', {
                      duration: 2000,
                      position: 'top-center',
                      style: {
                        background: '#000',
                        color: '#fff',
                        border: '1px solid #10b981',
                        borderRadius: '12px',
                        padding: '12px 24px'
                      }
                    })
                  }}
                  className="bg-slate-800 no-underline group cursor-pointer relative shadow-2xl shadow-zinc-900 rounded-full p-px text-xs md:text-sm font-semibold leading-6 text-white inline-block w-full"
                >
                  <span className="absolute inset-0 overflow-hidden rounded-full">
                    <span className="absolute inset-0 rounded-full bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
                  </span>
                  <div className="relative flex space-x-1.5 md:space-x-2 items-center justify-center z-10 rounded-full bg-zinc-950 py-2 md:py-2.5 px-4 md:px-6 ring-1 ring-white/10">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span className="text-xs md:text-sm">复制 QQ: 1528919811</span>
                  </div>
                </button>
              </div>

              {/* 底部装饰线条 */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-0.5 bg-gradient-to-r from-transparent via-sky-500 to-transparent rounded-full" />
            </motion.div>
          </motion.div>
        )}

        {/* History Modal */}
        {historyModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setHistoryModal(false)}>
            <div className="bg-slate-800/95 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-cyan-500/30 animate-modalFadeIn" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                <h3 className="text-3xl font-bold text-cyan-400">所有抽奖记录</h3>
                <button onClick={() => setHistoryModal(false)} className="text-4xl text-gray-400 hover:text-white transition-colors">&times;</button>
              </div>
              <div className="space-y-2">
                {gameState.history.map((item, index) => (
                  <div key={index} className="p-3 bg-slate-900/60 rounded-lg flex items-center gap-3 animate-slideIn">
                    <div className={`w-2 h-10 rounded ${getRarityBgClass(item.rarity)}`}></div>
                    <div className="flex-1">
                      <div className="font-bold">{item.name}</div>
                      <div className="text-sm text-slate-400">{item.type}</div>
                    </div>
                    <div className={`text-sm px-3 py-1 rounded-full ${getRarityClass(item.rarity)}`}>
                      {getRarityText(item.rarity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        </div>
        {/* 主内容区结束 */}
      </div>
      {/* flex container 结束 */}
    </div>
  )
}

export default App
