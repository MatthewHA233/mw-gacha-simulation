'use client'

import { useEffect, useState } from 'react'

/**
 * 顶栏会员王冠的彩蛋档位（2026-10-15）：曾经达成过的最高「万氪之王」里程碑。
 *
 *   0         没达成过 ¥20 万        青铜底的完整王冠
 *   200000    达成过 ¥20 万（伪神）   裂开的王冠
 *   500000    达成过 ¥50 万（半神）   半边点亮的王冠
 *   1000000   达成过 ¥100 万（王）    光芒王冠
 *
 * 只存浏览器本地、不做云端同步；只升不降，重置活动数据 / 版本更新都不清（这是「到过」的纪念）。
 * 由 useMilestoneTracker 在跨过对应里程碑时调用 raiseCrownTier。
 */

const STORAGE_KEY = 'mw_crown_tier'
const CHANGE_EVENT = 'mw-crown-tier'
export const CROWN_TIERS = [0, 200000, 500000, 1000000]

export const CROWN_TIER_NAMES = {
  0: '会员',
  200000: '万氪之王 · 伪神',
  500000: '万氪之王 · 半神',
  1000000: '万氪之王',
}

export function getCrownTier() {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY))
    return CROWN_TIERS.includes(value) ? value : 0
  } catch {
    return 0
  }
}

/** 跨过里程碑时调用：传入这次达成的金额（可以是一批里最大的那个），比现在高才升 */
export function raiseCrownTier(amount) {
  const reached = CROWN_TIERS.filter((tier) => tier > 0 && amount >= tier).pop() || 0
  if (reached <= getCrownTier()) return
  try {
    localStorage.setItem(STORAGE_KEY, String(reached))
  } catch {
    return
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: reached }))
}

/** 当前档位；本页升档（自定义事件）和别的标签页升档（storage 事件）都会刷新 */
export function useCrownTier() {
  const [tier, setTier] = useState(0)
  useEffect(() => {
    const refresh = () => setTier(getCrownTier())
    refresh()
    window.addEventListener(CHANGE_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  return tier
}
