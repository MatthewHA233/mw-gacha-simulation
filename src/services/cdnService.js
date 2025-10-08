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
 * 构建活动 Widget 图片 URL
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

  // 其他类型使用默认格式
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
 * @param {string} currencyId - 货币ID（如：currency_gachacoins, currency_premium_lootboxkey）
 * @param {string|Object} activityIdOrConfig - 活动ID 或活动配置对象
 * @returns {string} 货币图标 URL
 */
export function buildCurrencyIconUrl(currencyId, activityIdOrConfig) {
  // 如果传入的是对象
  if (typeof activityIdOrConfig === 'object') {
    // 优先使用 metadata.{currencyId}_image（如：currency_gachacoins_image）
    const imageKey = `${currencyId}_image`
    if (activityIdOrConfig?.metadata?.[imageKey]) {
      return activityIdOrConfig.metadata[imageKey]
    }
    // 其次使用顶层 {currencyId}_image
    if (activityIdOrConfig?.[imageKey]) {
      return activityIdOrConfig[imageKey]
    }
  }
  // 动态生成：{currencyId}_{activityId}.png
  // 例如：currency_gachacoins_ag97.png, currency_premium_lootboxkey_la97.png
  const activityId = typeof activityIdOrConfig === 'string' ? activityIdOrConfig : activityIdOrConfig?.id
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

  // 特殊情况：货币类物品（以 currency_ 开头）
  // 例如：currency_gachacoins（筹码）、currency_premium_lootboxkey（旗舰钥匙）
  if (item.id.startsWith('currency_')) {
    return buildCurrencyIconUrl(item.id, activityIdOrConfig)
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
    } else {
      // 所有武器类型：武器、火箭炮、导弹、攻击机、自卫炮、主炮等
      folder = 'weapons'
    }
    return `${CDN_BASE_URL}/assets/contentseparated_assets_content/textures/sprites/${folder}/${item.id}.png`
  }

  // 普通物品（common）：common-items
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
