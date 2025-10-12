// 静态资源 CDN 地址（图片、音频等）
export const CDN_BASE_URL = import.meta.env.VITE_CDN_BASE_URL || ''

// 配置文件 OSS 直连地址（JSON 文件，不走 CDN，确保实时更新）
export const OSS_BASE_URL = import.meta.env.VITE_OSS_BASE_URL || ''

// 稀有度配置
export const RARITY_CONFIG = {
  common: {
    name: '普通',
    color: '#9CA3AF', // gray-400
    bgColor: 'from-gray-600 to-gray-800'
  },
  rare: {
    name: '稀有',
    color: '#60A5FA', // blue-400
    bgColor: 'from-blue-600 to-blue-800'
  },
  epic: {
    name: '史诗',
    color: '#A78BFA', // purple-400
    bgColor: 'from-purple-600 to-purple-800'
  },
  legendary: {
    name: '传说',
    color: '#FBBF24', // yellow-400
    bgColor: 'from-yellow-500 to-orange-600'
  }
}

// 抽卡类型
export const GACHA_TYPES = {
  TOKEN: 'chip',      // 筹码类
  CARGO: 'cargo',      // 机密货物类
  FLAGSHIP: 'flagship' // 旗舰宝箱类
}

// 本地存储键名
export const STORAGE_KEYS = {
  GACHA_STATE: 'gacha_state_',           // 抽卡状态（会拼接活动ID）
  DRAW_HISTORY: 'draw_history_',         // 抽卡历史（会拼接活动ID）
  EPIC_LEGENDARY_HISTORY: 'epic_legendary_history_' // 史诗传说历史（会拼接活动ID）
}

// 音效文件名
export const AUDIO_FILES = {
  DRAW: 'Reward_Daily_02_UI.Reward_Daily_02_UI.wav',
  REWARD: 'Reward_Daily_02_UI.Reward_Daily_02_UI.wav',
  FAIL: 'UpgradeFailed_01_UI.UpgradeFailed_01_UI.wav'
}
