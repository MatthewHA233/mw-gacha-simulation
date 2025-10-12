import { motion, AnimatePresence } from 'framer-motion'
import { X, Github, Mail, Info, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import {
  APP_VERSION,
  SITE_INFO,
  VERSION_RULES,
  VERSION_DETAILS,
  VERSION_STATS
} from '../../utils/version'
import { useSound } from '../../hooks/useSound'
import { Tabs } from '../ui/tabs'

/**
 * 版本信息与网站声明弹窗（简洁版）
 * 展示版本历史、网站信息、免责声明等
 */
export function VersionModal({ isOpen, onClose }) {
  const { playButtonClick } = useSound()
  const [showAllVersions, setShowAllVersions] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState(VERSION_DETAILS[0]) // 默认选中第一个版本

  const handleClose = () => {
    playButtonClick()
    onClose()
  }

  // 选择版本
  const selectVersion = (version) => {
    playButtonClick()
    setSelectedVersion(version)
  }

  // 分页显示版本：默认显示最近10个
  const displayedVersions = showAllVersions ? VERSION_DETAILS : VERSION_DETAILS.slice(0, 10)

  // GitHub 仓库地址
  const GITHUB_REPO = 'https://github.com/MatthewHA233/mw-gacha-simulation'

  // 标签页配置
  const tabs = [
    {
      title: "版本历史",
      value: "version",
      content: (
        <div className="w-full overflow-hidden relative rounded-2xl p-2 sm:p-3 lg:p-4 space-y-2 sm:space-y-3">
          {/* 版本统计（简洁单行） + 语义化说明 */}
          <div className="flex items-center gap-2 sm:gap-3 text-white/70 text-[10px] sm:text-xs flex-wrap">
            <span>共 <span className="text-cyan-400 font-bold">{VERSION_STATS.totalVersions}</span> 个版本</span>
            <span>•</span>
            <span><span className="text-red-400 font-bold">{VERSION_STATS.majorVersions}</span> MAJOR</span>
            <span>•</span>
            <span><span className="text-blue-400 font-bold">{VERSION_STATS.minorVersions}</span> MINOR</span>
            <span>•</span>
            <span><span className="text-green-400 font-bold">{VERSION_STATS.patchVersions}</span> PATCH</span>
            <span>•</span>
            <span><span className="text-purple-400 font-bold">{VERSION_STATS.totalCommits}</span> 次提交</span>

            {/* 语义化版本说明 tooltip */}
            <div className="relative group ml-auto">
              <div className="p-1 hover:bg-white/10 rounded cursor-help transition-colors">
                <Info className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="absolute right-0 top-full mt-2 w-72 bg-black/95 backdrop-blur-xl border border-cyan-400/30 rounded-lg p-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 shadow-2xl">
                <h4 className="text-white font-bold text-xs mb-2">语义化版本规则</h4>
                <div className="space-y-1.5">
                  {Object.values(VERSION_RULES).map((rule) => (
                    <div key={rule.label} className="flex items-center gap-2">
                      <div
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white min-w-[48px] text-center"
                        style={{ backgroundColor: rule.color }}
                      >
                        {rule.label}
                      </div>
                      <span className="text-white/80 text-[10px]">{rule.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 左右两栏布局 */}
          <div className="space-y-1.5 sm:space-y-2">
            {displayedVersions.map((version) => (
              <div key={version.version} className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                {/* 左侧：版本卡片 */}
                <div
                  onClick={() => selectVersion(version)}
                  className={`bg-black/40 backdrop-blur-sm rounded-md sm:rounded-lg p-2 sm:p-2.5 lg:p-3 border cursor-pointer transition-all ${
                    selectedVersion?.version === version.version
                      ? version.milestone
                        ? 'bg-gradient-to-r from-yellow-900/40 via-orange-900/40 to-yellow-900/40 border-yellow-400/60 shadow-lg'
                        : 'border-cyan-400/60 shadow-lg'
                      : version.milestone
                        ? 'bg-gradient-to-r from-yellow-900/20 via-orange-900/20 to-yellow-900/20 border-yellow-400/30 hover:border-yellow-400/50'
                        : 'border-white/20 hover:border-cyan-400/50'
                  }`}
                >
                  <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 flex-wrap">
                    {version.milestone && <span className="text-yellow-400 text-xs sm:text-sm">★</span>}
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold text-white"
                      style={{ backgroundColor: VERSION_RULES[version.type].color }}
                    >
                      v{version.version}
                    </span>
                    <span className="text-white/60 text-[10px] sm:text-xs">{version.date}</span>
                  </div>
                  <div className="text-white font-semibold text-xs sm:text-sm mt-1 sm:mt-1.5 break-words">{version.theme}</div>
                  <ul className="mt-1 sm:mt-1.5 lg:mt-2 space-y-0.5">
                    {version.features.map((feature, idx) => (
                      <li key={idx} className="text-white/70 text-[10px] sm:text-xs flex items-start gap-1 sm:gap-1.5">
                        <span className="text-cyan-400 flex-shrink-0">•</span>
                        <span className="break-words">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 右侧：对应的提交记录卡片 */}
                <div className="bg-black/40 backdrop-blur-sm rounded-md sm:rounded-lg p-2 sm:p-2.5 lg:p-3 border border-white/20">
                  <div className="space-y-0.5">
                    {version.commits.map((commit, idx) => (
                      <a
                        key={idx}
                        href={`${GITHUB_REPO}/commit/${commit.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation()
                          playButtonClick()
                        }}
                        className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 px-1.5 sm:px-2 py-0.5 rounded hover:bg-white/5 transition-colors"
                      >
                        <Github className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 flex-shrink-0" />
                        <code className="px-1 sm:px-1.5 py-0.5 bg-cyan-900/30 rounded text-cyan-400 text-[9px] sm:text-[10px] font-mono flex-shrink-0">
                          {commit.hash.slice(0, 7)}
                        </code>
                        <span className="text-white/90 text-[10px] sm:text-xs break-words">{commit.message}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* 加载更多按钮 */}
            {!showAllVersions && VERSION_DETAILS.length > 10 && (
              <button
                onClick={() => {
                  playButtonClick()
                  setShowAllVersions(true)
                }}
                className="w-full mt-2 sm:mt-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-400/30 rounded-lg text-white text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 sm:gap-2"
              >
                <span>加载更多版本 ({VERSION_DETAILS.length - 10})</span>
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "关于",
      value: "about",
      content: (
        <div className="w-full overflow-hidden relative rounded-2xl p-2 sm:p-3 lg:p-4 space-y-2 sm:space-y-3 lg:space-y-4">
          {/* 网站简介 */}
          <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 rounded-md sm:rounded-lg p-2 sm:p-3 lg:p-4 border border-cyan-400/40">
            <h3 className="text-cyan-400 text-sm sm:text-lg lg:text-xl font-bold mb-1 sm:mb-2">{SITE_INFO.name}</h3>
            <p className="text-white/80 mb-2 sm:mb-3 text-[10px] sm:text-xs lg:text-sm">{SITE_INFO.description}</p>
            <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 text-[10px] sm:text-xs lg:text-sm flex-wrap">
              <div className="flex items-center gap-1 sm:gap-2 text-white/70">
                <span>作者:</span>
                <span className="text-cyan-400 font-bold">{SITE_INFO.author}</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 text-white/70">
                <span>版本:</span>
                <span className="text-cyan-400 font-bold">v{APP_VERSION}</span>
              </div>
            </div>
          </div>

          {/* 技术栈 */}
          <div>
            <h3 className="text-white font-bold text-xs sm:text-sm lg:text-base mb-1 sm:mb-2">技术栈</h3>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {[
                { name: 'React 18', color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-400/30' },
                { name: 'Vite', color: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-400/30' },
                { name: 'Tailwind CSS', color: 'from-cyan-500/20 to-blue-500/20', border: 'border-cyan-400/30' },
                { name: 'Framer Motion', color: 'from-pink-500/20 to-purple-500/20', border: 'border-pink-400/30' },
                { name: 'React Router', color: 'from-red-500/20 to-orange-500/20', border: 'border-red-400/30' },
                { name: 'Vercel', color: 'from-gray-500/20 to-slate-500/20', border: 'border-gray-400/30' }
              ].map((tech) => (
                <div
                  key={tech.name}
                  className={`bg-gradient-to-br ${tech.color} rounded-md sm:rounded-lg p-1.5 sm:p-2 lg:p-3 border ${tech.border} text-center`}
                >
                  <span className="text-white text-[10px] sm:text-xs lg:text-sm">{tech.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 链接 */}
          <div>
            <h3 className="text-white font-bold text-xs sm:text-sm lg:text-base mb-1 sm:mb-2">相关链接</h3>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {SITE_INFO.github && (
                <a
                  href={SITE_INFO.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 sm:gap-3 bg-black/40 backdrop-blur-sm rounded-md sm:rounded-lg p-2 sm:p-3 border border-white/10 hover:border-cyan-400/50 transition-colors"
                >
                  <Github className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs sm:text-sm font-semibold">GitHub 仓库</div>
                    <div className="text-white/60 text-[10px] sm:text-xs">查看源代码</div>
                  </div>
                </a>
              )}
              {SITE_INFO.contact?.github && (
                <a
                  href={SITE_INFO.contact.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 sm:gap-3 bg-black/40 backdrop-blur-sm rounded-md sm:rounded-lg p-2 sm:p-3 border border-white/10 hover:border-cyan-400/50 transition-colors"
                >
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs sm:text-sm font-semibold">联系方式</div>
                    <div className="text-white/60 text-[10px] sm:text-xs">通过 GitHub Issues 联系</div>
                  </div>
                </a>
              )}
            </div>
          </div>

          {/* 开发统计 */}
          <div className="bg-black/40 backdrop-blur-sm rounded-md sm:rounded-lg p-2 sm:p-3 lg:p-4 border border-white/20">
            <h3 className="text-white font-bold text-xs sm:text-sm lg:text-base mb-2 sm:mb-3">开发统计</h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
              <div className="text-center">
                <div className="text-cyan-400 text-lg sm:text-xl lg:text-2xl font-bold">{VERSION_STATS.totalCommits}</div>
                <div className="text-white/60 text-[10px] sm:text-xs">Git 提交次数</div>
              </div>
              <div className="text-center">
                <div className="text-cyan-400 text-lg sm:text-xl lg:text-2xl font-bold">{VERSION_STATS.developmentDays}</div>
                <div className="text-white/60 text-[10px] sm:text-xs">开发天数</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "声明与致谢",
      value: "disclaimer",
      content: (
        <div className="w-full overflow-hidden relative rounded-2xl p-2 sm:p-3 lg:p-4 space-y-2 sm:space-y-3 lg:space-y-4">
          {/* 免责声明 */}
          <div>
            <h3 className="text-yellow-400 font-bold text-sm sm:text-base lg:text-lg mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg lg:text-xl">⚠️</span>
              免责声明
            </h3>
            <div className="bg-yellow-900/20 backdrop-blur-sm rounded-md sm:rounded-lg p-2 sm:p-3 lg:p-4 border border-yellow-400/40 space-y-1 sm:space-y-1.5 lg:space-y-2">
              {SITE_INFO.disclaimer.map((text, idx) => (
                <p key={idx} className="text-white/80 text-[10px] sm:text-xs leading-relaxed">
                  {text}
                </p>
              ))}
            </div>
          </div>

          {/* 致谢：赞赏者 */}
          {SITE_INFO.sponsors && SITE_INFO.sponsors.length > 0 && (
            <div>
              <h3 className="text-pink-400 font-bold text-sm sm:text-base lg:text-lg mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg lg:text-xl">💖</span>
                致谢：赞赏者
              </h3>
              <div className="bg-gradient-to-br from-pink-900/20 to-purple-900/20 backdrop-blur-sm rounded-md sm:rounded-lg p-2 sm:p-3 lg:p-4 border border-pink-400/40">
                {SITE_INFO.sponsors.length === 0 ? (
                  <p className="text-white/60 text-[10px] sm:text-xs text-center py-3 sm:py-4">
                    暂无赞赏记录
                  </p>
                ) : (
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {SITE_INFO.sponsors.map((sponsor, idx) => (
                      <div
                        key={idx}
                        className="bg-black/30 rounded-md sm:rounded-lg p-1.5 sm:p-2 border border-white/10"
                      >
                        <div className="text-white text-[10px] sm:text-xs font-semibold">
                          {sponsor.name}
                        </div>
                        {sponsor.amount && (
                          <div className="text-pink-400 text-[10px] sm:text-xs mt-0.5">
                            ¥{sponsor.amount}
                          </div>
                        )}
                        {sponsor.date && (
                          <div className="text-white/50 text-[9px] sm:text-[10px] mt-0.5">
                            {sponsor.date}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 额外致谢 */}
          <div>
            <h3 className="text-cyan-400 font-bold text-sm sm:text-base lg:text-lg mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg lg:text-xl">🙏</span>
              额外致谢
            </h3>
            {/* 游戏开发商 + 数据来源 + 托管平台 + CDN服务 */}
            <div className="grid grid-cols-4 gap-2 sm:gap-2.5 lg:gap-3">
              <div className="bg-black/40 backdrop-blur-sm rounded-md sm:rounded-lg p-2 sm:p-2.5 lg:p-3 border border-white/10">
                <h4 className="text-white text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1">游戏开发商</h4>
                <p className="text-white/70 text-[10px] sm:text-xs">{SITE_INFO.credits.gameDeveloper}</p>
              </div>
              <div className="bg-black/40 backdrop-blur-sm rounded-md sm:rounded-lg p-2 sm:p-2.5 lg:p-3 border border-white/10">
                <h4 className="text-white text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1">数据来源</h4>
                <a
                  href={SITE_INFO.credits.dataSource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 text-[10px] sm:text-xs underline transition-colors break-all"
                >
                  {SITE_INFO.credits.dataSource.name}
                </a>
              </div>
              <div className="bg-black/40 backdrop-blur-sm rounded-md sm:rounded-lg p-2 sm:p-2.5 lg:p-3 border border-white/10">
                <h4 className="text-white text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1">托管平台</h4>
                <p className="text-white/70 text-[10px] sm:text-xs">{SITE_INFO.credits.hosting}</p>
              </div>
              <div className="bg-black/40 backdrop-blur-sm rounded-md sm:rounded-lg p-2 sm:p-2.5 lg:p-3 border border-white/10">
                <h4 className="text-white text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1">CDN服务</h4>
                <p className="text-white/70 text-[10px] sm:text-xs">{SITE_INFO.credits.cdn}</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9998]"
          />

          {/* 弹窗内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 pointer-events-none"
          >
            <div
              className="relative bg-black/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 w-full max-w-[98vw] sm:max-w-4xl lg:max-w-5xl max-h-[95vh] overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 顶部标题栏 */}
              <div className="relative bg-gradient-to-r from-cyan-900/60 via-blue-900/60 to-purple-900/60 p-2 sm:p-4 lg:p-6 border-b border-white/20">
                <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                  <img
                    src="/MW.png"
                    alt="MW"
                    className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.6))'
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-white truncate">
                      {SITE_INFO.name}
                    </h2>
                    <p className="text-cyan-400 text-[10px] sm:text-xs lg:text-sm mt-0.5 sm:mt-1 truncate">
                      {SITE_INFO.nameEn} v{APP_VERSION}
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg sm:rounded-xl transition-colors flex-shrink-0"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </button>
                </div>
              </div>

              {/* Tab 切换 + 内容区域 */}
              <div className="overflow-y-auto max-h-[calc(40vh-60px)] sm:max-h-[calc(60vh-80px)] lg:max-h-[calc(85vh-120px)] custom-scrollbar">
                <Tabs
                  tabs={tabs}
                  containerClassName="p-2 sm:p-3 lg:p-4"
                  activeTabClassName="bg-gradient-to-r from-cyan-500 to-blue-500"
                  tabClassName="text-white/70 hover:text-white transition-colors text-xs sm:text-sm"
                  contentClassName=""
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
