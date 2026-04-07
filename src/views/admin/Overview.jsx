import { useState, useEffect, useCallback } from 'react'
import {
    BarChart, Bar, LineChart, Line, ComposedChart,
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import {
    FEE_RATE, TYPE_COLORS, TYPE_LABELS, fmt, fmtShort,
    PageHeader, IconBtn, KpiCard, ChartTip, MonthlyChartTip, HourlyChartTip,
    ErrorBanner, TypeBadge
} from './Shared'

export function Overview() {
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [stats, setStats] = useState(null)
    const [allCosts, setAllCosts] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

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

    function prevM() { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
    function nextM() { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

    const s = stats?.summary || {}
    const ml = `${year}-${String(month).padStart(2, '0')}`

    // 收入（仅真实订单）
    const realRevenue = s.realRevenue ?? 0
    const adminRevenue = s.adminRevenue ?? 0

    // 成本分解
    const realFees = Math.round(realRevenue * FEE_RATE)
    const adminFees = Math.round(adminRevenue * FEE_RATE)
    const extraCost = allCosts
        .filter(c => c.cost_date?.startsWith(ml))
        .reduce((sum, c) => sum + c.amount, 0)
    const extraCount = allCosts.filter(c => c.cost_date?.startsWith(ml)).length
    const totalCost = realFees + adminFees + extraCost
    const netProfit = realRevenue - realFees - adminFees - extraCost

    const gTx = s.growthPct != null ? (s.growthPct >= 0 ? `+${s.growthPct}%` : `${s.growthPct}%`) : '-'
    const gCl = s.growthPct == null ? 'text-[#E8EDF2]/40' : s.growthPct >= 0 ? 'text-[#39FF14]' : 'text-[#FF3366]'

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
        const rv = m.realRevenue || 0
        const av = m.adminRevenue || 0
        const cost = Math.round((rv + av) * FEE_RATE) + (extraCostByMonth[m.month] || 0)
        return { month: m.month, revenue: rv, cost, profit: rv - cost }
    })

    // 每日收入（补全0收入的日期）
    const daysInMonth = new Date(year, month, 0).getDate()
    const dailyMap = Object.fromEntries((stats?.dailyRevenue || []).map(d => [d.date, d.amount]))
    const dailyChartData = Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1
        const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        return { date, amount: dailyMap[date] ?? 0 }
    })

    // 24小时分布（补全0笔的小时）
    const hourlyData = Array.from({ length: 24 }, (_, h) => {
        const found = (stats?.hourlyDistribution || []).find(d => d.hour === h)
        return { hour: h, count: found?.count || 0 }
    })

    const ptT = (stats?.byType || []).reduce((a, d) => a + d.amount, 0)
    const ppT = (stats?.byPayType || []).reduce((a, d) => a + d.amount, 0)

    const PIE_SECTIONS = [
        { title: '会员类型 (TYPE)', data: stats?.byType, key: 'type', total: ptT },
        { title: '支付方式 (PAY) ', data: stats?.byPayType, key: 'pay_type', total: ppT },
    ]

    return (
        <div className="flex h-full flex-col relative">
            <PageHeader title="数据中枢 :: OVERVIEW">
                <IconBtn onClick={prevM}><ChevronLeft size={16} /></IconBtn>
                <div className="relative group px-4 py-1.5 overflow-hidden rounded-full border border-[#00F5D4]/30 bg-[#00F5D4]/5">
                    <div className="absolute inset-0 bg-[#00F5D4]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="relative z-10 w-24 block text-center font-['Roboto_Mono'] text-sm tracking-widest text-[#00F5D4] drop-shadow-[0_0_5px_rgba(0,245,212,0.5)]">{ml}</span>
                </div>
                <IconBtn onClick={nextM}><ChevronRight size={16} /></IconBtn>
                <IconBtn onClick={load} disabled={loading} className="ml-2">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </IconBtn>
            </PageHeader>

            <div className="flex-1 space-y-6 overflow-y-auto scrollbar-hide p-8 relative z-10">
                {error && <ErrorBanner msg={error} />}

                {/* KPI row */}
                <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
                    <KpiCard label="真实收入 REVENUE" value={fmt(realRevenue)} sub={`管理员购置 ${fmt(adminRevenue)}`} highlight />
                    <KpiCard label="订单笔数 ORDERS" value={s.realOrderCount ?? '-'} sub={`含管理员 ${s.adminOrderCount ?? 0} 笔`} />
                    <KpiCard label="环比增长 GROWTH" value={gTx} sub={s.prevMonthRevenue ? `上月 ${fmt(s.prevMonthRevenue)}` : '上月无数据'} subColor={gCl} />
                    <KpiCard label="真实净利润 PROFIT" value={`${netProfit >= 0 ? '+' : ''}${fmt(netProfit)}`} sub="扣手续费及所有成本" subColor={netProfit >= 0 ? 'text-[#39FF14]' : 'text-[#FF3366]'} />
                </div>

                {/* Cost Analysis Line */}
                <div className="relative overflow-hidden rounded-[2rem] border border-[#141825] bg-[#0B0E1A]/60 p-6 backdrop-blur-md">
                    {/* Subtle decoration lines */}
                    <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#141825] to-transparent"></div>
                    <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#141825] to-transparent"></div>
                    <div className="absolute top-8 bottom-8 left-0 w-px bg-gradient-to-b from-transparent via-[#00F5D4]/20 to-transparent"></div>

                    <div className="flex items-center gap-3 mb-6 relative">
                        <div className="h-4 w-1 bg-[#FF3366] shadow-[0_0_8px_rgba(255,51,102,0.6)]"></div>
                        <p className="font-['DM_Sans'] text-sm font-bold tracking-[0.15em] text-[#E8EDF2] uppercase">
                            SYS.COSTS // 本月成本 & 利润分析
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-x-12 gap-y-8 pl-4">
                        <div className="group">
                            <p className="font-['DM_Sans'] text-[10px] font-bold tracking-widest text-[#E8EDF2]/40 uppercase mb-2">真实订单手续费</p>
                            <p className="font-['Roboto_Mono'] text-xl font-bold text-[#FF3366] drop-shadow-[0_0_8px_rgba(255,51,102,0.3)] group-hover:drop-shadow-[0_0_12px_rgba(255,51,102,0.6)] transition-all">-{fmt(realFees)}</p>
                            <p className="mt-1 font-['Roboto_Mono'] text-xs text-[#E8EDF2]/30">{fmt(realRevenue)} × 0.9%</p>
                        </div>
                        <div className="group">
                            <p className="font-['DM_Sans'] text-[10px] font-bold tracking-widest text-[#E8EDF2]/40 uppercase mb-2">管理员购置手续费</p>
                            <p className="font-['Roboto_Mono'] text-xl font-bold text-[#FF3366] drop-shadow-[0_0_8px_rgba(255,51,102,0.3)] group-hover:drop-shadow-[0_0_12px_rgba(255,51,102,0.6)] transition-all">-{fmt(adminFees)}</p>
                            <p className="mt-1 font-['Roboto_Mono'] text-xs text-[#E8EDF2]/30">自购 {fmt(adminRevenue)} × 0.9%</p>
                        </div>
                        <div className="group">
                            <p className="font-['DM_Sans'] text-[10px] font-bold tracking-widest text-[#E8EDF2]/40 uppercase mb-2">额外支出 EXTRA</p>
                            <p className="font-['Roboto_Mono'] text-xl font-bold text-[#FF3366] drop-shadow-[0_0_8px_rgba(255,51,102,0.3)] group-hover:drop-shadow-[0_0_12px_rgba(255,51,102,0.6)] transition-all">-{fmt(extraCost)}</p>
                            <p className="mt-1 font-['DM_Sans'] text-xs text-[#E8EDF2]/30">{extraCount} 笔手动记录</p>
                        </div>

                        <div className="border-l border-[#141825] pl-10 group relative">
                            <div className="absolute left-0 top-0 w-[1px] h-full bg-gradient-to-b from-transparent via-[#00F5D4]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <p className="font-['DM_Sans'] text-[10px] font-bold tracking-widest text-[#E8EDF2]/40 uppercase mb-2">本月总成本 TOTAL</p>
                            <p className="font-['Roboto_Mono'] text-2xl font-bold text-[#FF3366] drop-shadow-[0_0_8px_rgba(255,51,102,0.3)]">-{fmt(totalCost)}</p>
                        </div>
                        <div className="border-l border-[#141825] pl-10 group relative">
                            <div className="absolute left-0 top-0 w-[1px] h-full bg-gradient-to-b from-transparent via-[#00F5D4]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <p className="font-['DM_Sans'] text-[10px] font-bold tracking-widest text-[#E8EDF2]/40 uppercase mb-2">估算净利润 NET</p>
                            <p className={`font-['Roboto_Mono'] text-2xl font-bold ${netProfit >= 0 ? 'text-[#39FF14] drop-shadow-[0_0_8px_rgba(57,255,20,0.4)]' : 'text-[#FF3366] drop-shadow-[0_0_8px_rgba(255,51,102,0.3)]'}`}>
                                {netProfit >= 0 ? '+' : ''}{fmt(netProfit)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2×2 Graphs */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                    {/* Left Top: Yearly Trend */}
                    <div className="rounded-[2rem] border border-[#141825] bg-[#0B0E1A]/80 p-6 min-w-0 transition-all hover:border-[#141825] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center justify-between mb-6">
                            <p className="font-['DM_Sans'] text-xs font-bold tracking-widest pl-2 text-[#E8EDF2]/60 uppercase relative">
                                <span className="absolute left-0 top-[2px] h-[10px] w-1 bg-[#00F5D4]"></span>
                                YEARLY.TREND // 过去 12 个月趋势
                            </p>
                        </div>
                        <div className="w-full overflow-hidden">
                            {monthlyChartData.length ? (
                                <ResponsiveContainer width="100%" height={240}>
                                    <ComposedChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="25%" barGap={0}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#141825" vertical={false} />
                                        <XAxis dataKey="month" tick={{ fill: '#E8EDF2', fontSize: 10, opacity: 0.5, fontFamily: 'Roboto Mono' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                                        <YAxis tickFormatter={fmtShort} tick={{ fill: '#E8EDF2', fontSize: 10, opacity: 0.5, fontFamily: 'Roboto Mono' }} tickLine={false} axisLine={false} width={44} />
                                        <Tooltip content={<MonthlyChartTip />} cursor={{ fill: 'rgba(0,245,212,0.05)' }} />
                                        <Legend wrapperStyle={{ fontSize: 10, color: '#E8EDF2', opacity: 0.6, paddingTop: 10, fontFamily: 'DM Sans', letterSpacing: '0.1em' }} />
                                        <Bar dataKey="revenue" fill="#00F5D4" radius={[2, 2, 0, 0]} name="收入" />
                                        <Bar dataKey="cost" fill="#FF3366" radius={[2, 2, 0, 0]} name="成本" />
                                        <Line type="monotone" dataKey="profit" stroke="#39FF14" strokeWidth={2} dot={{ fill: '#39FF14', r: 2, strokeWidth: 0 }} activeDot={{ r: 4, stroke: '#141825', strokeWidth: 2 }} name="利润" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-[240px] items-center justify-center font-['Roboto_Mono'] text-xs text-[#E8EDF2]/30 uppercase tracking-widest border border-dashed border-[#141825] rounded-xl">NO_DATA_FOUND</div>
                            )}
                        </div>
                    </div>

                    {/* Right Top: Daily Revenue */}
                    <div className="rounded-[2rem] border border-[#141825] bg-[#0B0E1A]/80 p-6 min-w-0 transition-all hover:border-[#141825] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center justify-between mb-6">
                            <p className="font-['DM_Sans'] text-xs font-bold tracking-widest pl-2 text-[#E8EDF2]/60 uppercase relative">
                                <span className="absolute left-0 top-[2px] h-[10px] w-1 bg-[#00F5D4]"></span>
                                DAILY.REVENUE // {ml} 每日收入
                            </p>
                        </div>
                        <div className="w-full overflow-hidden">
                            {dailyChartData.some(d => d.amount > 0) ? (
                                <ResponsiveContainer width="100%" height={240}>
                                    <LineChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#141825" vertical={false} />
                                        <XAxis dataKey="date" tickFormatter={v => v.slice(8)} tick={{ fill: '#E8EDF2', fontSize: 10, opacity: 0.5, fontFamily: 'Roboto Mono' }} tickLine={false} axisLine={false} />
                                        <YAxis tickFormatter={fmtShort} tick={{ fill: '#E8EDF2', fontSize: 10, opacity: 0.5, fontFamily: 'Roboto Mono' }} tickLine={false} axisLine={false} width={44} />
                                        <Tooltip content={<ChartTip />} cursor={{ stroke: 'rgba(0,245,212,0.2)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                        <Line type="monotone" dataKey="amount" stroke="#00F5D4" strokeWidth={2} dot={{ fill: '#00F5D4', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, stroke: '#00F5D4', strokeWidth: 2, fill: '#0B0E1A' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-[240px] items-center justify-center font-['Roboto_Mono'] text-xs text-[#E8EDF2]/30 uppercase tracking-widest border border-dashed border-[#141825] rounded-xl">NO_DATA_FOUND</div>
                            )}
                        </div>
                    </div>

                    {/* Left Bottom: Hourly Tx */}
                    <div className="rounded-[2rem] border border-[#141825] bg-[#0B0E1A]/80 p-6 min-w-0 transition-all hover:border-[#141825] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center justify-between mb-6">
                            <p className="font-['DM_Sans'] text-xs font-bold tracking-widest pl-2 text-[#E8EDF2]/60 uppercase relative">
                                <span className="absolute left-0 top-[2px] h-[10px] w-1 bg-[#9D4EDD]"></span>
                                HOURLY.TX // {ml} 交易时间分布
                            </p>
                        </div>
                        <div className="w-full overflow-hidden">
                            {hourlyData.some(d => d.count > 0) ? (
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="15%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#141825" vertical={false} />
                                        <XAxis dataKey="hour" tick={{ fill: '#E8EDF2', fontSize: 10, opacity: 0.5, fontFamily: 'Roboto Mono' }} tickLine={false} axisLine={false}
                                            tickFormatter={v => v % 6 === 0 ? `${v}:00` : ''} />
                                        <YAxis tick={{ fill: '#E8EDF2', fontSize: 10, opacity: 0.5, fontFamily: 'Roboto Mono' }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                                        <Tooltip content={<HourlyChartTip />} cursor={{ fill: 'rgba(157,78,221,0.1)' }} />
                                        <Bar dataKey="count" fill="#9D4EDD" radius={[4, 4, 0, 0]} name="订单数" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-[240px] items-center justify-center font-['Roboto_Mono'] text-xs text-[#E8EDF2]/30 uppercase tracking-widest border border-dashed border-[#141825] rounded-xl">NO_DATA_FOUND</div>
                            )}
                        </div>
                    </div>

                    {/* Right Bottom: Pie Dist */}
                    <div className="rounded-[2rem] border border-[#141825] bg-[#0B0E1A]/80 p-6 min-w-0 transition-all hover:border-[#141825] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center justify-between mb-6">
                            <p className="font-['DM_Sans'] text-xs font-bold tracking-widest pl-2 text-[#E8EDF2]/60 uppercase relative">
                                <span className="absolute left-0 top-[2px] h-[10px] w-1 bg-[#00F5D4]"></span>
                                DISTRIBUTION // 本月分布档案
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 min-w-0 pt-2">
                            {PIE_SECTIONS.map(({ title, data: pd, key, total }) => (
                                <div key={title} className="min-w-0 overflow-hidden">
                                    <p className="mb-4 text-center font-['DM_Sans'] text-[10px] font-bold tracking-widest text-[#E8EDF2]/50 uppercase">{title}</p>
                                    {pd?.length ? (
                                        <>
                                            <ResponsiveContainer width="100%" height={140}>
                                                <PieChart>
                                                    <Pie
                                                        data={pd}
                                                        dataKey="amount"
                                                        nameKey={key}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={40}
                                                        outerRadius={56}
                                                        labelLine={false}
                                                        stroke="none"
                                                    >
                                                        {pd.map(e => <Cell key={e[key]} fill={TYPE_COLORS[e[key]] || '#141825'} style={{ filter: `drop-shadow(0 0 6px ${TYPE_COLORS[e[key]] || '#141825'})` }} />)}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: 'rgba(11,14,26,0.9)', borderColor: 'rgba(0,245,212,0.2)', borderRadius: '12px', backdropFilter: 'blur(8px)', color: '#E8EDF2', fontSize: '12px', fontFamily: 'Roboto Mono' }}
                                                        itemStyle={{ color: '#E8EDF2' }}
                                                        formatter={(v, n) => [fmt(v), TYPE_LABELS[n] || n]}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="mt-4 flex flex-col items-center gap-2">
                                                {pd.map(d => {
                                                    const p = total > 0 ? Math.round(d.amount / total * 100) : 0
                                                    return (
                                                        <div key={d[key]} className="flex w-full max-w-[140px] items-center justify-between gap-2 border-b border-[#141825]/50 pb-1">
                                                            <span className="flex items-center gap-2 font-['DM_Sans'] text-[10px] font-medium uppercase tracking-wider text-[#E8EDF2]/60">
                                                                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: TYPE_COLORS[d[key]] || '#141825', boxShadow: `0 0 5px ${TYPE_COLORS[d[key]] || '#141825'}` }} />
                                                                {TYPE_LABELS[d[key]] || d[key]}
                                                            </span>
                                                            <span className="font-['Roboto_Mono'] text-[10px] font-bold text-[#E8EDF2]">{p}%</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex h-[180px] items-center justify-center font-['Roboto_Mono'] text-xs text-[#E8EDF2]/30 uppercase tracking-widest border border-dashed border-[#141825] rounded-xl mx-2">NO_DATA</div>
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
