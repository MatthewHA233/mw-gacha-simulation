export const dynamic = 'force-dynamic'

/**
 * GET /api/horizn/hull-seatmap?view=grid|list|blacklist
 *
 * 用 Puppeteer + Tailwind CDN 截图，class 名直接从 MemberAdminModal 复制，
 * 保证和管理界面完全一致。
 */
import { createClient } from '@supabase/supabase-js'

// ─── Auth ────────────────────────────────────────────────────────────────────
function checkAuth(request) {
  const token = process.env.HORIZN_BOT_TOKEN
  if (!token) return true
  const { searchParams } = new URL(request.url)
  const h = request.headers.get('authorization')?.replace('Bearer ', '')
  return searchParams.get('token') === token || h === token
}

// ─── 工具函数（直接从 MemberAdminModal 复制）────────────────────────────────
const formatDate = (isoStr) => {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// HULL_SECTIONS — 与 MemberAdminModal 保持完全一致，icon 改成 SVG 字符串
const HULL_SECTIONS = [
  {
    id: 'command',
    label: '联队管理层',
    sub: 'COMMAND · No.000 – No.010',
    range: [0, 10],
    bgOccupied: 'bg-amber-500/25 border-amber-500/60 text-amber-300',
    bgEmpty: 'bg-amber-950/20 border-amber-900/30 text-amber-700/60',
    headerBg: 'from-amber-600/20 to-amber-900/5',
    headerBorder: 'border-amber-700/40',
    iconSvg: `<svg class="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>`,
  },
  {
    id: 'elite',
    label: '杰出贡献者',
    sub: 'ELITE · No.011 – No.100',
    range: [11, 100],
    bgOccupied: 'bg-purple-500/25 border-purple-500/60 text-purple-300',
    bgEmpty: 'bg-purple-950/20 border-purple-900/30 text-purple-700/60',
    headerBg: 'from-purple-600/20 to-purple-900/5',
    headerBorder: 'border-purple-700/40',
    iconSvg: `<svg class="w-3.5 h-3.5 text-purple-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>`,
  },
  {
    id: 'honor',
    label: '荣誉舷号',
    sub: 'HONOR · No.101 – No.999',
    range: [101, 999],
    bgOccupied: 'bg-cyan-500/25 border-cyan-500/60 text-cyan-300',
    bgEmpty: 'bg-cyan-950/20 border-cyan-900/30 text-cyan-700/60',
    headerBg: 'from-cyan-600/20 to-cyan-900/5',
    headerBorder: 'border-cyan-700/40',
    iconSvg: `<svg class="w-3.5 h-3.5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z" /></svg>`,
  },
]

// getSectionRows — 直接从 MemberAdminModal 复制
function getSectionRows(start, end, occupancyMap) {
  const rows = []
  for (let r = start; r <= end; r += 10) {
    const cellStart = r
    const cellEnd = Math.min(r + 9, end)
    let hasOccupied = false
    for (let i = cellStart; i <= cellEnd; i++) {
      if (occupancyMap.has(i)) { hasOccupied = true; break }
    }
    if (!hasOccupied) continue
    rows.push({ rowNum: r, cellStart, cellEnd })
  }
  return rows
}

// ─── 公共 HTML 骨架（Tailwind CDN，暗色背景）────────────────────────────────
function htmlWrap(bodyClass, content) {
  const now = new Date()
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Noto Sans SC', ui-sans-serif, system-ui; }
    .font-mono, [class*="font-mono"] { font-family: ui-monospace, 'Courier New', monospace; }
  </style>
</head>
<body class="${bodyClass}">
${content}
<p class="text-[10px] text-gray-700 text-right mt-1 pr-2 pb-1">Amelia · ${ts} CST</p>
</body></html>`
}

// ─── 视图 1：座位图（grid）—— JSX 结构直接从 renderSeatGrid() 复制 ─────────
function buildGridHtml(occupancyMap) {
  let sectionsHtml = ''

  for (const section of HULL_SECTIONS) {
    const [start, end] = section.range
    const rows = getSectionRows(start, end, occupancyMap)
    const sectionOccupied = rows.reduce((sum, row) => {
      for (let i = row.cellStart; i <= row.cellEnd; i++) {
        if (occupancyMap.get(i)?.current) sum++
      }
      return sum
    }, 0)

    let rowsHtml = rows.length === 0
      ? `<div class="text-center py-2 text-xs text-gray-600">暂无占位</div>`
      : rows.map(({ rowNum, cellStart, cellEnd }) => {
        const cells = []
        for (let i = cellStart; i <= cellEnd; i++) {
          const entry = occupancyMap.get(i)
          const currentHolder = entry?.current
          const legacyCount = entry?.legacy?.length || 0
          const isOccupied = !!currentHolder || legacyCount > 0
          const isLegacyOnly = !currentHolder && legacyCount > 0
          const isLeft = currentHolder && !currentHolder.active
          const numStr = String(i).padStart(3, '0')

          const cellClass = isLegacyOnly
            ? 'border border-dashed border-gray-500/40 bg-gray-700/15 text-gray-500'
            : isLeft
              ? 'border border-gray-600/50 bg-gray-700/20 text-gray-500 line-through'
              : isOccupied
                ? `border ${section.bgOccupied}`
                : `border ${section.bgEmpty}`

          const glow = isOccupied && !isLeft && !isLegacyOnly
            ? `<div class="absolute inset-0 bg-gradient-to-t from-transparent to-white/[0.06] pointer-events-none"></div>`
            : ''
          const badge = legacyCount > 0
            ? `<span class="absolute top-0 right-0 text-[7px] leading-none text-amber-400/80 bg-gray-900/60 rounded-bl px-0.5">${legacyCount}</span>`
            : ''

          cells.push(`<div class="flex-1 h-8 rounded text-[11px] font-mono font-bold relative overflow-hidden flex items-center justify-center ${cellClass}">
            ${glow}<span class="relative">${numStr}</span>${badge}
          </div>`)
        }
        return `<div class="flex gap-1">${cells.join('')}</div>`
      }).join('')

    sectionsHtml += `
    <div class="space-y-1">
      <div class="flex items-center justify-between px-2 py-1.5 rounded-md bg-gradient-to-r ${section.headerBg} border ${section.headerBorder}">
        <div class="flex items-center gap-1.5">
          ${section.iconSvg}
          <span class="text-xs font-bold text-white">${section.label}</span>
          <span class="text-[11px] text-gray-500 font-mono tracking-wide">${section.sub}</span>
        </div>
        <span class="text-xs text-gray-400">${sectionOccupied} / ${end - start + 1}</span>
      </div>
      <div class="space-y-1">${rowsHtml}</div>
    </div>`
  }

  const legend = `
  <div class="flex items-center justify-center gap-3 pt-1 pb-0.5 flex-wrap">
    <div class="flex items-center gap-1.5"><div class="w-3.5 h-3.5 rounded bg-gray-500/30 border border-gray-500/50"></div><span class="text-[11px] text-gray-500">已占位</span></div>
    <div class="flex items-center gap-1.5"><div class="w-3.5 h-3.5 rounded bg-gray-700/20 border border-gray-600/50"></div><span class="text-[11px] text-gray-500">已离队</span></div>
    <div class="flex items-center gap-1.5"><div class="w-3.5 h-3.5 rounded bg-gray-700/15 border border-dashed border-gray-500/40"></div><span class="text-[11px] text-gray-500">仅[旧]</span></div>
    <div class="flex items-center gap-1.5"><div class="w-3.5 h-3.5 rounded bg-gray-800/50 border border-gray-700/30"></div><span class="text-[11px] text-gray-500">空位</span></div>
  </div>`

  return htmlWrap('bg-gray-900', `<div class="p-2 space-y-3">${sectionsHtml}${legend}</div>`)
}

// ─── 视图 2：舷号列表（list）—— JSX 从 renderList(activeTab='hull') 复制 ────
function buildListHtml(hullMembers) {
  // 按舷号数字排序（打印版用数字顺序）
  const sorted = [...hullMembers].sort((a, b) => {
    const aNum = parseInt(a.hull_number?.replace(/\D/g, '') || '9999')
    const bNum = parseInt(b.hull_number?.replace(/\D/g, '') || '9999')
    return aNum - bNum
  })

  const rows = sorted.map((m, index) => {
    const rowBg = index % 2 === 0 ? 'bg-gray-900/20' : 'bg-gray-800/40'
    const isLeft = !m.active
    const hullBadgeClass = m.hull_number?.startsWith('[旧]')
      ? 'bg-amber-600/10 text-amber-500/70'
      : 'bg-blue-600/20 text-blue-400'

    const leftBadge = isLeft
      ? `<span class="text-[9px] text-red-400/70 flex-shrink-0">已离队${m.leave_date ? ` ${formatDate(m.leave_date)}` : ''}</span>`
      : ''

    const qqHtml = m.qq_id
      ? `<span class="text-gray-400">${m.qq_nickname || 'QQ用户'}</span>
         <span class="font-mono">${m.qq_id}</span>
         ${m.qq_join_time ? `<span class="text-gray-600">|</span><span>入群 <span class="text-gray-400">${formatDate(m.qq_join_time)}</span></span>` : ''}`
      : '<span class="text-gray-600">未关联 QQ</span>'
    const hullDateHtml = m.hull_date
      ? `<span class="text-gray-600">|</span><span>授予 <span class="text-cyan-400/70">${formatDate(m.hull_date)}</span></span>`
      : ''
    const subRow = `
      <div class="flex items-center gap-2 text-[10px] text-gray-500 pl-5 mt-0.5">
        ${qqHtml}${hullDateHtml}
      </div>`

    return `
    <div class="px-2 py-1.5 ${isLeft ? 'opacity-60' : ''} ${rowBg}">
      <div class="flex items-center justify-between gap-1">
        <div class="flex items-center gap-1.5 min-w-0 flex-1">
          <span class="text-[10px] text-gray-600 w-4 flex-shrink-0">${index + 1}</span>
          <span class="text-xs truncate text-white">${m.primary_name || m.player_id}</span>
          ${leftBadge}
          <span class="text-[10px] text-gray-500 font-mono">${m.player_id}</span>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <span class="text-[10px] px-1.5 py-0.5 rounded ${hullBadgeClass}">${m.hull_number}</span>
        </div>
      </div>
      ${subRow}
    </div>`
  }).join('<div class="border-b border-gray-700/30"></div>')

  const content = `
  <div class="m-2 rounded border border-gray-700/50 overflow-hidden bg-gray-900/50">
    <div class="px-2 py-1.5 bg-gray-700/20 border-b border-gray-700/50 flex items-center justify-between">
      <span class="text-xs font-semibold text-blue-400">舷号列表</span>
      <span class="text-[11px] text-gray-500">共 ${sorted.length} 个已分配舷号</span>
    </div>
    <div class="divide-y divide-gray-700/30">${rows}</div>
  </div>`

  return htmlWrap('bg-gray-900', content)
}

// ─── 视图 3：黑名单 —— JSX 从 renderList(activeTab='blacklist') + 外部黑名单 复制 ──
function buildBlacklistHtml(blacklistMembers, elseBlacklist) {
  // 排序：在队置顶，同组内按拉黑时间倒序
  const sorted = [...blacklistMembers].sort((a, b) => {
    const aActive = a.active ? 1 : 0
    const bActive = b.active ? 1 : 0
    if (bActive !== aActive) return bActive - aActive
    return (b.blacklist_date || '').localeCompare(a.blacklist_date || '')
  })

  // 成员黑名单行 —— 与 renderList(activeTab='blacklist') 一致
  const memberRows = sorted.map((m, index) => {
    const rowBg = index % 2 === 0 ? 'bg-gray-900/20' : 'bg-gray-800/40'
    const nameClass = m.active ? 'text-red-400 font-medium' : 'text-white'
    const activeBadge = m.active
      ? `<span class="text-[9px] text-red-500/80 flex-shrink-0 font-medium">在队</span>`
      : `<span class="text-[9px] text-red-400/70 flex-shrink-0">已离队${m.leave_date ? ` ${formatDate(m.leave_date)}` : ''}</span>`

    const noteHtml = m.blacklist_note
      ? `<span class="text-gray-500">${m.blacklist_note}</span>`
      : ''
    const blDateHtml = m.blacklist_date
      ? `<span class="text-gray-600">|</span><span>拉黑 <span class="text-red-400/70">${formatDate(m.blacklist_date)}</span></span>`
      : ''

    return `
    <div class="px-2 py-1.5 ${rowBg}">
      <div class="flex items-center justify-between gap-1">
        <div class="flex items-center gap-1.5 min-w-0 flex-1">
          <span class="text-[10px] text-gray-600 w-4 flex-shrink-0">${index + 1}</span>
          <span class="text-xs truncate ${nameClass}">${m.primary_name || m.player_id}</span>
          ${activeBadge}
          <span class="text-[10px] text-gray-500 font-mono">${m.player_id}</span>
        </div>
      </div>
      <div class="flex items-center gap-2 text-[10px] text-gray-500 pl-5 mt-0.5">
        ${noteHtml}${blDateHtml}
        ${m.qq_id ? `<span class="text-gray-600">|</span><span class="text-gray-400">${m.qq_nickname || 'QQ用户'}</span><span class="font-mono">${m.qq_id}</span>` : ''}
      </div>
    </div>`
  }).join('<div class="border-b border-gray-700/30"></div>')

  // 外部黑名单 —— 与 MemberAdminModal 外部黑名单区块一致
  const extRows = (elseBlacklist || []).map((entry) => `
    <div class="px-2 py-1.5 hover:bg-red-950/10 transition-colors">
      <div class="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
        <span class="text-xs text-white">${entry.name}</span>
        ${entry.player_id ? `<span class="text-[10px] text-gray-500 font-mono">${entry.player_id}</span>` : ''}
        ${entry.qq_number ? `<span class="text-[10px] text-gray-500 font-mono">${entry.qq_number}</span>` : ''}
        ${entry.note ? `<span class="text-[10px] text-gray-600">${entry.note}</span>` : ''}
        ${entry.blacklist_date ? `<span class="text-[10px] text-red-400/60">${formatDate(entry.blacklist_date)}</span>` : ''}
      </div>
    </div>`).join('<div class="border-b border-red-900/20"></div>')

  const content = `
  <div class="m-2 rounded border border-gray-700/50 overflow-hidden bg-gray-900/50">
    <div class="px-2 py-1.5 bg-gray-700/20 border-b border-gray-700/50 flex items-center justify-between">
      <span class="text-xs font-semibold text-red-400">成员黑名单</span>
      <span class="text-[11px] text-gray-500">${sorted.length} 人</span>
    </div>
    <div class="divide-y divide-gray-700/30">${memberRows || '<div class="px-3 py-4 text-center text-xs text-gray-600">暂无成员黑名单</div>'}</div>
  </div>

  <div class="m-2 mt-0 rounded border border-red-900/30 overflow-hidden">
    <div class="flex items-center justify-between px-2 py-1.5 bg-red-950/20 border-b border-red-900/30">
      <div class="flex items-center gap-1.5">
        <svg class="w-3 h-3 text-red-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
        <span class="text-[11px] text-red-400/70 font-medium">外部黑名单</span>
        <span class="text-[10px] text-gray-600">不在历史成员中的记录</span>
      </div>
    </div>
    <div class="divide-y divide-red-900/20">
      ${extRows || '<div class="px-3 py-4 text-center text-[11px] text-gray-600">暂无外部黑名单记录</div>'}
    </div>
  </div>`

  return htmlWrap('bg-gray-900', content)
}

// ─── Puppeteer ────────────────────────────────────────────────────────────────
async function getBrowser() {
  const { default: puppeteer } = await import('puppeteer-core')

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    const { default: chromium } = await import('@sparticuz/chromium')
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })
  }

  const { existsSync } = await import('fs')
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
  ].filter(Boolean)
  const exe = chromePaths.find(p => { try { return existsSync(p) } catch { return false } })
  if (!exe) throw new Error('未找到 Chrome，请安装 Chrome 或设置 CHROME_PATH')
  return puppeteer.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'], headless: true })
}

async function screenshotHtml(html, viewportWidth) {
  let browser
  try {
    browser = await getBrowser()
    const page = await browser.newPage()
    await page.setViewport({ width: viewportWidth, height: 800 })
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20000 })
    // 等待 Tailwind CDN 脚本执行完成
    await page.waitForFunction(() => document.readyState === 'complete', { timeout: 15000 })
    const h = await page.evaluate(() => document.documentElement.scrollHeight)
    await page.setViewport({ width: viewportWidth, height: Math.max(h, 100) })
    return await page.screenshot({ type: 'png', fullPage: false })
  } finally {
    if (browser) { try { await browser.close() } catch {} }
  }
}

// ─── 主处理 ──────────────────────────────────────────────────────────────────
export async function GET(request) {
  if (!checkAuth(request)) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'grid'

  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    if (view === 'grid') {
      const { data, error } = await sb
        .from('horizn_members')
        .select('hull_number, player_id, active')
        .not('hull_number', 'is', null)
      if (error) throw new Error(error.message)

      const occupancyMap = new Map()
      for (const m of data || []) {
        if (!m.hull_number) continue
        const isLegacy = m.hull_number.startsWith('[旧]')
        const num = parseInt(m.hull_number.replace(/\D/g, ''), 10)
        if (isNaN(num)) continue
        const entry = occupancyMap.get(num) || { current: null, legacy: [] }
        if (isLegacy) entry.legacy.push(m)
        else entry.current = m
        occupancyMap.set(num, entry)
      }

      const png = await screenshotHtml(buildGridHtml(occupancyMap), 520)
      return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } })
    }

    // 用 RPC 一次查完（含 primary_name、QQ 信息）
    const [rpcRes, extBlRes] = await Promise.all([
      sb.rpc('horizn_get_members_admin'),
      view === 'blacklist'
        ? sb.from('horizn_blacklist_else').select('player_id, name, qq_number, note, blacklist_date').order('blacklist_date', { ascending: false })
        : Promise.resolve({ data: [] }),
    ])
    if (rpcRes.error) throw new Error(rpcRes.error.message)

    const members = rpcRes.data || []

    if (view === 'list') {
      const hullMembers = members.filter(m => m.hull_number && m.hull_number !== '__pending__')
      const png = await screenshotHtml(buildListHtml(hullMembers), 520)
      return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } })
    }

    if (view === 'blacklist') {
      const blacklistMembers = members.filter(m => m.is_blacklisted)
      const png = await screenshotHtml(buildBlacklistHtml(blacklistMembers, extBlRes.data || []), 520)
      return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } })
    }

    return new Response(JSON.stringify({ error: `Unknown view: ${view}` }), { status: 400 })
  } catch (err) {
    console.error('[hull-seatmap]', err)
    return new Response(JSON.stringify({ error: err.message, stack: err.stack?.split('\n').slice(0, 5) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}
