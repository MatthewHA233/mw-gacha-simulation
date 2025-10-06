/**
 * 游戏状态存储工具
 * 为每个活动独立存储数据
 */

const STORAGE_KEY_PREFIX = 'mw_gacha_state_'

/**
 * 获取活动的存储键
 */
function getStorageKey(activityId) {
  return `${STORAGE_KEY_PREFIX}${activityId}`
}

/**
 * 获取活动的初始状态
 */
export function getDefaultGameState() {
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
