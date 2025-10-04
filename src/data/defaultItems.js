// CDN 基础 URL
const CDN_BASE_URL = 'https://assets.lingflow.cn/mw-gacha-simulation'

// 默认奖品数据
export const defaultItems = [
  // 普通物品
  { name: "2 高级鱼雷诱饵", type: "道具", rarity: "common", probability: 17.00, limit: 0, obtained: 0, icon: `${CDN_BASE_URL}/常驻奖励物品/PremiumTorpedoDecoy.png` },
  { name: "4 艺术硬币", type: "资源", rarity: "common", probability: 22.00, limit: 0, obtained: 0, icon: `${CDN_BASE_URL}/常驻奖励物品/Artstorm.png` },
  { name: "6 高级导弹诱饵", type: "道具", rarity: "common", probability: 12.50, limit: 0, obtained: 0, icon: `${CDN_BASE_URL}/常驻奖励物品/PremiumMissileDecoy.png` },
  { name: "10 艺术硬币", type: "资源", rarity: "common", probability: 8.00, limit: 0, obtained: 0, icon: `${CDN_BASE_URL}/常驻奖励物品/Artstorm.png` },
  { name: "1 筹码", type: "资源", rarity: "common", probability: 4.00, limit: 0, obtained: 0, icon: `${CDN_BASE_URL}/10月月头筹码抽奖暗影交易/货币/currency_gachacoins_ag97.png` },
  { name: "15 黄金", type: "资源", rarity: "common", probability: 33.00, limit: 0, obtained: 0, icon: `${CDN_BASE_URL}/常驻奖励物品/Hard.png` },

  // 史诗物品
  { name: "FREMM-EVO", type: "舰船", rarity: "epic", probability: 0.08, limit: 1, obtained: 0, tier: 3, icon: `${CDN_BASE_URL}/10月月头筹码抽奖暗影交易/抽奖界面/活动奖励物品/FREMMEVO.png` },
  { name: "RBU-10000", type: "武器", rarity: "epic", probability: 1.53, limit: 1, obtained: 0, tier: 3, icon: `${CDN_BASE_URL}/10月月头筹码抽奖暗影交易/抽奖界面/活动奖励物品/RBU10000.png` },
  { name: "萨克森(F124)", type: "舰船", rarity: "epic", probability: 0.14, limit: 1, obtained: 0, tier: 3, icon: `${CDN_BASE_URL}/10月月头筹码抽奖暗影交易/抽奖界面/活动奖励物品/F124.png` },

  // 传奇物品
  { name: "衣阿华", type: "舰船", rarity: "legendary", probability: 0.09, limit: 1, obtained: 0, tier: 3, icon: `${CDN_BASE_URL}/10月月头筹码抽奖暗影交易/抽奖界面/活动奖励物品/Iowa.png` },
  { name: "MARK-71", type: "武器", rarity: "legendary", probability: 0.52, limit: 2, obtained: 0, tier: 3, icon: `${CDN_BASE_URL}/10月月头筹码抽奖暗影交易/抽奖界面/活动奖励物品/Mark71.png` },
  { name: "MARK-45 阿斯托尔", type: "武器", rarity: "legendary", probability: 0.23, limit: 2, obtained: 0, tier: 3, icon: `${CDN_BASE_URL}/10月月头筹码抽奖暗影交易/抽奖界面/活动奖励物品/Mark45Astor.png` },
  { name: "ASN4G", type: "武器", rarity: "legendary", probability: 0.35, limit: 2, obtained: 0, tier: 3, icon: `${CDN_BASE_URL}/10月月头筹码抽奖暗影交易/抽奖界面/活动奖励物品/ASN4G.png` },
  { name: "龟船", type: "皮肤", rarity: "legendary", probability: 0.50, limit: 1, obtained: 0, icon: `${CDN_BASE_URL}/10月月头筹码抽奖暗影交易/抽奖界面/活动奖励物品/GEOBUKSEON.png` },
];
