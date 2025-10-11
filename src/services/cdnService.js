import { CDN_BASE_URL } from '../utils/constants'

/**
 * CDN 数据加载服务
 */

// 缓存已加载的配置，避免重复请求
const configCache = new Map()

// 抽卡类型中英文映射
const GACHA_TYPE_MAP = {
  '筹码类': 'chip',
  '机密货物类': 'cargo',
  '旗舰宝箱类': 'flagship'
}

/**
 * 将中文抽卡类型转换为英文路径
 */
export function getGachaTypePath(gachaType) {
  return GACHA_TYPE_MAP[gachaType] || 'chip'
}

/**
 * 加载活动索引列表（始终从本地public加载）
 * @returns {Promise<Object>} 活动索引数据
 */
export async function loadActivityIndex() {
  const cacheKey = 'index'

  if (configCache.has(cacheKey)) {
    return configCache.get(cacheKey)
  }

  try {
    // 配置文件始终从本地public加载
    const response = await fetch('/gacha-configs/index.json')
    if (!response.ok) {
      throw new Error(`Failed to load activity index: ${response.status}`)
    }
    const data = await response.json()
    configCache.set(cacheKey, data)
    return data
  } catch (error) {
    console.error('Error loading activity index:', error)
    throw error
  }
}

/**
 * 加载单个活动配置（始终从本地public加载）
 * @param {string} gachaType - 抽卡类型 (chip/cargo/flagship)
 * @param {string} activityId - 活动ID
 * @returns {Promise<Object>} 活动配置数据
 */
export async function loadActivityConfig(gachaType, activityId) {
  const cacheKey = `${gachaType}-${activityId}`

  if (configCache.has(cacheKey)) {
    return configCache.get(cacheKey)
  }

  try {
    // 配置文件始终从本地public加载
    const response = await fetch(`/gacha-configs/${gachaType}/${activityId}.json`)
    if (!response.ok) {
      throw new Error(`Failed to load activity config: ${response.status}`)
    }
    const data = await response.json()
    configCache.set(cacheKey, data)
    return data
  } catch (error) {
    console.error(`Error loading activity config (${gachaType}/${activityId}):`, error)
    throw error
  }
}

/**
 * 构建活动配置文件 URL
 * @param {string} gachaType - 抽卡类型 (筹码类/机密货物类/旗舰宝箱类)
 * @param {string} activityId - 活动ID
 */
export function buildConfigUrl(gachaType, activityId) {
  const typePath = getGachaTypePath(gachaType)
  return `${CDN_BASE_URL}/gacha-configs/${typePath}/${activityId}.json`
}

/**
 * 构建活动 Widget 图片 URL（侧边栏预览图）
 * @param {string|Object} activityIdOrConfig - 活动ID 或活动配置对象
 * @returns {string} Widget 图片 URL
 */
export function buildWidgetUrl(activityIdOrConfig) {
  // 如果传入的是对象
  if (typeof activityIdOrConfig === 'object') {
    // 优先使用 metadata.image
    if (activityIdOrConfig?.metadata?.image) {
      return activityIdOrConfig.metadata.image
    }
    // 其次使用顶层 image
    if (activityIdOrConfig?.image) {
      return activityIdOrConfig.image
    }
  }
  // 否则使用动态路由
  const activityId = typeof activityIdOrConfig === 'string' ? activityIdOrConfig : activityIdOrConfig?.id
  const gachaType = activityIdOrConfig?.gacha_type

  // 旗舰宝箱类使用特殊格式
  if (gachaType === '旗舰宝箱类') {
    return `${CDN_BASE_URL}/assets/contentseparated_assets_activities/lootbox_activity_${activityId}_widget.png`
  }

  // 机密货物类使用特殊格式
  if (gachaType === '机密货物类') {
    return `${CDN_BASE_URL}/assets/contentseparated_assets_ui_eventhub/event_${activityId}_widget.png`
  }

  // 筹码类使用默认格式
  return `${CDN_BASE_URL}/assets/contentseparated_assets_activities/activity_gacha_${activityId}_widget.png`
}

/**
 * 构建活动背景图片 URL
 * @param {string|Object} activityIdOrConfig - 活动ID 或活动配置对象
 * @returns {string} 背景图片 URL
 */
export function buildBackgroundUrl(activityIdOrConfig) {
  // 如果传入的是对象
  if (typeof activityIdOrConfig === 'object') {
    // 优先使用 metadata.image
    if (activityIdOrConfig?.metadata?.image) {
      return activityIdOrConfig.metadata.image
    }
    // 其次使用顶层 image
    if (activityIdOrConfig?.image) {
      return activityIdOrConfig.image
    }
  }
  // 否则使用动态路由
  const activityId = typeof activityIdOrConfig === 'string' ? activityIdOrConfig : activityIdOrConfig?.id
  const gachaType = activityIdOrConfig?.gacha_type

  // 机密货物类使用特殊路径
  if (gachaType === '机密货物类') {
    return `${CDN_BASE_URL}/assets/contentseparated_assets_ui_eventhub/event_${activityId}_background.png`
  }

  // 其他类型使用默认路径
  return `${CDN_BASE_URL}/assets/contentseparated_assets_activities/activity_gacha_${activityId}_background.png`
}

/**
 * 构建信息弹窗背景图片 URL
 * @param {string} activityId - 活动ID
 */
export function buildInfoBackgroundUrl(activityId) {
  return `${CDN_BASE_URL}/assets/contentseparated_assets_offers/eventgachaoffer_${activityId}_limited_background.png`
}

/**
 * 构建结果弹窗背景图片 URL
 * @param {string} activityId - 活动ID
 */
export function buildResultBackgroundUrl(activityId) {
  return `${CDN_BASE_URL}/assets/contentseparated_assets_activities/activity_gacha_${activityId}_widget.png`
}

/**
 * 构建货币图标 URL
 * @param {string} currencyId - 货币ID（如：currency_gachacoins, currency_premium_lootboxkey, bigevent_currency_gacha_gameplay, bigevent_currency_gacha_rm）
 * @param {string|Object} activityIdOrConfig - 活动ID 或活动配置对象
 * @returns {string} 货币图标 URL
 */
export function buildCurrencyIconUrl(currencyId, activityIdOrConfig) {
  // 如果传入的是对象
  if (typeof activityIdOrConfig === 'object') {
    const imageKey = `${currencyId}_image`

    // 机密货物类：从 cargos 数组中查找对应货币的图片
    if (currencyId === 'bigevent_currency_gacha_gameplay' || currencyId === 'bigevent_currency_gacha_rm') {
      if (activityIdOrConfig?.cargos && Array.isArray(activityIdOrConfig.cargos)) {
        // 根据货币类型确定要查找的 cargo 类型
        const cargoType = currencyId === 'bigevent_currency_gacha_gameplay' ? 'gameplay' : 'rm'
        // 在 cargos 数组中查找对应类型的 cargo
        const cargo = activityIdOrConfig.cargos.find(c => c.type === cargoType)
        // 如果找到且有自定义图片，使用自定义图片
        if (cargo?.metadata?.[imageKey]) {
          return cargo.metadata[imageKey]
        }
      }
    }

    // 筹码类/旗舰宝箱类：优先使用 metadata.{currencyId}_image
    if (activityIdOrConfig?.metadata?.[imageKey]) {
      return activityIdOrConfig.metadata[imageKey]
    }
    // 其次使用顶层 {currencyId}_image
    if (activityIdOrConfig?.[imageKey]) {
      return activityIdOrConfig[imageKey]
    }
  }

  const activityId = typeof activityIdOrConfig === 'string' ? activityIdOrConfig : activityIdOrConfig?.id

  // 机密货物类专用货币：bigevent_currency_gacha_gameplay（无人机电池）、bigevent_currency_gacha_rm（授权密钥）
  // 格式：bigevent_currency_gacha_gameplay_{id}.png、bigevent_currency_gacha_rm_{id}.png
  if (currencyId === 'bigevent_currency_gacha_gameplay' || currencyId === 'bigevent_currency_gacha_rm') {
    return `${CDN_BASE_URL}/assets/contentseparated_assets_content/textures/sprites/currency/${currencyId}_${activityId}.png`
  }

  // 其他货币类型：currency_gachacoins, currency_premium_lootboxkey 等
  // 动态生成：{currencyId}_{activityId}.png
  return `${CDN_BASE_URL}/assets/contentseparated_assets_content/textures/sprites/currency/${currencyId}_${activityId}.png`
}

/**
 * 构建商店套餐图片 URL
 * @param {string} activityId - 活动ID
 * @param {number} packageId - 套餐ID (1, 2, 3, 4)
 */
export function buildShopPackageUrl(activityId, packageId) {
  // 注意：文件名是 _2, _3, _4, _5，所以需要 +1
  return `${CDN_BASE_URL}/assets/contentseparated_assets_offers/eventgachaoffer_${activityId}_${packageId + 1}_thumbnail.png`
}

/**
 * 构建物品图片 URL
 * @param {Object} item - 物品对象，包含 type, id, rarity 等字段
 * @param {string|Object} activityIdOrConfig - 活动ID 或活动配置对象（用于货币图标）
 * @returns {string|null} 物品图片 URL
 */
export function buildItemImageUrl(item, activityIdOrConfig) {
  if (!item.id) return null

  // 特殊情况：货币类物品
  // 1. currency_ 开头：currency_gachacoins（筹码）、currency_premium_lootboxkey（旗舰钥匙）、currency_common_lootboxkey（钥匙）
  // 2. bigevent_currency_ 开头：bigevent_currency_gacha_rm（授权密钥）、bigevent_currency_gacha_gameplay（无人机电池）
  if (item.id.startsWith('currency_') || item.id.startsWith('bigevent_currency_')) {
    return buildCurrencyIconUrl(item.id, activityIdOrConfig)
  }

  // 特殊资源：美金和升级芯片（在 currency 目录下，但不需要 activityId 后缀）
  if (item.id === 'Soft') {
    // 美金
    return `${CDN_BASE_URL}/assets/contentseparated_assets_content/textures/sprites/currency/Soft.png`
  }
  if (item.id === 'Upgrades') {
    // 升级芯片
    return `${CDN_BASE_URL}/assets/contentseparated_assets_content/textures/sprites/currency/Upgrades.png`
  }

  // 特殊道具：导弹诱饵（在 common-items 目录下）
  if (item.id === 'MissileDecoy') {
    return `${CDN_BASE_URL}/assets/common-items/MissileDecoy.png`
  }

  // 提取 activityId（用于其他类型的动态路径）
  const activityId = typeof activityIdOrConfig === 'string'
    ? activityIdOrConfig
    : activityIdOrConfig?.id

  // 史诗/传说物品：根据 type 和 id 动态生成
  if (item.rarity === 'epic' || item.rarity === 'legendary') {
    let folder
    if (item.type === '战舰') {
      folder = 'units_ships'
    } else if (item.type === '涂装') {
      folder = 'camouflages'
    } else if (item.type === '头像') {
      folder = 'avataricons'
    } else if (item.type === '旗帜') {
      folder = 'flags'
    } else if (item.type === '头衔') {
      // 称号特殊：使用稀有度而非id作为文件名
      // 格式：TitleIcon_Legendary.png 或 TitleIcon_Epic.png
      const rarityCapitalized = item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)
      return `${CDN_BASE_URL}/assets/contentseparated_assets_content/textures/sprites/titles/TitleIcon_${rarityCapitalized}.png`
    } else {
      // 所有武器类型：武器、火箭炮、导弹、攻击机、自卫炮、主炮等
      folder = 'weapons'
    }
    return `${CDN_BASE_URL}/assets/contentseparated_assets_content/textures/sprites/${folder}/${item.id}.png`
  }

  // 普通物品（common）：common-items
  // 包括：艺术硬币(Artstorm)、黄金(Hard)、修理包(RepairKit)等
  if (item.rarity === 'common') {
    return `${CDN_BASE_URL}/assets/common-items/${item.id}.png`
  }

  return null
}

/**
 * 预加载图片
 * @param {string[]} urls - 图片 URL 数组
 * @returns {Promise<void[]>}
 */
export function preloadImages(urls) {
  return Promise.all(
    urls.map(url => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(url)
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
        img.src = url
      })
    })
  )
}

/**
 * 清除配置缓存
 * @param {string} [key] - 可选，指定清除某个缓存键，不传则清除全部
 */
export function clearConfigCache(key) {
  if (key) {
    configCache.delete(key)
  } else {
    configCache.clear()
  }
}

/**
 * 构建机密货物类奖池配图 URL
 * @param {string} activityId - 活动ID
 * @param {number} poolIndex - 奖池索引（1: 货运无人机奖池, 2: 机密货物奖池）
 * @returns {string} 奖池配图 URL
 */
export function buildCargoPoolImageUrl(activityId, poolIndex) {
  // 货运无人机奖池：event_{id}_gacha1.png
  // 机密货物奖池：event_{id}_gacha2.png
  return `${CDN_BASE_URL}/assets/contentseparated_assets_ui_eventhub/event_${activityId}_gacha${poolIndex}.png`
}

/**
 * 构建宝箱票图片 URL
 * @param {string} type - 宝箱类型 ('common' | 'ad' | 'event_common' | 'event_premium')
 * @param {string} activityId - 活动ID（仅event类型需要）
 * @returns {string} 宝箱票图片 URL
 */
export function buildLootboxTicketUrl(type, activityId = null) {
  const basePath = `${CDN_BASE_URL}/assets/contentseparated_assets_assets/content/textures/sprites/lootboxtickets`

  switch (type) {
    case 'common':
      return `${basePath}/common_lootbox_ticket.png`
    case 'ad':
      return `${basePath}/ad_lootbox_ticket.png`
    case 'event_common':
      return `${basePath}/${activityId}_common_lootbox_ticket.png`
    case 'event_premium':
      return `${basePath}/${activityId}_premium_lootbox_ticket.png`
    default:
      return `${basePath}/common_lootbox_ticket.png`
  }
}
