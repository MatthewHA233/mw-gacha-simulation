import { LayoutDashboard, Receipt, Wallet, X } from 'lucide-react'

export const NAV = [
    { id: 'overview', label: '数据中枢', sub: 'DATA.CORE', Icon: LayoutDashboard },
    { id: 'orders', label: '交易流水', sub: 'TX.RECORDS', Icon: Receipt },
    { id: 'costs', label: '系统耗材', sub: 'SYS.COSTS', Icon: Wallet },
]

export function Sidebar({ active, onChange, open, onClose }) {
    return (
        <>
            {/* Mobile Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-[#0B0E1A]/80 backdrop-blur-sm md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Panel */}
            <aside className={`
        fixed inset-y-0 left-0 z-50 flex w-64 flex-shrink-0 flex-col
        border-r border-[#141825] bg-[#0B0E1A] shadow-[20px_0_50px_rgba(0,0,0,0.5)]
        transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
        md:static md:translate-x-0 md:shadow-none
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
                {/* Brand Header */}
                <div className="relative flex h-16 flex-shrink-0 items-center justify-between border-b border-[#141825] px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00F5D4]/10 border border-[#00F5D4]/30">
                            <div className="h-3 w-3 bg-[#00F5D4] shadow-[0_0_10px_rgba(0,245,212,0.8)] animate-pulse" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-['DM_Sans'] text-xs font-bold tracking-[0.2em] text-[#E8EDF2] uppercase">
                                NEON ARCHIVE
                            </span>
                            <span className="font-['Roboto_Mono'] text-[9px] text-[#00F5D4] tracking-widest">
                                SYS.ADMIN_v1.0
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="group relative rounded-md p-1 right-[-4px] md:hidden"
                    >
                        <X size={18} className="text-[#E8EDF2]/50 group-hover:text-[#00F5D4] transition-colors" />
                        <div className="absolute inset-0 scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all bg-[#00F5D4]/10 rounded-md" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-2 p-4 overflow-y-auto scrollbar-hide">
                    <div className="mb-4 mt-2 px-3">
                        <p className="font-['Roboto_Mono'] text-[10px] uppercase text-[#E8EDF2]/30 tracking-[0.2em]">
                            Directory // 索引
                        </p>
                    </div>
                    {NAV.map(({ id, label, sub, Icon }) => {
                        const isActive = active === id
                        return (
                            <button
                                key={id}
                                onClick={() => { onChange(id); onClose() }}
                                className={`
                  group relative flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
                  ${isActive
                                        ? 'bg-[#00F5D4]/10 text-[#00F5D4] shadow-[inset_0_0_20px_rgba(0,245,212,0.05)]'
                                        : 'text-[#E8EDF2]/60 hover:bg-[#141825]/50 hover:text-[#E8EDF2]'
                                    }
                `}
                            >
                                {/* Active Indicator Line */}
                                <div className={`
                  absolute left-0 top-1/2 h-1/2 w-[3px] -translate-y-1/2 rounded-r-full bg-[#00F5D4] shadow-[0_0_10px_rgba(0,245,212,0.5)]
                  transition-all duration-300
                  ${isActive ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}
                `} />

                                <div className={`
                  relative flex items-center justify-center transition-transform duration-300
                  ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,245,212,0.5)] text-[#00F5D4]' : 'text-[#E8EDF2]/40 group-hover:text-[#00F5D4]/70'}
                `}>
                                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                </div>

                                <div className="flex flex-col items-start translate-y-[1px]">
                                    <span className="font-['DM_Sans'] text-sm tracking-wide">{label}</span>
                                    <span className="font-['Roboto_Mono'] text-[10px] text-inherit opacity-50 tracking-wider hidden group-hover:block transition-all absolute bottom-0 translate-y-full pt-1">
                                        {sub}
                                    </span>
                                </div>

                                {/* Hover Glint */}
                                <div className="absolute inset-0 block h-full w-full -translate-x-full transform bg-gradient-to-r from-transparent via-white to-transparent opacity-[0.03] transition-transform duration-500 group-hover:translate-x-full" />
                            </button>
                        )
                    })}
                </nav>

                {/* Footer Info */}
                <div className="border-t border-[#141825] p-6">
                    <div className="flex items-center gap-3">
                        <div className="relative h-2 w-2">
                            <div className="absolute inset-0 animate-ping rounded-full bg-[#39FF14] opacity-75"></div>
                            <div className="relative h-2 w-2 rounded-full bg-[#39FF14]"></div>
                        </div>
                        <p className="font-['Roboto_Mono'] text-[10px] font-medium tracking-widest text-[#39FF14] uppercase drop-shadow-[0_0_5px_rgba(57,255,20,0.5)]">
                            SYSTEM ONLINE
                        </p>
                    </div>
                    <div className="mt-4 flex flex-col gap-1">
                        <div className="h-[1px] w-full bg-gradient-to-r from-[#141825] via-[#E8EDF2]/10 to-[#141825]"></div>
                    </div>
                </div>
            </aside>
        </>
    )
}
