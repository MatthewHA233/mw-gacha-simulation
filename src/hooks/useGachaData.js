'use client'

import { useState, useEffect } from 'react'
import { loadActivityConfig } from '../services/cdnService'
import { STORAGE_KEYS } from '../utils/constants'

/**
 * 抽卡数据 Hook
 * 加载活动配置并管理游戏状态
 * @param {string} type - 抽卡类型 (chip/cargo/flagship)
 * @param {string} activityId - 活动ID
 * @returns {Object} { config, gameState, setGameState, loading, error }
 */
export function useGachaData(type, activityId) {
  const [config, setConfig] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true)
        const data = await loadActivityConfig(type, activityId)
        setConfig(data)

        // 从 localStorage 加载游戏状态，或初始化新状态
        const storageKey = `${STORAGE_KEYS.GACHA_STATE}${activityId}`
        const savedState = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null

        if (savedState) {
          setGameState(JSON.parse(savedState))
        } else {
          // 初始化新游戏状态
          const initialState = {
            currency: data.currency.initialAmount,
            currencyName: data.currency.name,
            rmb: -25, // 默认欠费 25 元
            singleCost: data.currency.singleDrawCost,
            multiCost: data.currency.multiDrawCost,
            multiCount: data.currency.multiDrawCount,
            totalDraws: 0,
            epicGuaranteeCounter: 0,
            legendaryGuaranteeCounter: 0,
            obtainedItems: {}, // { itemId: count }
            items: data.items.map(item => ({
              ...item,
              obtained: 0
            }))
          }
          setGameState(initialState)
        }

        setError(null)
      } catch (err) {
        console.error(`Failed to load gacha config (${type}/${activityId}):`, err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (type && activityId) {
      fetchConfig()
    }
  }, [type, activityId])

  // 保存游戏状态到 localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (gameState && activityId) {
      const storageKey = `${STORAGE_KEYS.GACHA_STATE}${activityId}`
      localStorage.setItem(storageKey, JSON.stringify(gameState))
    }
  }, [gameState, activityId])

  return { config, gameState, setGameState, loading, error }
}
