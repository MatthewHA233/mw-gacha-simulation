'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Github, Mail, Info, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getAppVersion } from '../../utils/version'
import { useSound } from '../../hooks/useSound'
import { useVersionData } from '../../hooks/useVersionData'
import { useSiteInfo } from '../../hooks/useSiteInfo'

// ===== 战术终端风格展示组件（海军 HUD / 机密档案） =====

const TONES = {
  cyan: { text: 'text-cyan-400', rule: 'from-cyan-400/40', tick: 'border-cyan-400/50' },
  amber: { text: 'text-amber-400', rule: 'from-amber-400/40', tick: 'border-amber-400/50' },
  rose: { text: 'text-rose-400', rule: 'from-rose-400/40', tick: 'border-rose-400/50' },
}

const TECH_STACK = [
  { name: 'React 18', role: 'FRAMEWORK' },
  { name: 'Vite', role: 'BUILD' },
  { name: 'Tailwind CSS', role: 'STYLING' },
  { name: 'Framer Motion', role: 'MOTION' },
  { name: 'React Router', role: 'ROUTING' },
  { name: 'Vercel', role: 'DEPLOY' },
]

// 四角定位标记（HUD 取景框）
function CornerTicks({ tone = 'cyan' }) {
  const base = `pointer-events-none absolute w-2 h-2 sm:w-2.5 sm:h-2.5 ${TONES[tone].tick}`
  return (
    <>
      <span className={`${base} left-0 top-0 border-l border-t`} />
      <span className={`${base} right-0 top-0 border-r border-t`} />
      <span className={`${base} left-0 bottom-0 border-l border-b`} />
      <span className={`${base} right-0 bottom-0 border-r border-b`} />
    </>
  )
}

// 分区标题：序号 + 中文 + 拉丁副标 + 延伸标尺线
function TacticalHeader({ index, zh, en, tone = 'cyan' }) {
  const t = TONES[tone]
  return (
    <div className="flex items-center gap-2 sm:gap-2.5 mb-2 sm:mb-2.5">
      {index != null && (
        <span className={`font-mono text-[10px] sm:text-xs font-bold ${t.text} w-4 text-center shrink-0`}>{index}</span>
      )}
      <h3 className="text-white font-bold text-sm sm:text-base tracking-wide shrink-0">{zh}</h3>
      <span className={`font-mono text-[8px] sm:text-[10px] uppercase tracking-[0.25em] ${t.text} opacity-60 shrink-0`}>{en}</span>
      <span className={`flex-1 h-px bg-gradient-to-r ${t.rule} to-transparent`} />
    </div>
  )
}

// 系统清单行：▸ 名称 ········ 角色
function ManifestRow({ name, role }) {
  return (
    <div className="group flex items-baseline gap-2 py-1 sm:py-1.5 font-mono text-[10px] sm:text-xs border-b border-white/[0.06] last:border-0">
      <span className="text-cyan-400/70 shrink-0">▸</span>
      <span className="text-white/85 tracking-wide shrink-0">{name}</span>
      <span className="flex-1 self-center border-b border-dotted border-white/15 group-hover:border-cyan-400/30 transition-colors min-w-[16px]" />
      <span className="text-white/45 uppercase tracking-[0.15em] text-[9px] sm:text-[10px] shrink-0">{role}</span>
    </div>
  )
}

// 规格行：标签 ········ 值（可选外链）
function SpecRow({ label, value, href }) {
  const val = href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-0.5">
      {value}<span className="text-[0.85em]">↗</span>
    </a>
  ) : (
    <span className="text-white/60">{value}</span>
  )
  return (
    <div className="group flex items-baseline gap-2 py-1 sm:py-1.5 font-mono text-[10px] sm:text-xs border-b border-white/[0.06] last:border-0">
      <span className="text-white/80 tracking-wide shrink-0">{label}</span>
      <span className="flex-1 self-center border-b border-dotted border-white/15 group-hover:border-white/25 transition-colors min-w-[16px]" />
      <span className="text-right shrink-0 max-w-[62%] truncate">{val}</span>
    </div>
  )
}

// 仪表读数面板（紧凑）
function GaugePanel({ value, zh, en }) {
  return (
    <div className="relative overflow-hidden rounded-sm border border-cyan-400/20 bg-gradient-to-b from-cyan-400/[0.07] to-transparent px-2.5 sm:px-3 py-2 sm:py-2.5">
      <CornerTicks tone="cyan" />
      <div className="font-mono text-2xl sm:text-3xl font-bold text-cyan-300 tabular-nums leading-none">{value ?? '—'}</div>
      <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
        <span className="text-white/70 text-[10px] sm:text-xs">{zh}</span>
        <span className="font-mono text-cyan-400/50 text-[8px] sm:text-[9px] uppercase tracking-[0.15em]">{en}</span>
      </div>
      <div className="mt-1.5 h-px w-full bg-gradient-to-r from-cyan-400/60 to-transparent" />
    </div>
  )
}

// 赞赏者条目（紧凑卡片）
function SponsorChip({ name, amount }) {
  return (
    <div className="flex items-center gap-2 rounded-sm border border-white/10 bg-black/30 px-2 sm:px-2.5 py-1.5 hover:border-rose-400/40 hover:bg-rose-400/[0.05] transition-colors">
      <span className="w-1 h-1 rounded-full bg-rose-400/60 shrink-0" />
      <span className="text-white/85 text-[11px] sm:text-xs font-medium truncate" title={name}>{name}</span>
      <span className="ml-auto font-mono text-rose-300 text-[10px] sm:text-xs font-bold tabular-nums shrink-0">¥{amount}</span>
    </div>
  )
}

/**
 * 版本信息与网站声明弹窗（性能优化版）
 * 展示版本历史、网站信息、免责声明等
 */
export function VersionModal({ isOpen, onClose }) {
  const { playButtonClick } = useSound()
  const [showAllVersions, setShowAllVersions] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [activeTab, setActiveTab] = useState('version')

  // 加载版本数据和网站信息
  const { versionData, loading: versionLoading, error: versionError } = useVersionData()
  const { siteInfo, loading: siteLoading, error: siteError } = useSiteInfo()

  // 解构版本数据
  const VERSION_RULES = versionData?.versionRules || {}
  const VERSION_DETAILS = versionData?.versionDetails || []
  const VERSION_STATS = versionData?.versionStats || {}
  const SITE_INFO = siteInfo || {}

  // ✅ 修复：在 useEffect 中设置默认选中版本，避免渲染期间 setState
  useEffect(() => {
    if (!selectedVersion && VERSION_DETAILS.length > 0) {
      setSelectedVersion(VERSION_DETAILS[0])
    }
  }, [VERSION_DETAILS, selectedVersion])

  const handleClose = () => {
    playButtonClick()
    onClose()
  }

  // 选择版本
  const selectVersion = (version) => {
    playButtonClick()
    setSelectedVersion(version)
  }

  // ✅ 性能优化：默认只显示最近 5 个版本（手机渲染更快）
  const displayedVersions = showAllVersions ? VERSION_DETAILS : VERSION_DETAILS.slice(0, 5)

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
              <div className="absolute right-0 top-full mt-2 w-72 bg-black/95 border border-cyan-400/30 rounded-lg p-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 shadow-2xl">
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
                  className={`bg-black/40 rounded-md sm:rounded-lg p-2 sm:p-2.5 lg:p-3 border cursor-pointer ${
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
                      style={{ backgroundColor: VERSION_RULES[version.type]?.color || '#6b7280' }}
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
                <div className="bg-black/40 rounded-md sm:rounded-lg p-2 sm:p-2.5 lg:p-3 border border-white/20">
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
            {!showAllVersions && VERSION_DETAILS.length > 5 && (
              <button
                onClick={() => {
                  playButtonClick()
                  setShowAllVersions(true)
                }}
                className="w-full mt-2 sm:mt-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-400/30 rounded-lg text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2"
              >
                <span>加载更多版本 ({VERSION_DETAILS.length - 5})</span>
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
        <div className="w-full relative p-2 sm:p-3 lg:p-4 space-y-2.5 sm:space-y-3">
          {/* 身份档案横幅 */}
          <div className="relative overflow-hidden rounded-sm border border-cyan-400/30 bg-[#081521]/80 p-3 sm:p-4 lg:p-5">
            <CornerTicks tone="cyan" />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.05]"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg, #22d3ee 0, #22d3ee 1px, transparent 1px, transparent 4px)' }}
            />
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-cyan-400 via-cyan-400/40 to-transparent" />
            <div className="relative pl-2 sm:pl-3">
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.3em] text-cyan-400/80">档案 // DOSSIER</span>
                <span className="ml-auto flex items-center gap-1 font-mono text-[9px] sm:text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />ONLINE
                </span>
              </div>
              <h3 className="text-white text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight">{SITE_INFO.name}</h3>
              <p className="font-mono text-cyan-400/70 text-[10px] sm:text-xs tracking-wider mt-0.5">{SITE_INFO.nameEn}</p>
              <p className="text-white/60 text-[11px] sm:text-sm mt-2 border-l-2 border-white/15 pl-2 sm:pl-3">{SITE_INFO.description}</p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 font-mono text-[10px] sm:text-xs">
                <span className="flex items-center gap-1.5"><span className="text-white/40">操作员 / OPERATOR</span><span className="text-cyan-400 font-bold">{SITE_INFO.author}</span></span>
                <span className="flex items-center gap-1.5"><span className="text-white/40">构建 / BUILD</span><span className="text-cyan-400 font-bold">v{getAppVersion()}</span></span>
              </div>
            </div>
          </div>

          {/* 主体：左侧系统清单 / 右侧统计 + 通讯 */}
          <div className="grid lg:grid-cols-2 gap-2.5 sm:gap-3">
            {/* 01 系统配置 */}
            <section>
              <TacticalHeader index="01" zh="系统配置" en="Systems Manifest" />
              <div className="rounded-sm border border-white/10 bg-black/30 px-3 sm:px-4">
                {TECH_STACK.map((t) => (
                  <ManifestRow key={t.name} name={t.name} role={t.role} />
                ))}
              </div>
            </section>

            {/* 右列：开发统计 + 通讯频道 */}
            <div className="space-y-2.5 sm:space-y-3">
              {/* 02 开发统计 */}
              <section>
                <TacticalHeader index="02" zh="开发统计" en="Statistics" />
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <GaugePanel value={VERSION_STATS.totalCommits} zh="提交次数" en="Commits" />
                  <GaugePanel value={VERSION_STATS.developmentDays} zh="开发天数" en="Dev Days" />
                </div>
              </section>

              {/* 03 通讯频道 */}
              <section>
                <TacticalHeader index="03" zh="通讯频道" en="Comms Channels" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                  {SITE_INFO.github && (
                    <a
                      href={SITE_INFO.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2.5 rounded-sm border border-white/10 bg-black/30 px-3 py-2 hover:border-cyan-400/50 hover:bg-cyan-400/[0.04] transition-colors"
                    >
                      <span className="font-mono text-cyan-400/50 text-xs">&gt;</span>
                      <Github className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-white text-xs sm:text-sm font-semibold">GitHub 仓库</span>
                        <span className="block font-mono text-white/40 text-[9px] sm:text-[10px] tracking-wider">SOURCE CODE</span>
                      </span>
                      <span className="ml-auto font-mono text-cyan-400/60 text-xs group-hover:translate-x-0.5 transition-transform">↗</span>
                    </a>
                  )}
                  {SITE_INFO.contact?.github && (
                    <a
                      href={SITE_INFO.contact.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2.5 rounded-sm border border-white/10 bg-black/30 px-3 py-2 hover:border-cyan-400/50 hover:bg-cyan-400/[0.04] transition-colors"
                    >
                      <span className="font-mono text-cyan-400/50 text-xs">&gt;</span>
                      <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-white text-xs sm:text-sm font-semibold">联系方式</span>
                        <span className="block font-mono text-white/40 text-[9px] sm:text-[10px] tracking-wider">GITHUB ISSUES</span>
                      </span>
                      <span className="ml-auto font-mono text-cyan-400/60 text-xs group-hover:translate-x-0.5 transition-transform">↗</span>
                    </a>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "声明与致谢",
      value: "disclaimer",
      content: (
        <div className="w-full relative p-2 sm:p-3 lg:p-4 space-y-2.5 sm:space-y-3">
          {/* 免责声明（双栏排版） */}
          <section>
            <TacticalHeader index="!" zh="免责声明" en="Disclaimer" tone="amber" />
            <div className="relative overflow-hidden rounded-sm border border-amber-400/30 bg-[#1a1405]/60">
              <div
                className="h-1.5 w-full"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, #f59e0b 0, #f59e0b 9px, #0a0a0a 9px, #0a0a0a 18px)' }}
              />
              <div className="p-3 sm:p-4 grid sm:grid-cols-2 gap-x-5 gap-y-1.5">
                {SITE_INFO.disclaimer?.length ? (
                  SITE_INFO.disclaimer.map((text, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="font-mono text-[10px] sm:text-xs shrink-0 pt-0.5 tabular-nums">
                        <span className="text-amber-400/90">{String(idx + 1).padStart(2, '0')}</span>
                        <span className="text-amber-400/30">/{String(SITE_INFO.disclaimer.length).padStart(2, '0')}</span>
                      </span>
                      <p className="text-white/75 text-[11px] sm:text-xs leading-relaxed">{text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-white/50 text-sm">暂无免责声明</p>
                )}
              </div>
            </div>
          </section>

          {/* 赞赏致谢 + 鸣谢 并排 */}
          <div className="grid lg:grid-cols-2 gap-2.5 sm:gap-3">
            {SITE_INFO.sponsors?.length > 0 && (
              <section>
                <TacticalHeader index="✦" zh="赞赏致谢" en="Sponsors" tone="rose" />
                <div className="grid grid-cols-2 gap-1.5">
                  {[...SITE_INFO.sponsors]
                    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
                    .map((sponsor, idx) => (
                      <SponsorChip key={`${sponsor.name}-${idx}`} name={sponsor.name} amount={sponsor.amount} />
                    ))}
                </div>
              </section>
            )}

            <section>
              <TacticalHeader zh="鸣谢" en="Credits" />
              <div className="rounded-sm border border-white/10 bg-black/30 px-3 sm:px-4">
                <SpecRow label="游戏开发商" value={SITE_INFO.credits?.gameDeveloper || '暂无'} />
                <SpecRow
                  label="数据来源"
                  value={SITE_INFO.credits?.dataSource?.name || '暂无'}
                  href={SITE_INFO.credits?.dataSource?.url}
                />
                <SpecRow label="托管平台" value={SITE_INFO.credits?.hosting || '暂无'} />
                <SpecRow label="CDN 服务" value={SITE_INFO.credits?.cdn || '暂无'} />
              </div>
            </section>
          </div>
        </div>
      ),
    },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 - 移除 backdrop-blur 优化性能 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/70 z-[9998]"
          />

          {/* 弹窗内容 - 简化动画 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 pointer-events-none"
          >
            <div
              className="relative bg-black/95 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 w-full max-w-[98vw] sm:max-w-4xl lg:max-w-5xl max-h-[95vh] overflow-hidden pointer-events-auto"
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
                      {SITE_INFO.nameEn} v{getAppVersion()}
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

              {/* 战术标签栏（固定在标题栏下方，不随内容滚动） */}
              {!versionLoading && !siteLoading && !versionError && !siteError && (
                <div className="relative flex items-stretch border-b border-white/10 bg-black/40">
                  {tabs.map((tab, i) => {
                    const active = activeTab === tab.value
                    return (
                      <button
                        key={tab.value}
                        onClick={() => {
                          playButtonClick()
                          setActiveTab(tab.value)
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium tracking-wide transition-colors duration-200 ${
                          active ? 'text-cyan-300' : 'text-white/45 hover:text-white/80'
                        }`}
                      >
                        <span className={`font-mono text-[9px] sm:text-[10px] transition-colors duration-200 ${active ? 'text-cyan-400/80' : 'text-white/25'}`}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span>{tab.title}</span>
                      </button>
                    )
                  })}
                  {/* 单一滑动下划线：等分段间纯水平滑动，宽度恒定 */}
                  <motion.span
                    className="pointer-events-none absolute -bottom-px h-0.5 bg-gradient-to-r from-cyan-400 to-blue-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                    initial={false}
                    animate={{
                      left: `${(tabs.findIndex((t) => t.value === activeTab) * 100) / tabs.length}%`,
                      width: `${100 / tabs.length}%`,
                    }}
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  />
                </div>
              )}

              {/* 内容滚动区 */}
              <div className="overflow-y-auto max-h-[calc(40vh-60px)] sm:max-h-[calc(60vh-80px)] lg:max-h-[calc(85vh-120px)] custom-scrollbar">
                {/* 加载状态 */}
                {(versionLoading || siteLoading) && (
                  <div className="flex items-center justify-center p-8 sm:p-12">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-white/70 text-sm">加载版本数据中...</p>
                    </div>
                  </div>
                )}

                {/* 错误状态 */}
                {(versionError || siteError) && !versionLoading && !siteLoading && (
                  <div className="flex items-center justify-center p-8 sm:p-12">
                    <div className="text-center max-w-md">
                      <div className="text-red-400 text-4xl mb-4">⚠️</div>
                      <p className="text-white font-semibold mb-2">加载失败</p>
                      <p className="text-white/60 text-sm mb-4">
                        {versionError || siteError}
                      </p>
                      <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors text-sm"
                      >
                        刷新页面
                      </button>
                    </div>
                  </div>
                )}

                {/* 当前标签内容 */}
                {!versionLoading && !siteLoading && !versionError && !siteError &&
                  tabs.find((t) => t.value === activeTab)?.content}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
