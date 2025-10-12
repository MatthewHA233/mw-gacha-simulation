/**
 * 应用版本配置
 * 每次推送更新时，修改 APP_VERSION 即可触发所有用户强制重置数据
 *
 * 版本号格式：语义化版本（Semantic Versioning）
 * MAJOR.MINOR.PATCH
 *
 * 版本号规则：
 * - MAJOR: 重大架构变更（如 1.0.0 的架构重构）
 * - MINOR: 新的整体组件化系统上线（旗舰宝箱、机密货物）
 * - PATCH: 功能优化、Bug修复、UI改进、延伸功能（如无人机补给）
 */

export const APP_VERSION = '1.2.6'

/**
 * 网站声明
 */
export const SITE_INFO = {
  name: '现代战舰抽奖模拟器',
  nameEn: 'Modern Warships Gacha Simulator',
  description: '非官方抽奖模拟器，仅供娱乐参考',
  author: 'CHanGO',
  github: 'https://github.com/MatthewHA233/mw-gacha-simulation',
  startDate: '2025-10-04',
  currentVersion: APP_VERSION,

  disclaimer: [
    '本网站为非官方的现代战舰抽奖模拟器，仅供娱乐和参考使用',
    '所有游戏数据、图片资源版权归原游戏开发商所有',
    '本站不提供任何游戏充值、交易等服务',
    '模拟器仅基于公开的游戏数据进行概率模拟，结果仅供参考',
    '请理性娱乐，合理消费'
  ],

  credits: {
    gameDeveloper: 'Artstorm FZE, Cube Software',
    dataSource: {
      name: 'https://mwstats.info/',
      url: 'https://mwstats.info/'
    },
    techStack: 'React, Vite, TailwindCSS, Framer Motion',
    hosting: 'Vercel',
    cdn: '阿里云 OSS'
  },

  // 赞赏者名单
  sponsors: [
    // 格式：{ name: '赞赏者昵称', amount: 金额（可选）, date: '日期（可选）' }
    // 示例：
  { name: '**楠', amount: 1, date: '2025-10-06' },
  { name: '*澍', amount: 0.91, date: '2025-10-06' },
  { name: '*骞', amount: 1, date: '2025-10-06' },
  { name: '**然', amount: 20, date: '2025-10-06' },
  { name: '**恩', amount: 10, date: '2025-10-06' },
  { name: '**熙', amount: 1.14, date: '2025-10-07' },
  { name: '**明', amount: 5, date: '2025-10-11' }
  ],

  contact: {
    github: 'https://github.com/MatthewHA233',
    email: 'issues@github' // 通过GitHub Issues联系
  }
}

/**
 * 版本号规则说明
 */
export const VERSION_RULES = {
  major: {
    label: 'MAJOR',
    description: '重大架构变更',
    example: '1.0.0',
    color: '#ef4444' // red-500
  },
  minor: {
    label: 'MINOR',
    description: '新的整体组件化系统上线',
    example: '1.1.0, 1.2.0',
    color: '#3b82f6' // blue-500
  },
  patch: {
    label: 'PATCH',
    description: '功能优化、Bug修复、延伸功能',
    example: '1.2.6',
    color: '#10b981' // green-500
  }
}

/**
 * 版本详细信息
 * 包含每个版本的git提交、更新内容等完整信息
 */
export const VERSION_DETAILS = [
  // ==================== v1.2.x - 机密货物类组件系统时代 ====================
  {
    version: '1.2.6',
    date: '2025-10-12',
    type: 'patch',
    milestone: false,
    theme: '版本控制系统与Toast通知',
    commits: [
      { hash: '0d32829', message: 'feat: 添加版本控制系统与Toast通知，修复手机端双Toast问题' }
    ],
    features: [
      '新增版本控制系统（语义化版本号）',
      '版本更新Toast通知功能',
      '修复手机端双Toast显示问题',
      '移除MilestoneToast双重定位',
      '整理完整版本历史记录'
    ]
  },
  {
    version: '1.2.5',
    date: '2025-10-12',
    type: 'patch',
    milestone: false,
    theme: '无人机补给类（机密货物延伸）',
    commits: [
      { hash: '4798cca', message: '新增无人机补给类配置文件' },
      { hash: '487efd5', message: '扩展cdnService支持无人机补给类' },
      { hash: '227b29c', message: '更新活动索引添加5个无人机补给类活动' },
      { hash: '4564724', message: 'CargoGacha组件支持无人机补给类文案动态化' },
      { hash: '3e2da85', message: 'Header组件支持无人机补给类货币显示' },
      { hash: 'b8ddddd', message: 'ShopModal组件支持无人机补给类商店文案' }
    ],
    features: [
      '基于机密货物类的延伸功能',
      '新增5个无人机补给类活动配置',
      '动态化文案支持',
      '货币显示扩展'
    ]
  },
  {
    version: '1.2.4',
    date: '2025-10-12',
    type: 'patch',
    milestone: false,
    theme: 'Bug修复',
    commits: [
      { hash: 'c672db5', message: '修复cargo gameplay货币消耗倍率' },
      { hash: '3b4184c', message: '优化cargo gameplay货币不足提示和默认值' }
    ],
    features: [
      '修复货币消耗倍率计算错误',
      '优化货币不足提示',
      '调整默认值'
    ]
  },
  {
    version: '1.2.3',
    date: '2025-10-12',
    type: 'patch',
    milestone: false,
    theme: '机密货物类完善',
    commits: [
      { hash: '8f1cc68', message: '为机密货物类抽奖添加保底机制' },
      { hash: '98e714c', message: '机密货物类界面全面响应式设计优化' },
      { hash: '64e9e60', message: '改进物品提示框：所有物品都支持悬浮显示详情' },
      { hash: '92cc2b5', message: '修复商店弹窗手机端无法点击空白区域关闭的问题' },
      { hash: '4474c31', message: '优化主页重定向：自动加载index.json第一个活动' },
      { hash: 'e8bd79f', message: '修复重定向问题' },
      { hash: '86703c9', message: '更新主页重定向和武库舰抽奖所在位置' },
      { hash: '003093f', message: '调整旗舰宝箱类日常任务奖励数量' }
    ],
    features: [
      '保底机制实现（1150抽/950抽）',
      '全面响应式设计优化',
      '物品提示框改进',
      '商店弹窗移动端交互修复',
      '主页重定向优化'
    ]
  },
  {
    version: '1.2.2',
    date: '2025-10-11',
    type: 'patch',
    milestone: false,
    theme: '机密货物类优化',
    commits: [
      { hash: '73fed27', message: '英文名字补充' },
      { hash: 'f643353', message: '变更主题音乐' },
      { hash: 'ac3f0ef', message: 'be97英文名补充' },
      { hash: '09bfb7b', message: '替换道具为战斗增益' },
      { hash: '2f921c8', message: 'style: refine cargo gacha tabs and grid scale' },
      { hash: '9cd3a8a', message: 'feat: improve cargo gacha responsive layout' }
    ],
    features: [
      '主题音乐变更',
      'UI调整（标签页、网格缩放）',
      '英文名称补充',
      '术语规范化（道具→战斗增益）'
    ]
  },
  {
    version: '1.2.1',
    date: '2025-10-11',
    type: 'patch',
    milestone: false,
    theme: '机密货物类CDN支持、配置文件、UI组件集成',
    commits: [
      { hash: 'fc56bc5', message: 'feat: GachaPage集成机密货物类抽卡' },
      { hash: 'a560830', message: 'feat: 改进确认操作的音效反馈' },
      { hash: 'cd072cd', message: 'feat: UI组件支持机密货物类' },
      { hash: 'c107d93', message: 'feat: 核心服务支持机密货物类' },
      { hash: '3536d18', message: 'feat: 添加机密货物类配置文件' },
      { hash: '65455f9', message: 'feat: 添加机密货物类活动索引' },
      { hash: 'f43ce69', message: 'feat: 添加机密货物类CDN支持，更新开发历程文档' }
    ],
    features: [
      'CDN服务扩展',
      '配置文件与活动索引',
      'UI组件集成',
      '核心服务支持',
      '音效反馈改进'
    ]
  },
  {
    version: '1.2.0',
    date: '2025-10-11',
    type: 'minor',
    milestone: true,
    theme: '新组件系统上线 - 机密货物类抽卡（双奖池架构）',
    commits: [
      { hash: '734c310', message: 'feat: 实现机密货物类抽卡系统' }
    ],
    features: [
      '全新的机密货物类双奖池组件系统',
      '授权密钥（rm）+ 无人机电池（gameplay）独立奖池',
      '双货币系统',
      '保底机制框架'
    ]
  },

  // ==================== v1.1.x - 旗舰宝箱类组件系统时代 ====================
  {
    version: '1.1.9',
    date: '2025-10-10',
    type: 'patch',
    milestone: false,
    theme: '氪金里程碑Toast通知系统',
    commits: [
      { hash: 'a33f39d', message: 'feat: 添加氪金里程碑Toast通知系统' }
    ],
    features: [
      '24个氪金里程碑配置',
      'Steam风格Toast通知',
      '自动追踪氪金总额',
      '多Toast堆叠显示'
    ]
  },
  {
    version: '1.1.8',
    date: '2025-10-09',
    type: 'patch',
    milestone: false,
    theme: '交互增强',
    commits: [
      { hash: '486587d', message: 'feat: 主页新增武库舰抽奖入口按钮' },
      { hash: 'b37f318', message: 'feat: 双击快进功能与旗舰宝箱音效修复' },
      { hash: 'a4c95cc', message: 'feat: 智能双击快进功能 - 仅在剩余稀有物品≤1时启用' },
      { hash: '401e8c7', message: 'fix: 修复双击快进触发条件 - 改为检查奖池剩余限定物品' }
    ],
    features: [
      '武库舰抽奖入口',
      '智能双击快进功能',
      '旗舰宝箱音效修复'
    ]
  },
  {
    version: '1.1.7',
    date: '2025-10-09',
    type: 'patch',
    milestone: false,
    theme: '旗舰宝箱UI优化',
    commits: [
      { hash: 'fbefcd4', message: 'feat: 新增旗舰宝箱物品展示栏组件与滚动条样式' },
      { hash: '0e1eec3', message: 'feat: 旗舰宝箱界面移动端响应式布局优化' },
      { hash: 'd1e765f', message: 'feat: SquareItem 新增限量物品完成状态显示' },
      { hash: '9d137aa', message: 'feat: 商店弹窗新增价格参考来源信息' }
    ],
    features: [
      '物品展示栏组件',
      '移动端响应式优化',
      '限量物品状态显示',
      '商店弹窗价格来源'
    ]
  },
  {
    version: '1.1.6',
    date: '2025-10-09',
    type: 'patch',
    milestone: false,
    theme: '音效系统重构',
    commits: [
      { hash: '51325b3', message: 'refactor: 重构 useSound Hook 返回结构化音效函数' },
      { hash: 'd554406', message: 'feat: Sidebar 音乐播放器增强与状态持久化' },
      { hash: '840c8df', message: 'feat: 为所有交互按钮添加音效反馈' },
      { hash: 'ed0ad6a', message: 'fix: 修复抽卡组件中 useSound 解构调用问题' }
    ],
    features: [
      'useSound Hook结构化重构',
      '音乐播放器增强',
      '全局音效反馈',
      '代码清理'
    ]
  },
  {
    version: '1.1.5',
    date: '2025-10-09',
    type: 'patch',
    milestone: false,
    theme: '旗舰宝箱组件重构',
    commits: [
      { hash: '49d8f49', message: 'feat: 实现旗舰宝箱类抽卡系统（双奖池架构）' },
      { hash: '3f0e42f', message: 'refactor: GachaPage 支持统一 Header 和旗舰宝箱类路由' },
      { hash: '114e461', message: 'refactor: ChipGacha 组件解耦顶部栏，实现数据单向流动' },
      { hash: '012c769', message: 'feat: 增强 ShopModal 支持双模式和玻璃拟态调节按钮' },
      { hash: '7649e68', message: 'feat: 增强 Header 组件支持多种资源显示和双奖池聚合' },
      { hash: '882b67b', message: 'refactor: 提取通用 ResultModal 到 ui 目录实现跨组件复用' }
    ],
    features: [
      'Header组件解耦',
      'ShopModal双模式支持',
      'ResultModal组件复用',
      '物品展示组件增强',
      '数据流重构'
    ]
  },
  {
    version: '1.1.4',
    date: '2025-10-09',
    type: 'patch',
    milestone: false,
    theme: '旗舰宝箱基础设施',
    commits: [
      { hash: '5166a07', message: 'feat: gameStateStorage 支持双奖池数据结构' },
      { hash: '6a06462', message: 'feat: 增强 cdnService 支持更多物品类型和特殊资源' }
    ],
    features: [
      'gameStateStorage双奖池支持',
      'cdnService物品类型扩展'
    ]
  },
  {
    version: '1.1.3',
    date: '2025-10-08',
    type: 'patch',
    milestone: false,
    theme: '旗舰宝箱准备',
    commits: [
      { hash: 'f858399', message: 'feat: 支持旗舰宝箱类活动的图片命名规则' },
      { hash: '2273b0e', message: 'refactor: 重构货币识别机制，支持多种货币类型' },
      { hash: 'a6eecbe', message: 'fix: 修复顶部栏和商店弹窗的货币图标 URL 构建' }
    ],
    features: [
      '图片命名规则扩展',
      '货币识别重构',
      '图标URL修复'
    ]
  },
  {
    version: '1.1.2',
    date: '2025-10-08',
    type: 'patch',
    milestone: false,
    theme: '资源目录规范化',
    commits: [
      { hash: 'b0b6f9e', message: 'refactor: 重构资源目录，移除中文路径并规范化组织结构' }
    ],
    features: [
      '移除中文路径',
      '统一资源组织结构',
      '规范化命名'
    ]
  },
  {
    version: '1.1.1',
    date: '2025-10-07',
    type: 'patch',
    milestone: false,
    theme: '宝箱动画系统',
    commits: [
      { hash: '90c66aa', message: 'feat: 添加宝箱开启动画演示页面' },
      { hash: '6572756', message: 'feat: 添加宝箱开箱动画烟雾爆发效果' },
      { hash: 'd51c9cd', message: 'feat: 添加手机端预览模式' }
    ],
    features: [
      '开箱动画系统',
      '烟雾特效',
      '手机端预览'
    ]
  },
  {
    version: '1.1.0',
    date: '2025-10-09',
    type: 'minor',
    milestone: true,
    theme: '新组件系统上线 - 旗舰宝箱类抽卡（双奖池架构）',
    commits: [
      { hash: '49d8f49', message: 'feat: 实现旗舰宝箱类抽卡系统（双奖池架构）' }
    ],
    features: [
      '全新的旗舰宝箱类双奖池组件系统',
      '旗舰钥匙（event_premium）+ 普通钥匙（event_common）独立奖池',
      '完整的开箱动画系统',
      '方形物品展示（SquareItem）'
    ]
  },

  // ==================== v1.0.x - 架构重构后的完善时期 ====================
  {
    version: '1.0.11',
    date: '2025-10-07',
    type: 'patch',
    milestone: false,
    theme: '文档更新',
    commits: [
      { hash: '6986d09', message: 'docs: 更新项目架构文档' },
      { hash: 'b3d53c5', message: 'docs: 更新资源目录组织说明' },
      { hash: '94564ca', message: 'docs: 重整 CDN 资源目录描述' }
    ],
    features: [
      '项目架构文档更新',
      'CDN资源说明',
      'CLAUDE.md更新'
    ]
  },
  {
    version: '1.0.10',
    date: '2025-10-06',
    type: 'patch',
    milestone: false,
    theme: '稳定性改进',
    commits: [
      { hash: 'bb02a57', message: 'fix: 修复批量抽卡状态跟踪bug并优化配置加载策略' },
      { hash: 'f07a80d', message: 'fix: 修复导入路径大小写错误导致Vercel构建失败' }
    ],
    features: [
      '批量抽卡状态跟踪修复',
      '配置加载策略优化',
      'Vercel构建问题修复'
    ]
  },
  {
    version: '1.0.9',
    date: '2025-10-06',
    type: 'patch',
    milestone: false,
    theme: 'UI增强',
    commits: [
      { hash: '55bd882', message: 'feat: 在侧边栏顶部添加炫彩渐变标题' },
      { hash: 'cca0e7a', message: 'feat: 在侧边栏顶部添加网站图标和标题' },
      { hash: '807dc8a', message: 'feat: 奖品弹窗显示时自动收缩顶部栏并禁用展开' },
      { hash: '749f69c', message: 'feat: 更换网站图标为现代战舰Logo' }
    ],
    features: [
      '侧边栏炫彩标题',
      '网站图标更换',
      '奖品弹窗交互优化'
    ]
  },
  {
    version: '1.0.8',
    date: '2025-10-06',
    type: 'patch',
    milestone: false,
    theme: '物品展示优化',
    commits: [
      { hash: 'da03d77', message: 'feat: 为已抽完物品添加绿色勾选图标' },
      { hash: '5151c05', message: 'fix: 修复购买窗口筹码图标未应用优先级逻辑' }
    ],
    features: [
      '已抽完物品勾选图标',
      '购买窗口图标修复'
    ]
  },
  {
    version: '1.0.7',
    date: '2025-10-06',
    type: 'patch',
    milestone: false,
    theme: 'Bug修复',
    commits: [
      { hash: 'bb02a57', message: 'fix: 修复批量抽卡状态跟踪bug并优化配置加载策略' },
      { hash: 'f07a80d', message: 'fix: 修复导入路径大小写错误导致Vercel构建失败' }
    ],
    features: [
      '批量抽卡bug修复',
      'Vercel构建问题修复'
    ]
  },
  {
    version: '1.0.6',
    date: '2025-10-06',
    type: 'patch',
    milestone: false,
    theme: '路由修复',
    commits: [
      { hash: 'be6654d', message: 'fix: 修复页面刷新后路由404问题' }
    ],
    features: [
      '页面刷新后404问题修复'
    ]
  },
  {
    version: '1.0.5',
    date: '2025-10-05',
    type: 'patch',
    milestone: false,
    theme: '社区功能',
    commits: [
      { hash: 'b1858a7', message: 'feat: 侧边栏底部添加作者署名和赞助入口' }
    ],
    features: [
      '作者署名',
      '赞助入口'
    ]
  },
  {
    version: '1.0.4',
    date: '2025-10-05',
    type: 'patch',
    milestone: false,
    theme: '交互优化',
    commits: [
      { hash: '24256ee', message: 'feat: 添加侧边栏功能并优化移动端抽奖音效体验' },
      { hash: '95cf573', message: 'feat: 添加抽奖和购买音效系统' }
    ],
    features: [
      '侧边栏功能',
      '音效系统',
      '移动端音效优化'
    ]
  },
  {
    version: '1.0.3',
    date: '2025-10-05',
    type: 'patch',
    milestone: false,
    theme: 'Analytics集成',
    commits: [
      { hash: '780d252', message: 'feat: 添加赞助作者功能和Vercel Analytics集成' }
    ],
    features: [
      'Vercel Analytics集成',
      '赞助作者功能'
    ]
  },
  {
    version: '1.0.2',
    date: '2025-10-04',
    type: 'patch',
    milestone: false,
    theme: 'CDN迁移',
    commits: [
      { hash: 'db89af6', message: 'feat: 将所有静态资源迁移至阿里云 CDN' }
    ],
    features: [
      '所有静态资源迁移至阿里云'
    ]
  },
  {
    version: '1.0.1',
    date: '2025-10-04',
    type: 'patch',
    milestone: false,
    theme: 'UI改进',
    commits: [
      { hash: '1c99384', message: 'feat: 更新人民币图标为SVG并重新设计商店模态框配色方案' }
    ],
    features: [
      'SVG图标',
      '商店模态框重设计'
    ]
  },
  {
    version: '1.0.0',
    date: '2025-10-06',
    type: 'major',
    milestone: true,
    theme: '重大架构重构',
    commits: [
      { hash: '2c6cba2', message: 'feat: 重构项目架构，实现多活动支持和现代化UI系统' }
    ],
    features: [
      '多活动支持架构',
      '现代化UI系统',
      '路由重构',
      '组件化架构',
      'CDN动态加载'
    ]
  },

  // ==================== v0.1.x - 项目初始阶段 ====================
  {
    version: '0.1.3',
    date: '2025-10-04',
    type: 'patch',
    milestone: false,
    theme: '功能增强',
    commits: [
      { hash: 'c155f26', message: 'feat: 添加史诗/传奇抽取记录系统和历史记录界面优化' }
    ],
    features: [
      '史诗/传奇记录系统',
      '历史记录界面优化'
    ]
  },
  {
    version: '0.1.2',
    date: '2025-10-04',
    type: 'patch',
    milestone: false,
    theme: 'UI增强',
    commits: [
      { hash: 'c0c5efb', message: 'feat: 为传奇/史诗物品添加悬浮提示框功能' }
    ],
    features: [
      '悬浮提示框功能'
    ]
  },
  {
    version: '0.1.1',
    date: '2025-10-04',
    type: 'patch',
    milestone: false,
    theme: '响应式设计',
    commits: [
      { hash: 'b3e9398', message: 'feat: 实现完整的移动端和平板响应式设计' }
    ],
    features: [
      '移动端适配',
      '平板适配',
      '响应式布局'
    ]
  },
  {
    version: '0.1.0',
    date: '2025-10-04',
    type: 'patch',
    milestone: true,
    theme: '项目初始版本',
    commits: [
      { hash: 'd276455', message: 'feat: 现代战舰抽奖模拟器初始版本' }
    ],
    features: [
      '项目初始化',
      '筹码类抽卡基础功能',
      '基础UI系统'
    ]
  }
]

/**
 * 简化版本历史（用于快速查看）
 */
export const VERSION_HISTORY = VERSION_DETAILS.map(v => ({
  version: v.version,
  date: v.date,
  description: v.theme
}))

/**
 * 统计信息
 */
export const VERSION_STATS = {
  totalVersions: VERSION_DETAILS.length,
  majorVersions: VERSION_DETAILS.filter(v => v.type === 'major').length,
  minorVersions: VERSION_DETAILS.filter(v => v.type === 'minor').length,
  patchVersions: VERSION_DETAILS.filter(v => v.type === 'patch').length,
  totalCommits: VERSION_DETAILS.reduce((sum, v) => sum + v.commits.length, 0),
  startDate: '2025-10-04',
  currentDate: '2025-10-12',
  developmentDays: 9
}

/**
 * 获取指定版本的详细信息
 */
export function getVersionDetail(version) {
  return VERSION_DETAILS.find(v => v.version === version)
}

/**
 * 获取里程碑版本列表
 */
export function getMilestoneVersions() {
  return VERSION_DETAILS.filter(v => v.milestone)
}

/**
 * 按版本类型分组
 */
export function getVersionsByType() {
  return {
    major: VERSION_DETAILS.filter(v => v.type === 'major'),
    minor: VERSION_DETAILS.filter(v => v.type === 'minor'),
    patch: VERSION_DETAILS.filter(v => v.type === 'patch')
  }
}
