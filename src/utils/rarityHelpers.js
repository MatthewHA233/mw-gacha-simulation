/**
 * 稀有度辅助函数
 */

/**
 * 获取稀有度文本
 */
export const getRarityText = (rarity) => {
  const map = {
    common: '普通',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说'
  }
  return map[rarity] || '普通'
}

/**
 * 获取稀有度颜色类
 */
export const getRarityClass = (rarity) => {
  const map = {
    common: 'bg-slate-500/30 text-slate-400',
    rare: 'bg-blue-500/30 text-blue-400',
    epic: 'bg-amber-500/30 text-amber-400',
    legendary: 'bg-purple-500/30 text-purple-400'
  }
  return map[rarity] || map.common
}

/**
 * 获取稀有度背景色类
 */
export const getRarityBgClass = (rarity) => {
  const map = {
    common: 'bg-slate-500',
    rare: 'bg-blue-500',
    epic: 'bg-amber-500',
    legendary: 'bg-purple-500'
  }
  return map[rarity] || map.common
}
