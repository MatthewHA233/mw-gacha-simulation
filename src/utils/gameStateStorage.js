/**
 * 游戏状态存储工具
 * 为每个活动独立存储数据
 */

import { APP_VERSION } from './version'

const STORAGE_KEY_PREFIX = 'mw_gacha_state_'
const VERSION_KEY = 'mw_gacha_app_version'

/**
 * 获取活动的存储键
 */
function getStorageKey(activityId) {
  return `${STORAGE_KEY_PREFIX}${activityId}`
}

/**
 * 获取活动的初始状态
 * @param {string} gachaType - 抽卡类型：'筹码类' 或 '旗舰宝箱类' 或 '机密货物类'
 */
export function getDefaultGameState(gachaType = '筹码类') {
  if (gachaType === '旗舰宝箱类') {
    return {
      currency: 30,
      currencyName: "旗舰钥匙",
      commonCurrency: 0, // 普通宝箱钥匙（初始为0）
      rmb: -25,
      singleCost: 10,
      // 旗舰宝箱数据
      totalDraws: 0,
      legendaryCount: 0,
      epicCount: 0,
      rareCount: 0,
      history: [],
      epicLegendaryHistory: [],
      items: [],
      // 普通宝箱数据（使用 _else 尾缀）
      totalDraws_else: 0,
      legendaryCount_else: 0,
      epicCount_else: 0,
      rareCount_else: 0,
      history_else: [],
      epicLegendaryHistory_else: [],
      items_else: []
    }
  }

  if (gachaType === '机密货物类') {
    return {
      currency: 70, // 授权密钥（对应机密货物 rm）
      currencyName: "授权密钥",
      commonCurrency: 3000, // 无人机电池（对应货运无人机 gameplay）
      commonCurrencyName: "无人机电池",
      rmb: -25,
      singleCost: 1, // 授权密钥每抽消耗1
      singleCost_else: 30, // 无人机电池每抽消耗30
      // 机密货物数据（rm）
      totalDraws: 0,
      legendaryCount: 0,
      epicCount: 0,
      rareCount: 0,
      history: [],
      epicLegendaryHistory: [],
      items: [],
      guaranteeCounter: 0, // 机密货物保底计数器（1150抽保底）
      // 货运无人机数据（gameplay，使用 _else 尾缀）
      totalDraws_else: 0,
      legendaryCount_else: 0,
      epicCount_else: 0,
      rareCount_else: 0,
      history_else: [],
      epicLegendaryHistory_else: [],
      items_else: [],
      guaranteeCounter_else: 0 // 货运无人机保底计数器（950抽保底）
    }
  }

  // 筹码类默认
  return {
    currency: 40,
    currencyName: "筹码",
    rmb: -25,
    singleCost: 1,
    totalDraws: 0,
    legendaryCount: 0,
    epicCount: 0,
    rareCount: 0,
    history: [],
    epicLegendaryHistory: [],
    items: []
  }
}

/**
 * 从 localStorage 加载活动状态
 * @param {string} activityId - 活动ID
 * @returns {Object|null} 活动状态，如果不存在返回null
 */
export function loadGameState(activityId) {
  try {
    const key = getStorageKey(activityId)
    const data = localStorage.getItem(key)
    if (data) {
      return JSON.parse(data)
    }
    return null
  } catch (error) {
    console.error(`Failed to load game state for ${activityId}:`, error)
    return null
  }
}

/**
 * 保存活动状态到 localStorage
 * @param {string} activityId - 活动ID
 * @param {Object} gameState - 游戏状态
 */
export function saveGameState(activityId, gameState) {
  try {
    const key = getStorageKey(activityId)
    localStorage.setItem(key, JSON.stringify(gameState))
  } catch (error) {
    console.error(`Failed to save game state for ${activityId}:`, error)
  }
}

/**
 * 清除活动状态
 * @param {string} activityId - 活动ID
 */
export function clearGameState(activityId) {
  try {
    const key = getStorageKey(activityId)
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`Failed to clear game state for ${activityId}:`, error)
  }
}

/**
 * 清除所有活动状态
 */
export function clearAllGameStates() {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.error('Failed to clear all game states:', error)
  }
}

/**
 * 获取当前存储的应用版本号
 */
export function getStoredVersion() {
  try {
    return localStorage.getItem(VERSION_KEY)
  } catch (error) {
    console.error('Failed to get stored version:', error)
    return null
  }
}

/**
 * 保存应用版本号
 */
export function saveVersion(version) {
  try {
    localStorage.setItem(VERSION_KEY, version)
  } catch (error) {
    console.error('Failed to save version:', error)
  }
}

/**
 * 检查版本并在需要时强制重置所有数据
 * 每次推送更新版本号后，用户首次访问会触发重置
 *
 * @returns {Object|null} 如果执行了重置，返回 { wasReset: true, newVersion: string, oldVersion: string }，否则返回 null
 */
export function checkAndResetIfNeeded() {
  try {
    const storedVersion = getStoredVersion()

    // 如果版本不匹配，执行强制重置
    if (storedVersion !== APP_VERSION) {
      console.log(`版本更新检测: ${storedVersion || '初次访问'} -> ${APP_VERSION}`)
      console.log('执行数据重置...')

      // 清除所有游戏数据
      clearAllGameStates()

      // 清除氪金里程碑记录
      const milestoneKey = 'mw_gacha_milestones'
      localStorage.removeItem(milestoneKey)

      // 清除音乐播放状态
      const musicKey = 'musicPlayback'
      localStorage.removeItem(musicKey)

      // 更新版本号
      saveVersion(APP_VERSION)

      console.log('数据重置完成')

      // 设置一个临时标记，用于显示 Toast
      sessionStorage.setItem('mw_gacha_version_updated', JSON.stringify({
        newVersion: APP_VERSION,
        oldVersion: storedVersion || '初次访问'
      }))

      return {
        wasReset: true,
        newVersion: APP_VERSION,
        oldVersion: storedVersion || '初次访问'
      }
    }

    console.log(`当前版本: ${APP_VERSION}（无需重置）`)
    return null
  } catch (error) {
    console.error('版本检查失败:', error)
    return null
  }
}
