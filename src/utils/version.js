/**
 * 应用版本配置
 * 每次推送更新时，修改 APP_VERSION 即可触发所有用户强制重置数据
 *
 * 版本号格式：语义化版本（Semantic Versioning）
 * MAJOR.MINOR.PATCH
 * - MAJOR: 重大功能更新（不向后兼容）
 * - MINOR: 新功能添加（向后兼容）
 * - PATCH: Bug修复和小改进
 *
 * 示例：5.1.0
 */

export const APP_VERSION = '5.1.0'

/**
 * 版本历史记录
 */
export const VERSION_HISTORY = [
  {
    version: '5.1.0',
    date: '2025-10-12',
    description: '添加版本控制强制重置功能'
  },
  {
    version: '5.0.1',
    date: '2025-10-12',
    description: 'Bug修复 - cargo gameplay货币消耗倍率和不足提示优化'
  },
  {
    version: '5.0.0',
    date: '2025-10-12',
    description: '重大更新 - 无人机补给类抽卡系统上线'
  },
  {
    version: '4.2.0',
    date: '2025-10-12',
    description: '机密货物类完善 - 保底机制、响应式优化、物品提示框改进'
  },
  {
    version: '4.1.0',
    date: '2025-10-11',
    description: '机密货物类优化 - 主题音乐、UI调整、英文名补充'
  },
  {
    version: '4.0.0',
    date: '2025-10-11',
    description: '重大更新 - 机密货物类抽卡系统上线'
  },
  {
    version: '3.4.0',
    date: '2025-10-10',
    description: '氪金里程碑Toast通知系统'
  },
  {
    version: '3.3.0',
    date: '2025-10-09',
    description: '交互增强 - 武库舰入口、智能双击快进功能'
  },
  {
    version: '3.2.0',
    date: '2025-10-09',
    description: '旗舰宝箱UI优化 - 物品展示栏、响应式布局、限量物品状态'
  },
  {
    version: '3.1.0',
    date: '2025-10-09',
    description: '音效系统重构 - 结构化音效、音乐播放器增强'
  },
  {
    version: '3.0.0',
    date: '2025-10-09',
    description: '重大更新 - 旗舰宝箱类抽卡系统（双奖池架构）'
  },
  {
    version: '2.5.0',
    date: '2025-10-08',
    description: '旗舰宝箱准备 - 图片命名规则、物品类型扩展'
  },
  {
    version: '2.4.0',
    date: '2025-10-08',
    description: '多货币支持 - 货币识别机制重构、资源目录规范化'
  },
  {
    version: '2.3.0',
    date: '2025-10-07',
    description: '宝箱动画系统 - 开箱动画、烟雾特效、手机端预览'
  },
  {
    version: '2.2.0',
    date: '2025-10-07',
    description: '文档更新 - 项目架构文档和CDN资源说明'
  },
  {
    version: '2.1.0',
    date: '2025-10-06',
    description: '稳定性改进 - Bug修复、UI优化、路由修复'
  },
  {
    version: '2.0.0',
    date: '2025-10-06',
    description: '重大更新 - 架构重构，实现多活动支持和现代化UI系统'
  },
  {
    version: '1.4.0',
    date: '2025-10-05',
    description: '社区功能 - 赞助系统、音效系统、侧边栏、Analytics集成'
  },
  {
    version: '1.3.0',
    date: '2025-10-04',
    description: 'CDN迁移 - 所有静态资源迁移至阿里云'
  },
  {
    version: '1.2.0',
    date: '2025-10-04',
    description: 'UI改进 - SVG图标、商店模态框重设计'
  },
  {
    version: '1.1.0',
    date: '2025-10-04',
    description: '功能增强 - 响应式设计、史诗/传奇记录系统、悬浮提示框'
  },
  {
    version: '1.0.0',
    date: '2025-10-04',
    description: '项目初始版本 - 现代战舰抽奖模拟器正式上线'
  }
]
