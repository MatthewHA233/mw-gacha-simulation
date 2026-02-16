/**
 * 抽卡逻辑服务
 */

/**
 * 执行单次抽奖
 * @param {Array} items - 可抽取的物品列表
 * @param {Object} gameState - 当前游戏状态（包含 obtained 信息）
 * @returns {Object} 抽中的物品
 */
export function drawSingle(items, gameState) {
  // 过滤出可抽取的物品（未达到限制）
  const availableItems = items.filter(item => {
    if (item.limit === 0) return true
    const obtained = gameState.obtainedItems?.[item.id] || 0
    return obtained < item.limit
  })

  // 获取不可抽取物品的概率总和
  const unavailableItems = items.filter(item => {
    if (item.limit === 0) return false
    const obtained = gameState.obtainedItems?.[item.id] || 0
    return obtained >= item.limit
  })
  const unavailableProbability = unavailableItems.reduce((sum, item) => sum + item.probability, 0)

  // 将不可抽取物品的概率补给黄金（或其他垫底物品）
  const itemsWithAdjustedProb = availableItems.map(item => {
    if (item.name.includes('黄金') || item.rarity === 'common') {
      return { ...item, adjustedProbability: item.probability + (unavailableProbability / availableItems.filter(i => i.rarity === 'common').length) }
    }
    return { ...item, adjustedProbability: item.probability }
  })

  // 计算总概率并抽取
  const totalProbability = itemsWithAdjustedProb.reduce((sum, item) => sum + item.adjustedProbability, 0)
  const rand = Math.random() * totalProbability
  let cumulativeProbability = 0

  for (const item of itemsWithAdjustedProb) {
    cumulativeProbability += item.adjustedProbability
    if (rand < cumulativeProbability) {
      return item
    }
  }

  // 兜底返回最后一个
  return availableItems[availableItems.length - 1]
}

/**
 * 执行多次抽奖（带保底机制）
 * @param {Array} items - 可抽取的物品列表
 * @param {Object} gameState - 当前游戏状态
 * @param {number} count - 抽奖次数
 * @param {Object} guarantee - 保底配置 {epic: 10, legendary: 50}
 * @returns {Array} 抽中的物品数组
 */
export function drawMultiple(items, gameState, count, guarantee = {}) {
  const results = []
  let tempGameState = { ...gameState }

  // 初始化已获得物品记录
  if (!tempGameState.obtainedItems) {
    tempGameState.obtainedItems = {}
  }

  // 初始化保底计数器
  if (!tempGameState.guaranteeCounters) {
    tempGameState.guaranteeCounters = {
      epic: gameState.epicGuaranteeCounter || 0,
      legendary: gameState.legendaryGuaranteeCounter || 0
    }
  }

  for (let i = 0; i < count; i++) {
    let result

    // 检查是否触发传说保底
    if (guarantee.legendary && tempGameState.guaranteeCounters.legendary >= guarantee.legendary - 1) {
      // 强制抽取传说物品
      const legendaryItems = items.filter(item => {
        if (item.rarity !== 'legendary') return false
        if (item.limit === 0) return true
        const obtained = tempGameState.obtainedItems[item.id] || 0
        return obtained < item.limit
      })

      if (legendaryItems.length > 0) {
        const totalProb = legendaryItems.reduce((sum, item) => sum + item.probability, 0)
        const rand = Math.random() * totalProb
        let cumulative = 0

        for (const item of legendaryItems) {
          cumulative += item.probability
          if (rand < cumulative) {
            result = item
            break
          }
        }

        if (!result) result = legendaryItems[0]
        tempGameState.guaranteeCounters.legendary = 0
        tempGameState.guaranteeCounters.epic = 0
      } else {
        // 没有可用传说物品，正常抽取
        result = drawSingle(items, tempGameState)
      }
    }
    // 检查是否触发史诗保底
    else if (guarantee.epic && tempGameState.guaranteeCounters.epic >= guarantee.epic - 1) {
      // 强制抽取史诗或传说物品
      const epicPlusItems = items.filter(item => {
        if (item.rarity !== 'epic' && item.rarity !== 'legendary') return false
        if (item.limit === 0) return true
        const obtained = tempGameState.obtainedItems[item.id] || 0
        return obtained < item.limit
      })

      if (epicPlusItems.length > 0) {
        const totalProb = epicPlusItems.reduce((sum, item) => sum + item.probability, 0)
        const rand = Math.random() * totalProb
        let cumulative = 0

        for (const item of epicPlusItems) {
          cumulative += item.probability
          if (rand < cumulative) {
            result = item
            break
          }
        }

        if (!result) result = epicPlusItems[0]
        tempGameState.guaranteeCounters.epic = 0
      } else {
        // 没有可用史诗物品，正常抽取
        result = drawSingle(items, tempGameState)
      }
    } else {
      // 正常抽取
      result = drawSingle(items, tempGameState)
    }

    // 更新保底计数器
    if (result.rarity === 'legendary') {
      tempGameState.guaranteeCounters.legendary = 0
      tempGameState.guaranteeCounters.epic = 0
    } else if (result.rarity === 'epic') {
      tempGameState.guaranteeCounters.epic = 0
      tempGameState.guaranteeCounters.legendary++
    } else {
      tempGameState.guaranteeCounters.epic++
      tempGameState.guaranteeCounters.legendary++
    }

    // 更新已获得物品数量
    tempGameState.obtainedItems[result.id] = (tempGameState.obtainedItems[result.id] || 0) + 1

    results.push(result)
  }

  return {
    items: results,
    newGuaranteeCounters: tempGameState.guaranteeCounters,
    newObtainedItems: tempGameState.obtainedItems
  }
}

/**
 * Fisher-Yates 洗牌算法
 * @param {Array} array - 要打乱的数组
 * @returns {Array} 打乱后的新数组
 */
export function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * 检查抽奖结果中是否包含史诗或传说物品
 * @param {Array} items - 抽奖结果数组
 * @returns {boolean}
 */
export function hasEpicOrLegendary(items) {
  return items.some(item => item.rarity === 'epic' || item.rarity === 'legendary')
}

/**
 * 计算最便宜的购买方案，使总币数 >= deficit
 * @param {number} deficit - 缺少的货币数量
 * @param {Array} packages - 商店套餐数组，每项含 coins/baseCoins/bonus/price/basePrice/id
 * @returns {{ totalCoins: number, totalPrice: number, purchases: Array }}
 */
export function findCheapestPurchase(deficit, packages) {
  if (deficit <= 0 || !packages || packages.length === 0) {
    return { totalCoins: 0, totalPrice: 0, purchases: [] }
  }

  // 标准化套餐：计算每单位的币数和价格
  const normalized = packages.map(pkg => ({
    id: pkg.id,
    coins: (pkg.baseCoins || pkg.coins) + (pkg.bonus || 0),
    price: pkg.basePrice || pkg.price
  }))

  // 按币数降序排列（大套餐放外层循环）
  normalized.sort((a, b) => b.coins - a.coins)

  let best = null

  const tryCombo = (quantities) => {
    let totalCoins = 0
    let totalPrice = 0
    const purchases = []

    quantities.forEach((qty, i) => {
      if (qty > 0) {
        totalCoins += qty * normalized[i].coins
        totalPrice += qty * normalized[i].price
        purchases.push({
          id: normalized[i].id,
          quantity: qty,
          coins: qty * normalized[i].coins,
          price: qty * normalized[i].price
        })
      }
    })

    if (totalCoins >= deficit && (!best || totalPrice < best.totalPrice)) {
      best = { totalCoins, totalPrice, purchases }
    }
  }

  if (normalized.length === 1) {
    const q = Math.ceil(deficit / normalized[0].coins)
    tryCombo([q])
  } else if (normalized.length === 2) {
    const maxQ0 = Math.ceil(deficit / normalized[0].coins)
    for (let q0 = 0; q0 <= maxQ0; q0++) {
      const remaining = deficit - q0 * normalized[0].coins
      const q1 = remaining > 0 ? Math.ceil(remaining / normalized[1].coins) : 0
      tryCombo([q0, q1])
    }
  } else {
    // 3 层循环：大套餐 → 中套餐 → 小套餐（自动补齐）
    const maxQ0 = Math.ceil(deficit / normalized[0].coins)
    for (let q0 = 0; q0 <= maxQ0; q0++) {
      const remaining1 = deficit - q0 * normalized[0].coins
      if (remaining1 <= 0) {
        tryCombo([q0, 0, 0])
        continue
      }
      const maxQ1 = Math.ceil(remaining1 / normalized[1].coins)
      for (let q1 = 0; q1 <= maxQ1; q1++) {
        const remaining2 = remaining1 - q1 * normalized[1].coins
        const q2 = remaining2 > 0 ? Math.ceil(remaining2 / normalized[2].coins) : 0
        tryCombo([q0, q1, q2])
      }
    }
  }

  return best || { totalCoins: 0, totalPrice: 0, purchases: [] }
}
