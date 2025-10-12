/**
 * 应用版本配置
 *
 * 版本号格式：语义化版本（Semantic Versioning）
 * MAJOR.MINOR.PATCH
 *
 * 版本号规则：
 * - MAJOR: 重大架构变更（如 1.0.0 的架构重构）
 * - MINOR: 新的整体组件化系统上线（旗舰宝箱、机密货物）
 * - PATCH: 功能优化、Bug修复、UI改进、延伸功能（如无人机补给）
 */

/**
 * 回退版本号
 * 仅在无法从 CDN 加载版本数据时使用
 * 正常情况下，实际版本号从 /gacha-configs/version-history.json 读取
 */
export const FALLBACK_VERSION = '1.2.6'

/**
 * 当前应用版本号（从 CDN 加载）
 * 初始值为 null，需要通过 loadVersionHistory() 异步加载
 */
let currentVersion = null

/**
 * 获取当前版本号
 * @returns {string} 当前版本号，如果未加载则返回回退版本号
 */
export function getAppVersion() {
  return currentVersion || FALLBACK_VERSION
}

/**
 * 设置当前版本号（由版本加载器调用）
 * @param {string} version - 版本号
 */
export function setAppVersion(version) {
  currentVersion = version
}

/**
 * 注意：
 * - 实际版本号从 /gacha-configs/version-history.json 的 currentVersion 字段读取
 * - 版本历史、网站信息、赞赏者名单都从 JSON 动态加载
 *
 * 正确的工作流程：
 * 1. 提交代码（多次）
 * 2. 手动总结版本信息，更新 src/utils/version.js 中的 VERSION_DETAILS
 * 3. 运行 node scripts/extract-version-data.js 生成 JSON 文件
 * 4. 手动上传 JSON 到 CDN（不提交到 git）
 * 5. JSON 中的 currentVersion 就是最新版本号
 */
