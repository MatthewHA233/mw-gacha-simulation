import { useState, useEffect } from 'react'
import './App.css'
import { defaultItems } from './data/defaultItems'
import { HexGrid } from './components/HexGrid'
import { SquareItem } from './components/SquareItem'
import { motion } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'

function App() {
  const [shouldRotate, setShouldRotate] = useState(false)

  useEffect(() => {
    const checkOrientation = () => {
      // 当宽度小于高度时（接近1:1或更窄），触发横屏旋转
      const shouldRotateNow = window.innerWidth < window.innerHeight && window.innerWidth < 900
      setShouldRotate(shouldRotateNow)
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
        setResultModal(prev => ({
          ...prev,
          isGenerating: false,
          isComplete: true
        }));
        return;
      }

      const nextItem = allItems[currentIndex];

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
        setResultModal(prev => ({
          ...prev,
          isGenerating: false,
          isComplete: true
        }));
        return;
      }

      const nextItem = allItems[index];

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

            return {
              ...prev,
              currency: prev.currency + currencyBonus,
              items: newItems,
              history: [result, ...prev.history],
              legendaryCount: prev.legendaryCount + (result.rarity === 'legendary' ? 1 : 0),
              epicCount: prev.epicCount + (result.rarity === 'epic' ? 1 : 0),
              rareCount: prev.rareCount + (result.rarity === 'rare' ? 1 : 0)
            }
          })

          setResultModal({
            show: true,
            items: [result],
            displayedItems: [result],
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

        return {
          ...prev,
          currency: prev.currency + currencyBonus,
          items: newItems,
          history: [...results.reverse(), ...prev.history],
          legendaryCount: prev.legendaryCount + newLegendary,
          epicCount: prev.epicCount + newEpic,
          rareCount: prev.rareCount + newRare
        }
      })

      setResultModal({
        show: true,
        items: results,
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
        progressivelyShowItems(results, 'multi10')
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

        return {
          ...prev,
          currency: prev.currency + currencyBonus,
          items: newItems,
          history: [...results.reverse(), ...prev.history],
          legendaryCount: prev.legendaryCount + newLegendary,
          epicCount: prev.epicCount + newEpic,
          rareCount: prev.rareCount + newRare
        }
      })

      setResultModal({
        show: true,
        items: results,
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
        progressivelyShowItems(results, 'multi100')
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

        return {
          ...prev,
          currency: prev.currency + currencyBonus,
          items: newItems,
          history: [...results.reverse(), ...prev.history],
          legendaryCount: prev.legendaryCount + newLegendary,
          epicCount: prev.epicCount + newEpic,
          rareCount: prev.rareCount + newRare
        }
      })

      setResultModal({
        show: true,
        items: results,
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
        progressivelyShowItems(results, 'multi500')
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

      {/* 背景图 - 横向铺满 */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: 'url(/10月月头筹码抽奖暗影交易/抽奖界面/activity_gacha_ag97_background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* 顶部导航栏 */}
      <div className="relative z-50">
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-black/40">
          {/* 左侧：返回按钮 + 标题 */}
          <div className="flex items-center gap-4">
            {/* 返回按钮 */}
            <button className="text-white/80 hover:text-white transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            {/* 标题 */}
            <div>
              <h1 className="text-white text-lg font-bold">暗影交易</h1>
              <p className="text-cyan-400 text-xs">SHADOW TRADE</p>
            </div>
          </div>

          {/* 右侧：信息按钮 + 货币显示 */}
          <div className="flex items-center gap-4">
            {/* 信息按钮 */}
            <button
              onClick={() => setInfoModal(true)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <circle cx="12" cy="8" r="0.5" fill="currentColor" />
              </svg>
            </button>

            {/* 货币显示 */}
            <div className="flex items-center gap-3">
              {/* 筹码 */}
              <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-cyan-500/30">
                <img
                  src="/10月月头筹码抽奖暗影交易/货币/currency_gachacoins_ag97.png"
                  alt="筹码"
                  className="w-6 h-6"
                />
                <span className="text-cyan-400 font-bold text-sm">{gameState.currency}</span>
                {/* 加号按钮 */}
                <button
                  onClick={() => setShopModal(true)}
                  className="ml-1 w-5 h-5 flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 rounded-full text-white text-lg font-bold transition-colors"
                >
                  +
                </button>
              </div>

              {/* 人民币 */}
              <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-amber-500/30">
                <span className="text-amber-400 font-bold text-sm">¥</span>
                <span className="text-amber-400 font-bold text-sm">{gameState.rmb}</span>
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
            src="/10月月头筹码抽奖暗影交易/抽奖界面/商人.png"
            alt="商人"
            className="h-[900px] object-contain drop-shadow-2xl"
          />
        </div>

        {/* 中间偏右：六边形奖池 */}
        <div className="absolute right-[15%] top-[40%] -translate-y-1/2">
          <HexGrid
            items={getPremiumItems()}
            onItemClick={(item) => console.log('点击了', item.name)}
            highlightedItemName={highlightedItemName}
          />
        </div>

        {/* 底部：抽奖按钮（六边形物品栏下方） */}
        <div className="absolute right-[-6%] top-[75%] -translate-x-1/2 flex gap-8">
          {/* 抽奖 x1 */}
          <button
            onClick={singleDraw}
            className="relative inline-flex h-10 overflow-hidden rounded-md p-[1px] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-50"
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#10b981_0%,#059669_50%,#10b981_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-md bg-gradient-to-b from-emerald-500 to-emerald-700 px-8 py-1 text-sm font-bold text-white backdrop-blur-3xl hover:from-emerald-400 hover:to-emerald-600 transition-all">
              抽奖 ×1
            </span>
          </button>

          {/* 抽奖 x10 */}
          <button
            onClick={multiDraw}
            className="relative inline-flex h-10 overflow-hidden rounded-md p-[1px] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-50"
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#10b981_0%,#059669_50%,#10b981_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-md bg-gradient-to-b from-emerald-500 to-emerald-700 px-8 py-1 text-sm font-bold text-white backdrop-blur-3xl hover:from-emerald-400 hover:to-emerald-600 transition-all">
              抽奖 ×10
            </span>
          </button>

          {/* 抽奖 x100 - 金色主题 */}
          <button
            onClick={draw100}
            className="relative inline-flex h-10 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-50"
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#fde047_0%,#ea580c_50%,#fde047_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-8 py-1 text-sm font-bold text-white backdrop-blur-3xl hover:bg-slate-900 transition-all">
              抽奖 ×100
            </span>
          </button>

          {/* 抽奖 x500 - 特殊紫色主题 */}
          <button
            onClick={draw500}
            className="relative inline-flex h-10 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-8 py-1 text-sm font-bold text-white backdrop-blur-3xl hover:bg-slate-900 transition-all">
              抽奖 ×500
            </span>
          </button>
        </div>
      </div>

        {/* Result Modal */}
        {resultModal.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="fixed left-0 right-0 bottom-0 z-40"
            style={{
              top: '60px',
              backgroundImage: 'url(/10月月头筹码抽奖暗影交易/抽奖界面/出物品.png)',
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
            <div className="h-full flex items-center justify-center p-8 overflow-hidden" style={{ transform: 'translateY(28px)' }}>
              {resultModal.drawType === 'single' ? (
                // 单抽：居中显示单个物品
                <div onClick={e => e.stopPropagation()}>
                  <SquareItem
                    item={resultModal.displayedItems[0]}
                    size={120}
                    index={0}
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
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Info Modal */}
        {infoModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setInfoModal(false)}>
            <div className="bg-slate-800/95 rounded-2xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-cyan-500/30 animate-modalFadeIn" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                <h3 className="text-3xl font-bold text-cyan-400">所有奖品信息</h3>
                <button onClick={() => setInfoModal(false)} className="text-4xl text-gray-400 hover:text-white transition-colors">&times;</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-white/10">
                      <th className="p-3 text-left text-cyan-400">奖品名称</th>
                      <th className="p-3 text-left text-cyan-400">类别</th>
                      <th className="p-3 text-left text-cyan-400">稀有度</th>
                      <th className="p-3 text-left text-cyan-400">概率</th>
                      <th className="p-3 text-left text-cyan-400">已抽中</th>
                      <th className="p-3 text-left text-cyan-400">限量</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameState.items.sort((a, b) => {
                      const order = { legendary: 4, epic: 3, rare: 2, common: 1 }
                      return order[b.rarity] - order[a.rarity] || a.probability - b.probability
                    }).map((item, index) => (
                      <tr key={index} className="border-b border-white/5 hover:bg-cyan-500/10 transition-colors">
                        <td className="p-3">{item.name}</td>
                        <td className="p-3">{item.type}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-lg text-xs ${getRarityClass(item.rarity)}`}>
                            {getRarityText(item.rarity)}
                          </span>
                        </td>
                        <td className="p-3">{item.probability.toFixed(2)}%</td>
                        <td className="p-3">{item.obtained}</td>
                        <td className="p-3">{item.limit > 0 ? `${item.obtained}/${item.limit}` : '无限制'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
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
            <div className="flex gap-6 px-8" onClick={e => e.stopPropagation()}>
              {shopPackages.map((pkg, index) => (
                  <div
                    key={pkg.id}
                    className="relative w-60 bg-black/70 rounded-lg overflow-hidden border border-cyan-500/30 hover:border-cyan-500 transition-all cursor-pointer group"
                    onClick={() => buyPackage(pkg)}
                  >
                    {/* 顶部标签 */}
                    <div className="bg-cyan-600/80 px-3 py-1 text-white text-sm font-bold">
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
                            className="w-8 h-8 bg-cyan-600 hover:bg-cyan-500 rounded text-white text-xs font-bold transition-colors"
                          >
                            ▲
                          </button>
                          <div className="text-white text-xs font-bold">±1</div>
                          <button
                            onClick={() => updateQuantity(pkg.quantity - 1)}
                            className="w-8 h-8 bg-cyan-600 hover:bg-cyan-500 rounded text-white text-xs font-bold transition-colors"
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
                            className="w-8 h-8 bg-cyan-600 hover:bg-cyan-500 rounded text-white text-xs font-bold transition-colors"
                          >
                            ▲
                          </button>
                          <div className="text-white text-xs font-bold">±5</div>
                          <button
                            onClick={() => updateQuantity(pkg.quantity - 5)}
                            className="w-8 h-8 bg-cyan-600 hover:bg-cyan-500 rounded text-white text-xs font-bold transition-colors"
                          >
                            ▼
                          </button>
                        </div>
                      )}

                      {/* 折扣角标 */}
                      {pkg.discount && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                          {pkg.discount}
                        </div>
                      )}

                      {/* 135筹码档位：显示当前数量 */}
                      {pkg.id === 3 && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs font-bold px-3 py-1 rounded-full border border-cyan-500/50">
                          数量: {pkg.quantity}
                        </div>
                      )}
                    </div>

                    {/* 底部蓝色条 */}
                    <div className="bg-cyan-600 px-4 py-3">
                      {/* 筹码数量 */}
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <img
                          src="/10月月头筹码抽奖暗影交易/货币/currency_gachacoins_ag97.png"
                          alt="筹码"
                          className="w-5 h-5"
                        />
                        <span className="text-white font-bold text-lg">{pkg.coins}</span>
                      </div>
                      {/* 价格 */}
                      <div className="text-center text-white font-bold text-sm">
                        ¥{pkg.price}
                      </div>
                    </div>
                  </div>
              ))}
            </div>
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
  )
}

export default App
