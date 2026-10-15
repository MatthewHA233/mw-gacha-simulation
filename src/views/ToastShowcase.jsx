'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { AppToaster } from '@/components/ui/AppToaster'
import { AchievementIcon, MemberCrownIcon } from '@/components/ui/AchievementIcon'
import { MemberCrownBadge } from '@/components/ui/MemberCrownBadge'
import { useMilestoneToast } from '@/components/ui/MilestoneToastProvider'
import { useMilestoneTracker } from '@/hooks/useMilestoneTracker'
import { MILESTONES } from '@/data/milestoneConfig'
import { CDN_BASE_URL } from '@/utils/constants'
import { IMG_WEBP } from '@/services/cdnService'
import { CROWN_TIERS, CROWN_TIER_NAMES } from '@/utils/crownTier'

/**
 * /test/toasts：全站通知 / 成就弹出 / 顶栏会员王冠的集中展示页（2026-10-15）。
 * 改样式时在这里一次看全；用的都是线上同一套组件。
 * 「连续触发」用独立的存档键 showcase、并且不升顶栏王冠（awardCrown: false），不影响真实数据。
 */

const PAGE_BG = '#1b1f2a'
const CARD = 'rounded-xl border border-white/15 bg-[#2b2940]/80 p-4 md:p-5'
const BUTTON = 'rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs md:text-sm text-white hover:bg-white/20 active:scale-[0.97] transition'

function Section({ title, note, children }) {
  return (
    <section className={CARD}>
      <h2 className="text-base md:text-lg font-bold text-white">{title}</h2>
      {note && <p className="mt-1 text-xs md:text-sm text-white/65">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

// ---------- 伪造的顶栏：和线上 Header 右半边同样的元素与样式 ----------
const PILLS = [
  { icon: 'currency/currency_gachacoins_ag109', value: '4950', border: 'border-purple-500/30', text: 'text-white' },
  { icon: 'currency/bigevent_currency_gacha_rm_be109', value: '20', border: 'border-green-500/30', text: 'text-green-300' },
  { value: '-728', border: 'border-red-500/40', text: 'text-red-400', rmb: true },
]

function FakeHeader({ tier }) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-white/10"
      style={{ backgroundImage: `url(${CDN_BASE_URL}/assets/contentseparated_assets_activities/lootbox_activity_la109_widget.png${IMG_WEBP})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="flex items-center justify-between gap-2 md:gap-4 px-2 py-1 md:px-4 md:py-3 bg-gradient-to-b from-black/80 to-black/40">
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <svg className="w-4 h-4 md:w-6 md:h-6 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          <div>
            <div className="text-white text-[10px] md:text-lg font-bold whitespace-nowrap">杰克货箱</div>
            <div className="text-cyan-400 text-[8px] md:text-sm whitespace-nowrap">Jack&apos;s Cargo</div>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-4 shrink-0">
          <MemberCrownBadge tier={tier} remainingDays={279} />
          <span className="text-slate-300 font-mono text-[10px] md:text-xs px-1 py-0.5 md:px-2 border border-slate-700 bg-black/40">13****0000</span>
          {PILLS.map((pill) => (
            <span key={pill.value} className={`hidden sm:flex items-center gap-1 md:gap-2 bg-black/60 rounded-full px-1.5 py-0.5 md:px-3 md:py-1.5 border ${pill.border}`}>
              {pill.rmb
                ? <span className="text-red-400 text-xs md:text-base font-bold">¥</span>
                : <img src={`${CDN_BASE_URL}/assets/contentseparated_assets_content/textures/sprites/${pill.icon}.png${IMG_WEBP}`} alt="" className="w-4 h-4 md:w-6 md:h-6 object-contain" />}
              <span className={`${pill.text} font-bold text-xs md:text-lg`}>{pill.value}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------- 连续触发：独立存档、不升王冠 ----------
function BurstDemo() {
  const [spent, setSpent] = useState(0)
  const { resetMilestones } = useMilestoneTracker(-spent, 'showcase', true, { awardCrown: false })
  const reset = () => { resetMilestones(); setSpent(0) }
  useEffect(() => { reset() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const jumps = [[648, '花到 ¥648（单个）'], [2000, '花到 ¥2,000（一口气 9 个，5 倍速）'], [20000, '花到 ¥2 万'], [1000000, '花到 ¥100 万（全部）']]
  return (
    <div className="flex flex-wrap items-center gap-2">
      {jumps.map(([amount, label]) => (
        <button key={amount} className={BUTTON} onClick={() => setSpent((value) => Math.max(value, amount))}>{label}</button>
      ))}
      <button className={`${BUTTON} border-rose-300/40`} onClick={reset}>重置</button>
      <span className="ml-1 text-xs md:text-sm text-white/70 tabular-nums">当前模拟已花 ¥{spent.toLocaleString()}</span>
    </div>
  )
}

export default function ToastShowcase() {
  const { showToast, closeAll } = useMilestoneToast()
  const [modeIndex, setModeIndex] = useState(0)
  const modes = ['单曲循环', '列表循环', '随机播放']

  const plainToasts = [
    ['成功', () => toast.success('登录成功！')],
    ['失败', () => toast.error('筹码不够，请充值')],
    ['提醒', () => toast('请先绑定账号密码再续费', { icon: '⚠️' })],
    ['普通', () => toast('列表循环')],
    ['两行', () => toast.success('版本已更新\n已自动重置全部数据', { duration: 4000 })],
    ['长文案', () => toast('支付成功但通行证密钥生成超时，请稍后在"输入通行证密钥"中查询', { icon: '⚠️', duration: 5000 })],
    ['连点合并（多点几下）', () => toast.success('做完6轮当日任务奖励150个钥匙', { id: 'add-common-keys', duration: 2000 })],
    ['同 id 换文案（多点几下）', () => {
      const next = (modeIndex + 1) % modes.length
      setModeIndex(next)
      toast(modes[next], { id: 'bgm-mode', duration: 1200 })
    }],
  ]

  return (
    <div className="fixed inset-0 overflow-y-auto overscroll-contain text-white" style={{ background: PAGE_BG }}>
      <AppToaster isMobile={false} />
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-10 flex flex-col gap-5">
        <header>
          <h1 className="text-xl md:text-2xl font-bold">通知与成就展示</h1>
          <p className="mt-1 text-sm text-white/65">全站普通通知、{MILESTONES.length} 个成就弹出、顶栏会员王冠四档，都是线上同一套组件。</p>
        </header>

        <Section title="顶栏 · 会员王冠四档" note="只存浏览器本地、只升不降：达成过 ¥20 万 / ¥50 万 / ¥100 万里程碑后换成伪神 / 半神 / 万氪之王；剩余天数的字色跟着变。">
          <div className="flex flex-col gap-3">
            {CROWN_TIERS.map((tier) => (
              <div key={tier} className="flex flex-col gap-1">
                <span className="text-xs text-white/70">{tier ? `达成过 ¥${tier.toLocaleString()}` : '默认'} · {CROWN_TIER_NAMES[tier]}</span>
                <FakeHeader tier={tier} />
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-4">
            {CROWN_TIERS.map((tier) => (
              <div key={tier} className="w-28 flex flex-col items-center gap-2">
                <span className={`relative flex rounded-[18px] ${tier === 1000000 ? 'crown-king' : ''}`}>
                  <MemberCrownIcon tier={tier} size={88} />
                </span>
                <span className="text-xs text-white/80">{CROWN_TIER_NAMES[tier]}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="普通通知" note="右上角；同类型同文案连点会合成一条并显示 ×N，固定 id 换文案只刷新不计数。">
          <div className="flex flex-wrap gap-2">
            {plainToasts.map(([label, fire]) => (
              <button key={label} className={BUTTON} onClick={fire}>{label}</button>
            ))}
            <button className={`${BUTTON} border-rose-300/40`} onClick={() => toast.dismiss()}>全部关闭</button>
          </div>
        </Section>

        <Section title="成就弹出 · 单个" note="右下角；点任意一个弹出。带选项的成就停留 15 秒。">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {MILESTONES.map((m) => (
              <button
                key={m.amount}
                onClick={() => showToast(m, { duration: m.buttons?.length ? 15000 : 5000 })}
                className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 p-2 text-left hover:bg-white/10 transition"
              >
                <AchievementIcon amount={m.amount} size={40} className="shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[11px] text-white/60 tabular-nums">¥{m.amount.toLocaleString()}{m.buttons ? ' · 带选项' : ''}</span>
                  <span className="block truncate text-xs md:text-sm text-white">{m.title}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3">
            <button className={`${BUTTON} border-rose-300/40`} onClick={closeAll}>收起全部成就</button>
          </div>
        </Section>

        <Section title="成就弹出 · 连续触发" note="走真实的追踪逻辑：一次跨过 3 个及以上时前面的按 5 倍速过，最后一个恢复常规速度。用独立存档、不会升你的顶栏王冠。">
          <BurstDemo />
        </Section>
      </div>
    </div>
  )
}
