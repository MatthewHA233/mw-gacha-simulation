import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Trash2 } from 'lucide-react'
import {
    fmt, todayStr,
    PageHeader, IconBtn, ErrorBanner
} from './Shared'

export function Costs() {
    const [costs, setCosts] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [adding, setAdding] = useState(false)
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
        <div className="flex h-full flex-col relative z-10 w-full overflow-hidden">
            <PageHeader title="系统耗材 :: SYS.COSTS">
                <IconBtn onClick={load} disabled={loading}>
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </IconBtn>
            </PageHeader>

            <div className="flex-1 space-y-6 overflow-y-auto scrollbar-hide p-6 md:p-8">
                {error && <ErrorBanner msg={error} />}

                {/* Input Form Box */}
                <div className="group overflow-hidden rounded-[2rem] border border-[#141825] bg-[#0B0E1A]/80 p-8 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-500 hover:border-[#00F5D4]/30">
                    <div className="flex items-center gap-3 mb-6 relative">
                        <div className="h-4 w-1 bg-[#00F5D4] shadow-[0_0_8px_rgba(0,245,212,0.6)]"></div>
                        <p className="font-['DM_Sans'] text-sm font-bold tracking-[0.15em] text-[#E8EDF2] uppercase">
                            NEW EVENT // 记录新支出
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="relative group/input">
                            <input
                                type="date"
                                value={form.date}
                                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                className="w-[140px] rounded-xl border border-[#141825] bg-[#141825]/50 px-4 py-3 font-['Roboto_Mono'] text-xs font-medium text-[#E8EDF2] tracking-wider transition-all duration-300 placeholder:text-[#E8EDF2]/20 focus:border-[#00F5D4]/50 focus:bg-[#00F5D4]/5 focus:shadow-[0_0_15px_rgba(0,245,212,0.1)] focus:outline-none"
                            />
                            <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-[#00F5D4]/5 to-transparent opacity-0 transition-opacity group-focus-within/input:opacity-100" />
                        </div>

                        <div className="relative group/input flex-1 min-w-[200px]">
                            <input
                                type="text"
                                placeholder="DESCRIPTION (E.g: CDN+OSS 月费)"
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && addCost()}
                                className="w-full rounded-xl border border-[#141825] bg-[#141825]/50 px-4 py-3 font-['DM_Sans'] text-xs font-medium text-[#E8EDF2] tracking-widest uppercase transition-all duration-300 placeholder:text-[#E8EDF2]/20 focus:border-[#00F5D4]/50 focus:bg-[#00F5D4]/5 focus:shadow-[0_0_15px_rgba(0,245,212,0.1)] focus:outline-none"
                            />
                            <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-[#00F5D4]/5 to-transparent opacity-0 transition-opacity group-focus-within/input:opacity-100" />
                        </div>

                        <div className="relative group/input w-36">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-['Roboto_Mono'] text-xs text-[#00F5D4] drop-shadow-[0_0_5px_rgba(0,245,212,0.5)] z-10">¥</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={form.amount}
                                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && addCost()}
                                className="w-full rounded-xl border border-[#141825] bg-[#141825]/50 py-3 pl-8 pr-4 font-['Roboto_Mono'] text-xs font-bold text-[#E8EDF2] transition-all duration-300 placeholder:text-[#E8EDF2]/20 focus:border-[#00F5D4]/50 focus:bg-[#00F5D4]/5 focus:shadow-[0_0_15px_rgba(0,245,212,0.1)] focus:outline-none"
                            />
                            <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-[#00F5D4]/5 to-transparent opacity-0 transition-opacity group-focus-within/input:opacity-100" />
                        </div>

                        <button
                            onClick={addCost}
                            disabled={adding || !form.description.trim() || !form.amount}
                            className="group/btn relative overflow-hidden rounded-xl border border-[#00F5D4]/30 bg-[#00F5D4]/10 px-8 py-3 font-['DM_Sans'] text-xs font-bold tracking-widest text-[#00F5D4] uppercase shadow-[0_0_15px_rgba(0,245,212,0.1)] transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:-translate-y-1 hover:border-[#00F5D4] hover:bg-[#00F5D4]/20 hover:shadow-[0_5px_20px_rgba(0,245,212,0.3)] disabled:pointer-events-none disabled:opacity-30"
                        >
                            <span className="relative z-10">{adding ? 'INSERTING...' : 'ADD_RECORD'}</span>
                        </button>
                    </div>
                </div>

                {/* Costs Table Box */}
                <div className="overflow-hidden rounded-[2rem] border border-[#141825] bg-[#0B0E1A]/80 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
                    <div className="overflow-auto scrollbar-hide">
                        <table className="w-full min-w-[480px] text-sm text-[#E8EDF2]">
                            <thead className="sticky top-0 bg-[#0B0E1A] backdrop-blur-xl">
                                <tr className="border-b border-[#141825]">
                                    {['DATE // 日期', 'DESCRIPTION // 说明', 'AMOUNT // 金额', 'ACT // 操作'].map((h, i) => (
                                        <th key={i} className={`px-6 py-4 font-['DM_Sans'] text-[10px] font-bold uppercase tracking-[0.2em] text-[#E8EDF2]/40 bg-[#0B0E1A]/95 backdrop-blur-md ${i === 0 || i === 1 || i === 2 ? 'text-left' : 'text-center'}`}>{h}</th>
                                    ))}
                                </tr>
                                {/* 霓虹分割线 */}
                                <tr><td colSpan={4} className="h-[1px] p-0 bg-gradient-to-r from-transparent via-[#141825] to-transparent"></td></tr>
                            </thead>
                            <tbody className="font-['Roboto_Mono'] relative z-10">
                                {loading && (
                                    <tr><td colSpan={4} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <RefreshCw size={24} className="animate-spin text-[#00F5D4] drop-shadow-[0_0_10px_rgba(0,245,212,0.8)]" />
                                            <span className="font-['DM_Sans'] text-xs font-bold tracking-[0.3em] text-[#00F5D4] uppercase animate-pulse">FETCHING.DATA...</span>
                                        </div>
                                    </td></tr>
                                )}
                                {!loading && costs.length === 0 && (
                                    <tr><td colSpan={4} className="py-24 text-center font-['DM_Sans'] text-xs font-bold uppercase tracking-[0.3em] text-[#E8EDF2]/20">NO_RECORDS_FOUND</td></tr>
                                )}
                                {!loading && costs.map(c => (
                                    <tr key={c.id} className="group border-b border-[#141825]/50 transition-all duration-300 hover:bg-[#141825]/40 hover:shadow-[inset_4px_0_0_rgba(0,245,212,1),inset_0_0_15px_rgba(0,245,212,0.05)]">
                                        <td className="px-6 py-4 text-xs font-medium text-[#E8EDF2]/40 tracking-wider whitespace-nowrap">{c.cost_date}</td>
                                        <td className="px-6 py-4 font-['DM_Sans'] text-xs font-medium uppercase tracking-widest text-[#E8EDF2]/80">{c.description}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-[#FF3366] drop-shadow-[0_0_5px_rgba(255,51,102,0.4)] whitespace-nowrap group-hover:drop-shadow-[0_0_8px_rgba(255,51,102,0.8)] transition-all">-{fmt(c.amount)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => removeCost(c.id)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#E8EDF2]/30 transition-all duration-300 hover:border-[#FF3366]/40 hover:bg-[#FF3366]/10 hover:text-[#FF3366] hover:shadow-[0_0_15px_rgba(255,51,102,0.2)] hover:scale-110"
                                                title="Delete // 删除"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {costs.length > 0 && (
                                <tfoot>
                                    <tr className="border-t border-[#141825] bg-[#141825]/30">
                                        <td colSpan={2} className="px-6 py-5 font-['DM_Sans'] text-[10px] font-bold uppercase tracking-[0.3em] text-[#E8EDF2]/40 text-right">TOTAL_EXPENSE // 合计</td>
                                        <td className="px-6 py-5 font-['Roboto_Mono'] text-sm font-bold text-[#FF3366] drop-shadow-[0_0_10px_rgba(255,51,102,0.5)]">-{fmt(total)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                {/* Note */}
                <p className="font-['DM_Sans'] text-[10px] font-bold tracking-widest text-[#E8EDF2]/20 uppercase">
                    &gt; SYSTEM.NOTE: 此处仅记录额外人工支出（CDN、域名、服务器等）。支付手续费（0.9%）已在订单明细的「净额」列自动计算。
                </p>
            </div>
        </div>
    )
}
