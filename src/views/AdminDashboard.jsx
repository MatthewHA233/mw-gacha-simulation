'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  LayoutDashboard, Receipt, Wallet, Menu, X,
  RefreshCw, ChevronLeft, ChevronRight, Trash2,
} from 'lucide-react'

const ADMIN_ID  = '15727124853'
const FEE_RATE  = 0.009   // 0.9% 支付手续费

const TYPE_COLORS = {
  monthly: '#3b82f6', yearly: '#22c55e', unknown: '#6b7280',
  alipay:  '#3b82f6', wechat: '#22c55e',
}
const TYPE_LABELS = {
  monthly: '月度会员', yearly: '年度会员', unknown: '未知',
  alipay:  '支付宝',  wechat: '微信支付',
}

const fmt      = c => `¥${(c / 100).toFixed(2)}`
const fmtShort = c => { const y = c/100; return y>=10000?`¥${(y/10000).toFixed(1)}w`:y>=1000?`¥${(y/1000).toFixed(1)}k`:`¥${y.toFixed(0)}` }
const fmtDate  = iso => iso ? new Date(iso).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '-'
const todayStr = () => new Date().toISOString().slice(0, 10)

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'overview', label: '数据总览', Icon: LayoutDashboard },
  { id: 'orders',   label: '订单明细', Icon: Receipt },
  { id: 'costs',    label: '成本记录', Icon: Wallet },
]

function Sidebar({ active, onChange, open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={onClose} />}
      <aside className={`
        fixed inset-y-0 left-0 z-30 flex w-52 flex-shrink-0 flex-col
        border-r border-gray-800 bg-gray-900
        transition-transform duration-200
        md:static md:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-800 px-5">
          <span className="text-sm font-semibold text-white">管理后台</span>
          <button onClick={onClose} className="rounded p-1 text-gray-500 hover:text-gray-300 md:hidden">
            <X size={15} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => { onChange(id); onClose() }}
              className={`
                flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                ${active === id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>

        <p className="border-t border-gray-800 p-4 text-center text-xs text-gray-700">Admin Panel</p>
      </aside>
    </>
  )
}

// ── Shared components ─────────────────────────────────────────────────────────
function PageHeader({ title, children }) {
  return (
    <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900 px-6">
      <h1 className="text-sm font-semibold text-white">{title}</h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

function IconBtn({ onClick, disabled, children, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30 transition-colors ${className}`}
    >
      {children}
    </button>
  )
}

function KpiCard({ label, value, sub, subColor = 'text-gray-500' }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <p className="mb-2 text-xs text-gray-500">{label}</p>
      <p className="truncate text-2xl font-bold text-white">{value}</p>
      {sub && <p className={`mt-1 truncate text-xs ${subColor}`}>{sub}</p>}
    </div>
  )
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs shadow-xl">
      <p className="mb-0.5 text-gray-400">{label}</p>
      <p className="font-semibold text-white">{fmt(payload[0].value)}</p>
    </div>
  )
}

function MonthlyChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs shadow-xl space-y-0.5">
      <p className="mb-1 text-gray-400">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color || p.stroke }}>
          {p.name}：{fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

function HourlyChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs shadow-xl">
      <p className="mb-0.5 text-gray-400">{String(label).padStart(2, '0')}:00 – {String((label + 1) % 24).padStart(2, '0')}:00</p>
      <p className="font-semibold text-white">{payload[0].value} 笔</p>
    </div>
  )
}

function TypeBadge({ value }) {
  const cls = value === 'monthly' || value === 'alipay'
    ? 'bg-blue-950 text-blue-400'
    : value === 'yearly' || value === 'wechat'
      ? 'bg-green-950 text-green-400'
      : 'bg-gray-800 text-gray-400'
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {TYPE_LABELS[value] || value}
    </span>
  )
}

function ErrorBanner({ msg }) {
  return (
    <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400">
      {msg}
    </div>
  )
}

// ── Overview ──────────────────────────────────────────────────────────────────
function Overview() {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [stats,    setStats]    = useState(null)
  const [allCosts, setAllCosts] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [sRes, cRes] = await Promise.all([
        fetch(`/api/admin/stats?year=${year}&month=${month}`),
        fetch('/api/admin/costs'),
      ])
      const [sData, cData] = await Promise.all([sRes.json(), cRes.json()])
      if (!sRes.ok) throw new Error(sData.error || '统计请求失败')
      if (!cRes.ok) throw new Error(cData.error || '成本请求失败')
      setStats(sData)
      setAllCosts(cData.costs || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [year, month])

  useEffect(() => { load() }, [load])

  function prevM() { if (month === 1) { setYear(y => y-1); setMonth(12) } else setMonth(m => m-1) }
  function nextM() { if (month === 12) { setYear(y => y+1); setMonth(1) } else setMonth(m => m+1) }

  const s  = stats?.summary || {}
  const ml = `${year}-${String(month).padStart(2, '0')}`

  // 收入（仅真实订单）
  const realRevenue  = s.realRevenue  ?? 0
  const adminRevenue = s.adminRevenue ?? 0

  // 成本分解
  const realFees  = Math.round(realRevenue  * FEE_RATE)
  const adminFees = Math.round(adminRevenue * FEE_RATE)
  const extraCost = allCosts
    .filter(c => c.cost_date?.startsWith(ml))
    .reduce((sum, c) => sum + c.amount, 0)
  const extraCount = allCosts.filter(c => c.cost_date?.startsWith(ml)).length
  const totalCost = realFees + adminFees + extraCost
  const netProfit = realRevenue - realFees - adminFees - extraCost

  const gTx = s.growthPct != null ? (s.growthPct >= 0 ? `+${s.growthPct}%` : `${s.growthPct}%`) : '-'
  const gCl = s.growthPct == null ? 'text-gray-500' : s.growthPct >= 0 ? 'text-green-400' : 'text-red-400'
  // 按月汇总额外支出
  const extraCostByMonth = {}
  allCosts.forEach(c => {
    if (c.cost_date) {
      const mon = c.cost_date.slice(0, 7)
      extraCostByMonth[mon] = (extraCostByMonth[mon] || 0) + c.amount
    }
  })

  // 过去12个月：收入 / 成本 / 利润
  const monthlyChartData = (stats?.monthlyRevenue || []).map(m => {
    const rv   = m.realRevenue  || 0
    const av   = m.adminRevenue || 0
    const cost = Math.round((rv + av) * FEE_RATE) + (extraCostByMonth[m.month] || 0)
    return { month: m.month, revenue: rv, cost, profit: rv - cost }
  })

  // 24小时分布（补全0笔的小时）
  const hourlyData = Array.from({ length: 24 }, (_, h) => {
    const found = (stats?.hourlyDistribution || []).find(d => d.hour === h)
    return { hour: h, count: found?.count || 0 }
  })

  const ptT = (stats?.byType    || []).reduce((a, d) => a + d.amount, 0)
  const ppT = (stats?.byPayType || []).reduce((a, d) => a + d.amount, 0)

  const PIE_SECTIONS = [
    { title: '会员类型', data: stats?.byType,    key: 'type',     total: ptT },
    { title: '支付方式', data: stats?.byPayType, key: 'pay_type', total: ppT },
  ]

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="数据总览">
        <IconBtn onClick={prevM}><ChevronLeft size={14} /></IconBtn>
        <span className="w-20 select-none text-center font-mono text-sm text-gray-200">{ml}</span>
        <IconBtn onClick={nextM}><ChevronRight size={14} /></IconBtn>
        <IconBtn onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </IconBtn>
      </PageHeader>

      <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hide p-6">
        {error && <ErrorBanner msg={error} />}

        {/* KPI row — 基于真实收入（剔除管理员购置） */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="真实收入"   value={fmt(realRevenue)}                                     sub={`管理员购置 ${fmt(adminRevenue)}`} />
          <KpiCard label="订单笔数"   value={s.realOrderCount ?? '-'}                              sub={`含管理员 ${s.adminOrderCount ?? 0} 笔`} />
          <KpiCard label="环比增长"   value={gTx}                                                  sub={s.prevMonthRevenue ? `上月 ${fmt(s.prevMonthRevenue)}` : '上月无数据'} subColor={gCl} />
          <KpiCard label="真实净利润" value={`${netProfit >= 0 ? '+' : ''}${fmt(netProfit)}`} sub="扣手续费及所有成本" subColor={netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        </div>

        {/* 成本分析卡 */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="mb-4 text-sm font-medium text-gray-300">本月成本 & 利润</p>
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-gray-500">真实订单手续费</p>
              <p className="mt-1 text-base font-bold text-red-400">-{fmt(realFees)}</p>
              <p className="mt-0.5 text-xs text-gray-600">{fmt(realRevenue)} × 0.9%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">管理员购置手续费</p>
              <p className="mt-1 text-base font-bold text-red-400">-{fmt(adminFees)}</p>
              <p className="mt-0.5 text-xs text-gray-600">自购 {fmt(adminRevenue)} × 0.9%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">额外支出</p>
              <p className="mt-1 text-base font-bold text-red-400">-{fmt(extraCost)}</p>
              <p className="mt-0.5 text-xs text-gray-600">{extraCount} 笔手动记录</p>
            </div>
            <div className="border-l border-gray-800 pl-8">
              <p className="text-xs text-gray-500">本月总成本</p>
              <p className="mt-1 text-base font-bold text-red-400">-{fmt(totalCost)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">估算净利润</p>
              <p className={`mt-1 text-base font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {netProfit >= 0 ? '+' : ''}{fmt(netProfit)}
              </p>
            </div>
          </div>
        </div>

        {/* 2×2 图表网格 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

          {/* 左上：过去12个月 收入/成本/利润 */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 min-w-0">
            <p className="mb-4 text-sm font-medium text-gray-300">过去 12 个月趋势</p>
            <div className="w-full overflow-hidden">
              {monthlyChartData.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={monthlyChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%" barGap={0}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} width={44} />
                    <Tooltip content={<MonthlyChartTip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Legend wrapperStyle={{ fontSize: 10, color: '#9ca3af', paddingTop: 6 }} />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[2, 2, 0, 0]} name="收入" />
                    <Bar dataKey="cost"    fill="#ef4444" radius={[2, 2, 0, 0]} name="成本" />
                    <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 2 }} activeDot={{ r: 4 }} name="利润" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-gray-600">暂无数据</div>
              )}
            </div>
          </div>

          {/* 右上：当月每日收入 */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 min-w-0">
            <p className="mb-4 text-sm font-medium text-gray-300">{ml} 每日收入</p>
            <div className="w-full overflow-hidden">
              {stats?.dailyRevenue?.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stats.dailyRevenue} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={v => v.slice(8)} tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} width={44} />
                    <Tooltip content={<ChartTip />} />
                    <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-gray-600">本月暂无数据</div>
              )}
            </div>
          </div>

          {/* 左下：当月交易时间分布（按小时） */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 min-w-0">
            <p className="mb-4 text-sm font-medium text-gray-300">{ml} 交易时间分布</p>
            <div className="w-full overflow-hidden">
              {hourlyData.some(d => d.count > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hourlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="10%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fill: '#6b7280', fontSize: 9 }} tickLine={false} axisLine={false}
                      tickFormatter={v => v % 6 === 0 ? `${v}:00` : ''} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                    <Tooltip content={<HourlyChartTip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[2, 2, 0, 0]} name="订单数" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-gray-600">本月暂无数据</div>
              )}
            </div>
          </div>

          {/* 右下：本月分布饼图 */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 min-w-0">
            <p className="mb-4 text-sm font-medium text-gray-300">本月分布</p>
            <div className="grid grid-cols-2 gap-3 min-w-0">
              {PIE_SECTIONS.map(({ title, data: pd, key, total }) => (
                <div key={title} className="min-w-0 overflow-hidden">
                  <p className="mb-1 text-center text-xs text-gray-500">{title}</p>
                  {pd?.length ? (
                    <>
                      <ResponsiveContainer width="100%" height={120}>
                        <PieChart>
                          <Pie data={pd} dataKey="amount" nameKey={key} cx="50%" cy="50%" outerRadius={42} labelLine={false}
                            label={({ name, value }) => { const p = total>0?Math.round(value/total*100):0; return p>8?`${p}%`:'' }}
                          >
                            {pd.map(e => <Cell key={e[key]} fill={TYPE_COLORS[e[key]] || '#6b7280'} />)}
                          </Pie>
                          <Tooltip formatter={(v, n) => [fmt(v), TYPE_LABELS[n] || n]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-1 flex flex-wrap justify-center gap-x-2 gap-y-1">
                        {pd.map(d => (
                          <span key={d[key]} className="flex items-center gap-1 text-xs text-gray-400">
                            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: TYPE_COLORS[d[key]] || '#6b7280' }} />
                            {TYPE_LABELS[d[key]] || d[key]}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex h-[120px] items-center justify-center text-xs text-gray-600">暂无</div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Orders ────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20

function Pagination({ page, totalPages, total, onChange }) {
  if (totalPages <= 1) return null

  let start = Math.max(1, page - 2)
  const end = Math.min(totalPages, start + 4)
  if (end - start < 4) start = Math.max(1, end - 4)
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  return (
    <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-800 px-5 py-3">
      <span className="text-xs text-gray-500">
        第 {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, total)} 条，共 {total} 条
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page-1)} disabled={page===1}
          className="rounded-md px-2.5 py-1.5 text-xs text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 transition-colors">
          ← 上一页
        </button>
        {pages.map(p => (
          <button key={p} onClick={() => onChange(p)}
            className={`h-7 w-7 rounded-md text-xs transition-colors ${
              p === page ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >{p}</button>
        ))}
        <button onClick={() => onChange(page+1)} disabled={page===totalPages}
          className="rounded-md px-2.5 py-1.5 text-xs text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 transition-colors">
          下一页 →
        </button>
      </div>
    </div>
  )
}

function Orders() {
  const [page,    setPage]    = useState(1)
  const [data,    setData]    = useState({ orders: [], total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/admin/orders?page=${page}&limit=${PAGE_SIZE}`)
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || '请求失败')
      setData(d)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { load() }, [load])

  async function toggleAdmin(out_trade_no, current) {
    // 乐观更新
    setData(prev => ({
      ...prev,
      orders: prev.orders.map(o =>
        o.out_trade_no === out_trade_no ? { ...o, is_admin_purchase: !current } : o
      ),
    }))
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(out_trade_no)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_admin_purchase: !current }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // 回滚
      setData(prev => ({
        ...prev,
        orders: prev.orders.map(o =>
          o.out_trade_no === out_trade_no ? { ...o, is_admin_purchase: current } : o
        ),
      }))
    }
  }

  const { orders, total, totalPages } = data

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={`订单明细${total ? `　·　共 ${total} 条` : ''}`}>
        <IconBtn onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </IconBtn>
      </PageHeader>

      <div className="flex flex-1 flex-col gap-0 overflow-hidden p-6">
        {error && <ErrorBanner msg={error} />}

        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
          <div className="flex-1 overflow-auto scrollbar-hide">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="sticky top-0 z-10 bg-gray-900">
                <tr className="border-b border-gray-800">
                  {['#', '订单号', '序列号', '金额', '净额/手续费', '类型', '支付方式', '属性', '时间'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} className="py-20 text-center text-sm text-gray-600">
                    <RefreshCw size={16} className="mx-auto mb-2 animate-spin opacity-40" />加载中...
                  </td></tr>
                )}
                {!loading && orders.length === 0 && (
                  <tr><td colSpan={9} className="py-20 text-center text-sm text-gray-600">暂无订单数据</td></tr>
                )}
                {!loading && orders.map((o, i) => {
                  const fee = Math.round(o.amount * FEE_RATE)
                  const net = o.amount - fee
                  return (
                    <tr key={o.out_trade_no} className="border-b border-gray-800 last:border-0 hover:bg-gray-800 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-600">{(page-1)*PAGE_SIZE + i + 1}</td>
                      <td className="max-w-[160px] px-4 py-3 font-mono text-xs text-gray-400">
                        <span className="block truncate" title={o.out_trade_no}>{o.out_trade_no}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {o.activation_code
                          ? <span className="text-blue-400" title={o.activation_code}>{o.activation_code}</span>
                          : <span className="text-gray-700">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">{fmt(o.amount)}</td>
                      <td className="px-4 py-3 text-xs font-medium">
                        {o.is_admin_purchase
                          ? <span className="text-red-400" title="管理员自购：仅计手续费为成本">-{fmt(fee)}</span>
                          : <span className="text-emerald-400" title="实际到手（扣0.9%手续费）">+{fmt(net)}</span>
                        }
                      </td>
                      <td className="px-4 py-3"><TypeBadge value={o.membership_type} /></td>
                      <td className="px-4 py-3"><TypeBadge value={o.pay_type} /></td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleAdmin(o.out_trade_no, o.is_admin_purchase)}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                            o.is_admin_purchase
                              ? 'bg-amber-950 text-amber-400 hover:bg-amber-900'
                              : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
                          }`}
                        >
                          {o.is_admin_purchase ? '管理员' : '普通'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(o.pay_time)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
        </div>
      </div>
    </div>
  )
}

// ── Costs ─────────────────────────────────────────────────────────────────────
function Costs() {
  const [costs,   setCosts]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [adding,  setAdding]  = useState(false)
  const [form, setForm] = useState({ date: todayStr(), description: '', amount: '' })

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/costs')
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || '请求失败')
      setCosts(d.costs || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function addCost() {
    const amountCents = Math.round(parseFloat(form.amount) * 100)
    if (!form.description.trim() || !form.date || isNaN(amountCents) || amountCents <= 0) return
    setAdding(true)
    try {
      const res = await fetch('/api/admin/costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountCents, description: form.description.trim(), cost_date: form.date }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || '添加失败')
      setCosts(prev => [d.cost, ...prev])
      setForm(f => ({ ...f, description: '', amount: '' }))
    } catch (e) { setError(e.message) }
    finally { setAdding(false) }
  }

  async function removeCost(id) {
    setCosts(prev => prev.filter(c => c.id !== id))
    try {
      const res = await fetch(`/api/admin/costs/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
    } catch {
      load() // 出错则重新加载
    }
  }

  const total = costs.reduce((s, c) => s + c.amount, 0)

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="成本记录">
        <IconBtn onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </IconBtn>
      </PageHeader>

      <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hide p-6">
        {error && <ErrorBanner msg={error} />}

        {/* 添加表单 */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="mb-4 text-sm font-medium text-gray-300">记录新支出</p>
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="说明（如：CDN+OSS 月费）"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addCost()}
              className="min-w-[180px] flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">¥</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addCost()}
                className="w-28 rounded-lg border border-gray-700 bg-gray-800 py-2 pl-7 pr-3 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={addCost}
              disabled={adding || !form.description.trim() || !form.amount}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 transition-colors"
            >
              {adding ? '添加中…' : '添加'}
            </button>
          </div>
        </div>

        {/* 成本列表 */}
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
          <div className="overflow-auto scrollbar-hide">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="sticky top-0 bg-gray-900">
                <tr className="border-b border-gray-800">
                  {['日期', '说明', '金额', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={4} className="py-16 text-center text-sm text-gray-600">
                    <RefreshCw size={16} className="mx-auto mb-2 animate-spin opacity-40" />加载中...
                  </td></tr>
                )}
                {!loading && costs.length === 0 && (
                  <tr><td colSpan={4} className="py-16 text-center text-sm text-gray-600">暂无成本记录</td></tr>
                )}
                {!loading && costs.map(c => (
                  <tr key={c.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{c.cost_date}</td>
                    <td className="px-4 py-3 text-sm text-white">{c.description}</td>
                    <td className="px-4 py-3 font-semibold text-red-400 whitespace-nowrap">{fmt(c.amount)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeCost(c.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {costs.length > 0 && (
                <tfoot>
                  <tr className="border-t border-gray-800 bg-gray-900">
                    <td colSpan={2} className="px-4 py-3 text-xs font-medium text-gray-500">合计</td>
                    <td className="px-4 py-3 font-bold text-red-400">{fmt(total)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* 说明 */}
        <p className="text-xs text-gray-700">
          此处仅记录额外人工支出（CDN、域名、服务器等）。支付手续费（0.9%）已在订单明细的「净额」列自动计算。
        </p>
      </div>
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { userAccount, loading } = useAuth()
  const isAdmin = userAccount?.login_id === ADMIN_ID
  const [nav,    setNav]    = useState('overview')
  const [drawer, setDrawer] = useState(false)

  if (loading) return (
    <div className="flex h-full items-center justify-center bg-gray-950">
      <p className="text-sm text-gray-500">加载中...</p>
    </div>
  )
  if (!userAccount) return (
    <div className="flex h-full items-center justify-center bg-gray-950">
      <div className="text-center">
        <p className="font-medium text-gray-300">请先登录</p>
        <p className="mt-1 text-sm text-gray-600">管理员面板需要登录后访问</p>
      </div>
    </div>
  )
  if (!isAdmin) return (
    <div className="flex h-full items-center justify-center bg-gray-950">
      <div className="text-center">
        <p className="font-medium text-red-400">无权访问</p>
        <p className="mt-1 text-sm text-gray-600">该页面仅限管理员使用</p>
      </div>
    </div>
  )

  return (
    <div className="flex h-full overflow-hidden bg-gray-950 text-white">
      <Sidebar active={nav} onChange={setNav} open={drawer} onClose={() => setDrawer(false)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="flex h-12 flex-shrink-0 items-center gap-3 border-b border-gray-800 bg-gray-900 px-4 md:hidden">
          <button onClick={() => setDrawer(true)} className="text-gray-400 hover:text-white transition-colors">
            <Menu size={18} />
          </button>
          <span className="text-sm font-medium text-white">
            {NAV.find(n => n.id === nav)?.label}
          </span>
        </div>

        <div className="flex-1 overflow-hidden">
          {nav === 'overview' ? <Overview /> : nav === 'orders' ? <Orders /> : <Costs />}
        </div>
      </div>
    </div>
  )
}
