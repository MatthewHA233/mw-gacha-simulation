import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import {
    FEE_RATE, fmt, fmtDate,
    PageHeader, IconBtn, ErrorBanner, TypeBadge, Pagination
} from './Shared'

const PAGE_SIZE = 20

export function Orders() {
    const [page, setPage] = useState(1)
    const [data, setData] = useState({ orders: [], total: 0, totalPages: 1 })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

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
        <div className="flex h-full flex-col relative z-10 w-full overflow-hidden">
            <PageHeader title={`交易流水 :: TX.RECORDS${total ? ` [TOTAL ${total}]` : ''}`}>
                <IconBtn onClick={load} disabled={loading}>
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </IconBtn>
            </PageHeader>

            <div className="flex flex-1 flex-col gap-0 overflow-hidden p-6 md:p-8">
                {error && <ErrorBanner msg={error} />}

                <div className="flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-[#141825] bg-[#0B0E1A]/80 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
                    <div className="flex-1 overflow-auto scrollbar-hide relative">
                        <table className="w-full min-w-[960px] text-sm text-[#E8EDF2]">
                            <thead className="sticky top-0 z-20 bg-[#0B0E1A] backdrop-blur-xl">
                                <tr className="border-b border-[#141825]">
                                    {['#', '订单号 (ID)', '序列号 (SERIAL)', '金额 (AMT)', '净额/手续费 (NET/FEE)', '类型 (TYPE)', '支付(PAY)', '属性 (ATTR)', '时间 (TIME)'].map(h => (
                                        <th key={h} className="px-6 py-4 text-left font-['DM_Sans'] text-[10px] font-bold uppercase tracking-[0.2em] text-[#E8EDF2]/40 bg-[#0B0E1A]/95 backdrop-blur-md">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                                {/* 霓虹分割线 */}
                                <tr><td colSpan={9} className="h-[1px] p-0 bg-gradient-to-r from-[#00F5D4]/50 via-transparent to-transparent"></td></tr>
                            </thead>
                            <tbody className="font-['Roboto_Mono'] relative z-10">
                                {loading && (
                                    <tr><td colSpan={9} className="py-24 text-center text-sm">
                                        <div className="flex flex-col items-center gap-4">
                                            <RefreshCw size={24} className="animate-spin text-[#00F5D4] drop-shadow-[0_0_10px_rgba(0,245,212,0.8)]" />
                                            <span className="font-['DM_Sans'] text-xs font-bold tracking-[0.3em] text-[#00F5D4] uppercase animate-pulse">FETCHING.DATA...</span>
                                        </div>
                                    </td></tr>
                                )}
                                {!loading && orders.length === 0 && (
                                    <tr><td colSpan={9} className="py-24 text-center font-['DM_Sans'] text-xs font-bold uppercase tracking-[0.3em] text-[#E8EDF2]/20">NO_RECORDS_FOUND</td></tr>
                                )}
                                {!loading && orders.map((o, i) => {
                                    const fee = Math.round(o.amount * FEE_RATE)
                                    const net = o.amount - fee
                                    return (
                                        <tr key={o.out_trade_no} className="group relative border-b border-[#141825]/50 transition-all duration-300 hover:bg-[#141825]/40 hover:shadow-[inset_4px_0_0_rgba(0,245,212,1),inset_0_0_15px_rgba(0,245,212,0.05)]">
                                            <td className="px-6 py-4 text-xs font-medium text-[#E8EDF2]/30">{(page - 1) * PAGE_SIZE + i + 1}</td>
                                            <td className="max-w-[160px] px-6 py-4 text-xs font-medium text-[#00F5D4] drop-shadow-[0_0_3px_rgba(0,245,212,0.5)] group-hover:drop-shadow-[0_0_8px_rgba(0,245,212,0.8)] transition-all">
                                                <span className="block truncate" title={o.out_trade_no}>{o.out_trade_no}</span>
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                {o.activation_code
                                                    ? <span className="text-[#9D4EDD] drop-shadow-[0_0_3px_rgba(157,78,221,0.5)]" title={o.activation_code}>{o.activation_code}</span>
                                                    : <span className="text-[#E8EDF2]/20">—</span>
                                                }
                                            </td>
                                            <td className="px-6 py-4 font-bold text-[#E8EDF2] group-hover:text-white transition-colors">{fmt(o.amount)}</td>
                                            <td className="px-6 py-4 text-xs font-bold">
                                                {o.is_admin_purchase
                                                    ? <span className="text-[#FF3366] drop-shadow-[0_0_5px_rgba(255,51,102,0.5)]" title="管理员自购：仅计手续费为成本">-{fmt(fee)}</span>
                                                    : <span className="text-[#39FF14] drop-shadow-[0_0_5px_rgba(57,255,20,0.4)]" title="实际到手（扣0.9%手续费）">+{fmt(net)}</span>
                                                }
                                            </td>
                                            <td className="px-6 py-4"><TypeBadge value={o.membership_type} /></td>
                                            <td className="px-6 py-4"><TypeBadge value={o.pay_type} /></td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => toggleAdmin(o.out_trade_no, o.is_admin_purchase)}
                                                    className={`relative overflow-hidden rounded-md border px-3 py-1 font-['DM_Sans'] text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:-translate-y-[1px] ${o.is_admin_purchase
                                                            ? 'border-[#9D4EDD]/40 bg-[#9D4EDD]/10 text-[#9D4EDD] shadow-[0_4px_10px_rgba(157,78,221,0.2)] hover:border-[#9D4EDD] hover:bg-[#9D4EDD]/20 hover:shadow-[0_0_15px_rgba(157,78,221,0.4)]'
                                                            : 'border-[#141825] bg-[#141825]/50 text-[#E8EDF2]/40 hover:border-[#00F5D4]/40 hover:text-[#00F5D4] hover:shadow-[0_0_10px_rgba(0,245,212,0.2)]'
                                                        }`}
                                                >
                                                    <span className="relative z-10">{o.is_admin_purchase ? 'SYS.ADMIN' : 'USR.NORMAL'}</span>
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-[#E8EDF2]/40 tracking-wider">
                                                {fmtDate(o.pay_time)}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} pageSize={PAGE_SIZE} />
                </div>
            </div>
        </div>
    )
}
