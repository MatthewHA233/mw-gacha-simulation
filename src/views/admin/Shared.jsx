export const ADMIN_ID = '15727124853'
export const FEE_RATE = 0.009 // 0.9% 支付手续费

export const TYPE_COLORS = {
    monthly: '#00F5D4', // Fluorescent Cyan
    yearly: '#9D4EDD',  // Holographic Purple (just for variety)
    alipay: '#00F5D4',
    wechat: '#39FF14',  // Bio-fluorescent Green
    unknown: '#141825',
}

export const TYPE_LABELS = {
    monthly: '月度会员',
    yearly: '年度会员',
    alipay: '支付宝',
    wechat: '微信支付',
    unknown: '未知',
}

export const fmt = (c) => `¥${(c / 100).toFixed(2)}`
export const fmtShort = (c) => {
    const y = c / 100
    return y >= 10000 ? `¥${(y / 10000).toFixed(1)}w` : y >= 1000 ? `¥${(y / 1000).toFixed(1)}k` : `¥${y.toFixed(0)}`
}
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-')
export const todayStr = () => new Date().toISOString().slice(0, 10)

// ── Shared UI Components ─────────────────────────────────────────────────────────

export function NoiseOverlay() {
    return (
        <div className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.05] mix-blend-overlay">
            <svg className="h-full w-full">
                <filter id="noiseFilter">
                    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
                </filter>
                <rect width="100%" height="100%" filter="url(#noiseFilter)" />
            </svg>
        </div>
    )
}

export function PageHeader({ title, children }) {
    return (
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-[#141825] bg-[#0B0E1A]/80 px-8 backdrop-blur-xl relative z-10">
            <div className="flex items-center gap-3">
                <div className="h-4 w-1 bg-[#00F5D4] shadow-[0_0_10px_rgba(0,245,212,0.5)]"></div>
                <h1 className="font-['DM_Sans'] text-lg font-bold tracking-wider text-[#E8EDF2] uppercase">{title}</h1>
            </div>
            {children && <div className="flex items-center gap-3">{children}</div>}
        </div>
    )
}

export function IconBtn({ onClick, disabled, children, className = '' }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#141825] bg-[#0B0E1A] text-[#E8EDF2] shadow-sm transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:scale-[1.03] hover:border-[#00F5D4]/40 hover:text-[#00F5D4] hover:shadow-[0_0_15px_rgba(0,245,212,0.2)] disabled:pointer-events-none disabled:opacity-30 ${className}`}
        >
            {/* 按钮霓虹划痕 */}
            <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#00F5D4]/5 to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100" />
            <span className="relative z-10">{children}</span>
        </button>
    )
}

export function KpiCard({ label, value, sub, subColor = 'text-[#E8EDF2]/40', highlight = false }) {
    return (
        <div className={`group relative overflow-hidden rounded-[2rem] border transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] ${highlight ? 'border-[#00F5D4]/30 bg-[#141825]/80 shadow-[0_0_20px_rgba(0,245,212,0.1)]' : 'border-[#141825] bg-[#0B0E1A] hover:border-[#141825]/80'} p-6`}>
            {/* 霓虹扫光 */}
            <div className="absolute -inset-full top-0 z-0 block h-full w-1/2 -skew-x-12 transform bg-gradient-to-r from-transparent to-white opacity-[0.02] transition-transform duration-1000 group-hover:left-[150%]" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <p className="font-['DM_Sans'] text-xs font-semibold uppercase tracking-widest text-[#E8EDF2]/60">{label}</p>
                    {highlight && <div className="h-2 w-2 animate-pulse rounded-full bg-[#00F5D4] shadow-[0_0_8px_rgba(0,245,212,0.8)]" />}
                </div>
                <p className={`font-['Roboto_Mono'] text-3xl font-bold tracking-tight ${highlight ? 'text-[#00F5D4] drop-shadow-[0_0_10px_rgba(0,245,212,0.3)]' : 'text-[#E8EDF2]'}`}>{value}</p>
                {sub && <p className={`mt-2 truncate font-['DM_Sans'] text-xs font-medium tracking-wide ${subColor}`}>{sub}</p>}
            </div>
        </div>
    )
}

export function ChartTip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div className="relative overflow-hidden rounded-2xl border border-[#00F5D4]/20 bg-[#0B0E1A]/95 px-4 py-3 text-xs shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md">
            <div className="absolute left-0 top-0 h-full w-1 bg-[#00F5D4]"></div>
            <p className="mb-1 font-['DM_Sans'] font-medium text-[#E8EDF2]/60 uppercase tracking-wider">{label}</p>
            <p className="font-['Roboto_Mono'] text-lg font-bold text-[#E8EDF2] drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{fmt(payload[0].value)}</p>
        </div>
    )
}

export function MonthlyChartTip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div className="relative overflow-hidden rounded-2xl border border-[#00F5D4]/20 bg-[#0B0E1A]/95 px-4 py-3 text-xs shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md space-y-1.5">
            <div className="absolute left-0 top-0 h-full w-1 bg-[#00F5D4]"></div>
            <p className="mb-2 font-['DM_Sans'] font-medium text-[#E8EDF2]/60 uppercase tracking-wider border-b border-[#141825] pb-2">{label}</p>
            {payload.map((p) => (
                <div key={p.dataKey} className="flex items-center justify-between gap-4 font-['Roboto_Mono']">
                    <span style={{ color: p.color || p.stroke }} className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color || p.stroke }}></span>
                        {p.name}
                    </span>
                    <span className="font-bold text-[#E8EDF2]">{fmt(p.value)}</span>
                </div>
            ))}
        </div>
    )
}

export function HourlyChartTip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div className="relative overflow-hidden rounded-2xl border border-[#00F5D4]/20 bg-[#0B0E1A]/95 px-4 py-3 text-xs shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md">
            <div className="absolute left-0 top-0 h-full w-1 bg-[#00F5D4]"></div>
            <p className="mb-1 font-['DM_Sans'] font-medium text-[#E8EDF2]/60 uppercase tracking-wider">
                {String(label).padStart(2, '0')}:00 – {String((label + 1) % 24).padStart(2, '0')}:00
            </p>
            <p className="font-['Roboto_Mono'] text-lg font-bold text-[#E8EDF2] drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{payload[0].value} <span className="text-xs font-normal text-[#E8EDF2]/50">笔</span></p>
        </div>
    )
}

export function TypeBadge({ value }) {
    const isCyan = value === 'monthly' || value === 'alipay'
    const isGreen = value === 'yearly' || value === 'wechat'

    const cls = isCyan
        ? 'border-[#00F5D4]/30 bg-[#00F5D4]/10 text-[#00F5D4] shadow-[0_0_10px_rgba(0,245,212,0.1)]'
        : isGreen
            ? 'border-[#39FF14]/30 bg-[#39FF14]/10 text-[#39FF14] shadow-[0_0_10px_rgba(57,255,20,0.1)]'
            : 'border-[#141825] bg-[#141825]/50 text-[#E8EDF2]/60'

    return (
        <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-full border px-3 py-1 font-['DM_Sans'] text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm ${cls}`}>
            {TYPE_LABELS[value] || value}
        </span>
    )
}

export function ErrorBanner({ msg }) {
    return (
        <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-[#FF3366]/30 bg-[#FF3366]/10 px-5 py-4 text-sm text-[#FF3366] shadow-[0_0_20px_rgba(255,51,102,0.1)] backdrop-blur-sm">
            <div className="absolute left-0 top-0 h-full w-1 bg-[#FF3366]"></div>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF3366]/20 font-bold">!</div>
            <span className="font-['DM_Sans'] font-medium tracking-wide">{msg}</span>
        </div>
    )
}

export function Pagination({ page, totalPages, total, onChange, pageSize = 20 }) {
    if (totalPages <= 1) return null

    let start = Math.max(1, page - 2)
    const end = Math.min(totalPages, start + 4)
    if (end - start < 4) start = Math.max(1, end - 4)
    const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

    return (
        <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-t border-[#141825] bg-[#0B0E1A]/80 px-6 py-4 backdrop-blur-md">
            <span className="font-['Roboto_Mono'] text-xs font-medium text-[#E8EDF2]/50">
                RECORD <span className="text-[#00F5D4]">{(page - 1) * pageSize + 1}</span> - <span className="text-[#00F5D4]">{Math.min(page * pageSize, total)}</span> // TOTAL <span className="text-[#E8EDF2]">{total}</span>
            </span>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onChange(page - 1)}
                    disabled={page === 1}
                    className="group relative overflow-hidden rounded-xl border border-[#141825] bg-[#141825]/30 px-4 py-2 font-['DM_Sans'] text-xs font-bold uppercase tracking-wider text-[#E8EDF2]/60 transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:scale-[1.03] hover:border-[#00F5D4]/40 hover:text-[#00F5D4] hover:shadow-[0_0_15px_rgba(0,245,212,0.1)] disabled:pointer-events-none disabled:opacity-30"
                >
                    PREV
                </button>
                <div className="flex items-center gap-1 hidden sm:flex">
                    {pages.map((p) => {
                        const isActive = p === page
                        return (
                            <button
                                key={p}
                                onClick={() => onChange(p)}
                                className={`relative flex h-8 w-8 items-center justify-center rounded-lg font-['Roboto_Mono'] text-xs font-bold transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${isActive
                                        ? 'scale-[1.05] border border-[#00F5D4]/50 bg-[#00F5D4]/10 text-[#00F5D4] shadow-[0_0_15px_rgba(0,245,212,0.2)]'
                                        : 'border border-transparent bg-transparent text-[#E8EDF2]/40 hover:bg-[#141825] hover:text-[#E8EDF2]'
                                    }`}
                            >
                                {p}
                            </button>
                        )
                    })}
                </div>
                <button
                    onClick={() => onChange(page + 1)}
                    disabled={page === totalPages}
                    className="group relative overflow-hidden rounded-xl border border-[#141825] bg-[#141825]/30 px-4 py-2 font-['DM_Sans'] text-xs font-bold uppercase tracking-wider text-[#E8EDF2]/60 transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:scale-[1.03] hover:border-[#00F5D4]/40 hover:text-[#00F5D4] hover:shadow-[0_0_15px_rgba(0,245,212,0.1)] disabled:pointer-events-none disabled:opacity-30"
                >
                    NEXT
                </button>
            </div>
        </div>
    )
}
