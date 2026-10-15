import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Copy, Check } from 'lucide-react'
import { fmtDate, PageHeader, IconBtn, ErrorBanner } from './Shared'
import { adminFetch } from './adminFetch'

/**
 * 赠送兑换码（2026-10-15）：管理员手动生成一个月的兑换码，自己用或送人，不计入收入。
 * 接口在服务端校验管理员身份（请求经 adminFetch 带上当前登录的通行证密钥和设备 ID）。
 */
async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch {
        // 非安全上下文（局域网 http）没有 clipboard：退回旧写法
        const area = document.createElement('textarea')
        area.value = text
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(area)
        return ok
    }
}

function CopyBtn({ text }) {
    const [copied, setCopied] = useState(false)
    return (
        <button
            onClick={async () => {
                if (await copyText(text)) {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                }
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#E8EDF2]/40 transition-all duration-300 hover:border-[#9D4EDD]/40 hover:bg-[#9D4EDD]/10 hover:text-[#9D4EDD]"
            aria-label="复制兑换码"
        >
            {copied ? <Check size={14} className="text-[#39FF14]" /> : <Copy size={14} />}
        </button>
    )
}

function StatusBadge({ gift }) {
    const expired = gift.expire_at && new Date(gift.expire_at).getTime() < Date.now()
    const [label, color] = expired
        ? ['已过期', '#E8EDF2']
        : gift.bound
            ? ['已绑定账号', '#9D4EDD']
            : gift.device_count > 0
                ? [`已使用 · ${gift.device_count} 台`, '#00F5D4']
                : ['未使用', '#39FF14']
    return (
        <span
            className="inline-flex items-center rounded-full border px-2.5 py-1 font-['DM_Sans'] text-[10px] font-bold tracking-widest whitespace-nowrap"
            style={{ color, borderColor: `${color}40`, background: `${color}14`, opacity: expired ? 0.45 : 1 }}
        >
            {label}
        </span>
    )
}

export function GiftCodes() {
    const [gifts, setGifts] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [creating, setCreating] = useState(false)
    const [note, setNote] = useState('')
    const [latest, setLatest] = useState(null)

    const load = useCallback(async () => {
        setLoading(true); setError(null)
        try {
            const res = await adminFetch('/api/admin/gift-codes')
            const d = await res.json()
            if (!res.ok) throw new Error(d.error || '请求失败')
            setGifts(d.gifts || [])
        } catch (e) { setError(e.message) }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    async function createGift() {
        setCreating(true); setError(null)
        try {
            const res = await adminFetch('/api/admin/gift-codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: note.trim() }),
            })
            const d = await res.json()
            if (!res.ok) throw new Error(d.error || '生成失败')
            setGifts(prev => [d.gift, ...prev])
            setLatest(d.gift)
            setNote('')
        } catch (e) { setError(e.message) }
        finally { setCreating(false) }
    }

    return (
        <div className="flex h-full flex-col relative z-10 w-full overflow-hidden">
            <PageHeader title="赠送兑换码 :: GIFT.CODES">
                <IconBtn onClick={load} disabled={loading}>
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </IconBtn>
            </PageHeader>

            <div className="flex-1 space-y-6 overflow-y-auto scrollbar-hide p-6 md:p-8">
                {error && <ErrorBanner msg={error} />}

                {/* 生成 */}
                <div className="group overflow-hidden rounded-[2rem] border border-[#141825] bg-[#0B0E1A]/80 p-8 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-500 hover:border-[#9D4EDD]/30">
                    <div className="flex items-center gap-3 mb-6 relative">
                        <div className="h-4 w-1 bg-[#9D4EDD] shadow-[0_0_8px_rgba(157,78,221,0.6)]"></div>
                        <p className="font-['DM_Sans'] text-sm font-bold tracking-[0.15em] text-[#E8EDF2] uppercase">
                            NEW GIFT // 生成一个月兑换码
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="relative group/input flex-1 min-w-[200px]">
                            <input
                                type="text"
                                maxLength={60}
                                placeholder="备注（送给谁，可不填）"
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !creating && createGift()}
                                className="w-full rounded-xl border border-[#141825] bg-[#141825]/50 px-4 py-3 font-['DM_Sans'] text-xs font-medium text-[#E8EDF2] tracking-widest transition-all duration-300 placeholder:text-[#E8EDF2]/20 focus:border-[#9D4EDD]/50 focus:bg-[#9D4EDD]/5 focus:shadow-[0_0_15px_rgba(157,78,221,0.1)] focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={createGift}
                            disabled={creating}
                            className="group/btn relative overflow-hidden rounded-xl border border-[#9D4EDD]/30 bg-[#9D4EDD]/10 px-8 py-3 font-['DM_Sans'] text-xs font-bold tracking-widest text-[#9D4EDD] uppercase shadow-[0_0_15px_rgba(157,78,221,0.1)] transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:-translate-y-1 hover:border-[#9D4EDD] hover:bg-[#9D4EDD]/20 hover:shadow-[0_5px_20px_rgba(157,78,221,0.3)] disabled:pointer-events-none disabled:opacity-30"
                        >
                            <span className="relative z-10">{creating ? 'GENERATING...' : '生成月卡 · 30 天'}</span>
                        </button>
                    </div>

                    {latest && (
                        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#9D4EDD]/30 bg-[#9D4EDD]/5 px-5 py-4">
                            <span className="font-['DM_Sans'] text-[10px] font-bold tracking-widest text-[#E8EDF2]/50">刚生成</span>
                            <span className="font-['Roboto_Mono'] text-lg font-bold tracking-wider text-[#9D4EDD] drop-shadow-[0_0_8px_rgba(157,78,221,0.5)] select-all">{latest.code}</span>
                            <CopyBtn text={latest.code} />
                            <span className="font-['DM_Sans'] text-[10px] tracking-widest text-[#E8EDF2]/40">到期 {fmtDate(latest.expire_at)}</span>
                        </div>
                    )}
                </div>

                {/* 列表 */}
                <div className="overflow-hidden rounded-[2rem] border border-[#141825] bg-[#0B0E1A]/80 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
                    <div className="overflow-auto scrollbar-hide">
                        <table className="w-full min-w-[640px] text-sm text-[#E8EDF2]">
                            <thead className="sticky top-0 bg-[#0B0E1A] backdrop-blur-xl">
                                <tr className="border-b border-[#141825]">
                                    {['CODE // 兑换码', 'NOTE // 备注', 'CREATED // 生成', 'EXPIRE // 到期', 'STATUS // 状态', ''].map((h, i) => (
                                        <th key={i} className="px-6 py-4 text-left font-['DM_Sans'] text-[10px] font-bold uppercase tracking-[0.2em] text-[#E8EDF2]/40 bg-[#0B0E1A]/95 backdrop-blur-md">{h}</th>
                                    ))}
                                </tr>
                                <tr><td colSpan={6} className="h-[1px] p-0 bg-gradient-to-r from-transparent via-[#141825] to-transparent"></td></tr>
                            </thead>
                            <tbody className="font-['Roboto_Mono'] relative z-10">
                                {loading && (
                                    <tr><td colSpan={6} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <RefreshCw size={24} className="animate-spin text-[#9D4EDD] drop-shadow-[0_0_10px_rgba(157,78,221,0.8)]" />
                                            <span className="font-['DM_Sans'] text-xs font-bold tracking-[0.3em] text-[#9D4EDD] uppercase animate-pulse">FETCHING.DATA...</span>
                                        </div>
                                    </td></tr>
                                )}
                                {!loading && gifts.length === 0 && (
                                    <tr><td colSpan={6} className="py-24 text-center font-['DM_Sans'] text-xs font-bold uppercase tracking-[0.3em] text-[#E8EDF2]/20">NO_RECORDS_FOUND</td></tr>
                                )}
                                {!loading && gifts.map(g => (
                                    <tr key={g.order_no} className="group border-b border-[#141825]/50 transition-all duration-300 hover:bg-[#141825]/40 hover:shadow-[inset_4px_0_0_rgba(157,78,221,1),inset_0_0_15px_rgba(157,78,221,0.05)]">
                                        <td className="px-6 py-4 text-sm font-bold tracking-wider text-[#9D4EDD] whitespace-nowrap">{g.code}</td>
                                        <td className="px-6 py-4 font-['DM_Sans'] text-xs font-medium tracking-widest text-[#E8EDF2]/70">{g.note || <span className="text-[#E8EDF2]/20">—</span>}</td>
                                        <td className="px-6 py-4 text-xs font-medium text-[#E8EDF2]/40 tracking-wider whitespace-nowrap">{fmtDate(g.created_at)}</td>
                                        <td className="px-6 py-4 text-xs font-medium text-[#E8EDF2]/60 tracking-wider whitespace-nowrap">{fmtDate(g.expire_at)}</td>
                                        <td className="px-6 py-4"><StatusBadge gift={g} /></td>
                                        <td className="px-6 py-4 text-center"><CopyBtn text={g.code} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <p className="font-['DM_Sans'] text-[10px] font-bold tracking-widest text-[#E8EDF2]/20 uppercase">
                    &gt; SYSTEM.NOTE: 赠送码不计入收入，也不进交易流水和订单统计。兑换码和付费月卡一样，有效期从生成时起算 30 天。
                </p>
            </div>
        </div>
    )
}
