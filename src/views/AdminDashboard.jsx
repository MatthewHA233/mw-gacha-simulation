'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Menu } from 'lucide-react'

// Layout & UI components
import { NoiseOverlay, ADMIN_ID } from './admin/Shared'
import { Sidebar, NAV } from './admin/Sidebar'

// Views
import { Overview } from './admin/Overview'
import { Orders } from './admin/Orders'
import { Costs } from './admin/Costs'

export default function AdminDashboard() {
  const { userAccount, loading } = useAuth()
  const isAdmin = userAccount?.login_id === ADMIN_ID
  const [nav, setNav] = useState('overview')
  const [drawer, setDrawer] = useState(false)

  if (loading) return (
    <div className="flex h-full min-h-screen items-center justify-center bg-[#0B0E1A]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-transparent border-t-[#00F5D4] shadow-[0_0_15px_rgba(0,245,212,0.5)]" />
        <span className="font-['DM_Sans'] text-xs font-bold tracking-[0.3em] text-[#00F5D4] uppercase animate-pulse">INIT_SYSTEM...</span>
      </div>
      <NoiseOverlay />
    </div>
  )
  if (!userAccount) return (
    <div className="flex h-full min-h-screen items-center justify-center bg-[#0B0E1A]">
      <div className="text-center rounded-3xl border border-[#141825] bg-[#0B0E1A]/80 p-10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#FF3366] shadow-[0_0_10px_rgba(255,51,102,0.8)]" />
        <p className="font-['DM_Sans'] text-2xl font-bold tracking-widest text-[#E8EDF2] uppercase mb-2">ACCESS.DENIED // 未登录</p>
        <p className="font-['Roboto_Mono'] text-xs text-[#E8EDF2]/40 uppercase tracking-widest">&gt;&gt; Please authenticate to enter Admin Core.</p>
      </div>
      <NoiseOverlay />
    </div>
  )
  if (!isAdmin) return (
    <div className="flex h-full min-h-screen items-center justify-center bg-[#0B0E1A]">
      <div className="text-center rounded-3xl border border-[#FF3366]/30 bg-[#FF3366]/10 p-10 shadow-[0_0_40px_rgba(255,51,102,0.2)] backdrop-blur-md relative overflow-hidden group">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDEiLz4KPHBhdGggZD0iTTAgMEw4IDhaTTAgOEw4IDBaIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+')] opacity-20" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#FF3366] shadow-[0_0_15px_rgba(255,51,102,1)] animate-pulse" />
        <p className="font-['DM_Sans'] text-2xl font-bold tracking-widest text-[#FF3366] uppercase mb-2 drop-shadow-[0_0_8px_rgba(255,51,102,0.5)] group-hover:drop-shadow-[0_0_15px_rgba(255,51,102,0.8)] transition-all">PERMISSION_DENIED</p>
        <p className="font-['Roboto_Mono'] text-xs text-[#FF3366]/60 uppercase tracking-widest">&gt;&gt; Unauthorized terminal access detected.</p>
      </div>
      <NoiseOverlay />
    </div>
  )

  return (
    <div className="relative flex h-full min-h-[100dvh] overflow-hidden bg-[#0B0E1A] text-[#E8EDF2] font-['DM_Sans']">
      <NoiseOverlay />
      <Sidebar active={nav} onChange={setNav} open={drawer} onClose={() => setDrawer(false)} />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-[#141825] bg-[#0B0E1A]/80 px-6 backdrop-blur-md md:hidden">
          <div className="flex items-center gap-4">
            <button onClick={() => setDrawer(true)} className="group relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#141825] bg-[#141825]/30 text-[#E8EDF2] transition-colors hover:border-[#00F5D4]/40 hover:text-[#00F5D4]">
              <Menu size={20} />
            </button>
            <span className="font-['DM_Sans'] text-sm font-bold tracking-widest text-[#00F5D4] drop-shadow-[0_0_5px_rgba(0,245,212,0.5)] uppercase">
              {NAV.find(n => n.id === nav)?.label}
            </span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00F5D4]/10 border border-[#00F5D4]/30">
            <div className="h-3 w-3 bg-[#00F5D4] shadow-[0_0_10px_rgba(0,245,212,0.8)] animate-pulse" />
          </div>
        </div>

        {/* Dynamic View */}
        <div className="flex-1 overflow-hidden relative">
          {/* subtle background glow */}
          <div className="pointer-events-none absolute -left-[20%] -top-[20%] h-[60%] w-[60%] rounded-full bg-[#00F5D4]/5 blur-[120px]"></div>

          <div className="absolute inset-0 h-full w-full overflow-hidden">
            {nav === 'overview' ? <Overview /> : nav === 'orders' ? <Orders /> : <Costs />}
          </div>
        </div>
      </div>
    </div>
  )
}
