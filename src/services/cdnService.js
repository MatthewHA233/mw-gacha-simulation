import { CDN_BASE_URL, OSS_BASE_URL } from '../utils/constants'

/**
 * CDN 数据加载服务
 *
 * 资源加载策略：
 * - 配置文件（JSON）：从 OSS_BASE_URL 直连加载（不经过 CDN，实时更新）
 * - 静态资源（图片/音频）：从 CDN_BASE_URL 加载（CDN 加速）
 */

// 缓存已加载的配置，避免重复请求
const configCache = new Map()

// 抽卡类型中英文映射
const GACHA_TYPE_MAP = {
  '筹码类': 'chip',
  '机密货物类': 'cargo',
  '无人机补给类': 'cargo',  // 无人机补给类也使用 cargo 路径
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
    // 配置文件：优先从 OSS 直连加载，fallback 到本地
    const url = OSS_BASE_URL
      ? `${OSS_BASE_URL}/gacha-configs/index.json?t=${Date.now()}`
      : '/gacha-configs/index.json'

    const response = await fetch(url)
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
    // 配置文件：优先从 OSS 直连加载，fallback 到本地
    const url = OSS_BASE_URL
      ? `${OSS_BASE_URL}/gacha-configs/${gachaType}/${activityId}.json?t=${Date.now()}`
      : `/gacha-configs/${gachaType}/${activityId}.json`

    const response = await fetch(url)
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
 * 加载版本历史数据（始终从本地public加载）
 * @returns {Promise<Object>} 版本历史数据
 */
export async function loadVersionHistory() {
  const cacheKey = 'version-history'

  if (configCache.has(cacheKey)) {
    return configCache.get(cacheKey)
  }

  try {
    // 配置文件：优先从 OSS 直连加载，fallback 到本地
    const url = OSS_BASE_URL
      ? `${OSS_BASE_URL}/gacha-configs/version-history.json?t=${Date.now()}`
      : `/gacha-configs/version-history.json?t=${Date.now()}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load version history: ${response.status}`)
    }
    const data = await response.json()
    configCache.set(cacheKey, data)
    return data
  } catch (error) {
    console.error('Error loading version history:', error)
    throw error
  }
}

/**
 * 加载网站信息和赞赏者数据（始终从本地public加载）
 * @returns {Promise<Object>} 网站信息数据
 */
export async function loadSiteInfo() {
  const cacheKey = 'site-info'

  if (configCache.has(cacheKey)) {
    return configCache.get(cacheKey)
  }

  try {
    // 配置文件：优先从 OSS 直连加载，fallback 到本地
    const url = OSS_BASE_URL
      ? `${OSS_BASE_URL}/gacha-configs/site-info.json?t=${Date.now()}`
      : `/gacha-configs/site-info.json?t=${Date.now()}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load site info: ${response.status}`)
    }
    const data = await response.json()
    configCache.set(cacheKey, data)
    return data
  } catch (error) {
    console.error('Error loading site info:', error)
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

  // 机密货物类和无人机补给类使用特殊格式
  if (gachaType === '机密货物类' || gachaType === '无人机补给类') {
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

  // 机密货物类和无人机补给类使用特殊路径
  if (gachaType === '机密货物类' || gachaType === '无人机补给类') {
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

    // 机密货物类/无人机补给类：从 cargos 数组中查找对应货币的图片
    if (currencyId === 'bigevent_currency_gacha_gameplay' || currencyId === 'bigevent_currency_gacha_rm' ||
        currencyId === 'Drone_Fob' || currencyId === 'Authorization_Key') {
      if (activityIdOrConfig?.cargos && Array.isArray(activityIdOrConfig.cargos)) {
        // 根据货币类型确定要查找的 cargo 类型
        let cargoType
        if (currencyId === 'bigevent_currency_gacha_gameplay' || currencyId === 'Drone_Fob') {
          cargoType = 'gameplay'
        } else {
          cargoType = 'rm'
        }
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

  // 优先使用物品自定义的 image 字段（如参赛者徽章等）
  if (item.image) {
    return item.image
  }

  // 特殊情况：货币类物品
  // 1. currency_ 开头：currency_gachacoins（筹码）、currency_premium_lootboxkey（旗舰钥匙）、currency_common_lootboxkey（钥匙）
  // 2. bigevent_currency_ 开头：bigevent_currency_gacha_rm（授权密钥）、bigevent_currency_gacha_gameplay（无人机电池）
  // 3. 无人机补给类货币：Drone_Fob（遥控器）、Authorization_Key（开锁器）
  if (item.id.startsWith('currency_') || item.id.startsWith('bigevent_currency_') ||
      item.id === 'Drone_Fob' || item.id === 'Authorization_Key') {
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

  // 特殊战斗增益：导弹诱饵（在 common-items 目录下）
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
    if (item.type === '战舰' || item.type === '无人潜航器') {
      // 战舰和无人潜航器都使用 units_ships 路径
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

/**
 * 获取本周的周一和周日日期
 * @param {Date} [date=new Date()] - 参考日期，默认为今天
 * @returns {{ monday: Date, sunday: Date }} 本周的周一和周日
 */
function getWeekRange(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() // 0 (周日) 到 6 (周六)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // 调整到周一

  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return { monday, sunday }
}

/**
 * 格式化日期为 YYYYMMDD 格式
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * 格式化年月为 YYYYMM 格式
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的年月字符串
 */
function formatYearMonth(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}${month}`
}

/**
 * 构建 HORIZN 周活跃度 CSV 路径
 * @param {Date} [date=new Date()] - 参考日期，默认为今天
 * @returns {string} 周活跃度 CSV 路径
 */
export function buildHoriznWeeklyCsvPath(date = new Date()) {
  const { monday, sunday } = getWeekRange(date)
  const yearMonth = formatYearMonth(monday) // 使用周一所在的年月
  const mondayStr = formatDate(monday)
  const sundayStr = formatDate(sunday)
  return `horizn/${yearMonth}/weekly_${mondayStr}~${sundayStr}.csv`
}

/**
 * 构建 HORIZN 赛季活跃度 CSV 路径
 * @param {Date} [date=new Date()] - 参考日期，默认为今天
 * @returns {string} 赛季活跃度 CSV 路径
 */
export function buildHoriznSeasonCsvPath(date = new Date()) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const yearMonth = formatYearMonth(d)
  return `horizn/${yearMonth}/season_${year}_${month}.csv`
}
