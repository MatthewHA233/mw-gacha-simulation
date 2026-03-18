/**
 * GET /api/horizn/hull-seatmap
 * 生成舷号座位图 PNG 图片，供 QQ 机器人调用
 * 鉴权：?token=BOT_API_TOKEN 或 Authorization: Bearer TOKEN
 */
import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const CELL_W = 82
const CELL_H = 52
const COLS = 10
const GAP = 4
const SECTION_PAD = 10

const SECTIONS = [
  { label: '联队管理层', sub: 'COMMAND · No.000–010', range: [0, 10],   color: '#f59e0b', dimBg: '#1c0f00', dimColor: '#6b3a00' },
  { label: '杰出贡献者', sub: 'ELITE · No.011–100',   range: [11, 100], color: '#a855f7', dimBg: '#130620', dimColor: '#4a1d7a' },
  { label: '荣誉舷号',   sub: 'HONOR · No.101+',      range: [101, Infinity], color: '#06b6d4', dimBg: '#041018', dimColor: '#0e4a63' },
]

function pad3(n) { return String(n).padStart(3, '0') }

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function checkAuth(request) {
  const token = process.env.HORIZN_BOT_TOKEN
  if (!token) return true  // 未配置则不校验
  const url = new URL(request.url)
  const qToken = url.searchParams.get('token')
  const authHeader = request.headers.get('authorization')?.replace('Bearer ', '')
  return qToken === token || authHeader === token
}

// 计算图片高度
function calcHeight(maxHull) {
  const honorEnd = Math.max(110, Math.ceil((maxHull + 5) / 10) * 10)
  let h = 16 + 72 + 12  // top padding + header + margin

  for (const sec of SECTIONS) {
    const start = sec.range[0]
    const end = sec.range[1] === Infinity ? honorEnd : sec.range[1]
    if (end < start) continue
    const count = end - start + 1
    const rows = Math.ceil(count / COLS)
    h += 38 + SECTION_PAD * 2 + rows * (CELL_H + GAP) - GAP + 12
  }
  h += 24 + 16  // footer + bottom padding
  return h
}

export async function GET(request) {
  if (!checkAuth(request)) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const sb = getSupabase()

    // 查询所有有舷号的成员
    const { data: members, error: mErr } = await sb
      .from('horizn_members')
      .select('id, hull_number, player_id')
      .not('hull_number', 'is', null)
    if (mErr) throw mErr

    // 查主名字
    const ids = (members || []).map(m => m.id)
    const nameMap = new Map()
    if (ids.length) {
      const { data: names } = await sb
        .from('horizn_name_variants')
        .select('member_id, name')
        .in('member_id', ids)
        .order('is_primary', { ascending: false })
      ;(names || []).forEach(n => { if (!nameMap.has(n.member_id)) nameMap.set(n.member_id, n.name) })
    }

    // 统计数据
    const [memberBlRes, extBlRes] = await Promise.all([
      sb.from('horizn_members').select('id', { count: 'exact', head: true }).eq('is_blacklisted', true),
      sb.from('horizn_blacklist_else').select('id', { count: 'exact', head: true }),
    ])

    // 构建舷号映射
    const assignments = new Map()
    const hullNums = []
    for (const m of members || []) {
      const n = parseInt(m.hull_number)
      if (!isNaN(n)) {
        assignments.set(n, nameMap.get(m.id) || m.player_id)
        hullNums.push(n)
      }
    }
    hullNums.sort((a, b) => a - b)
    const maxHull = hullNums.length ? Math.max(...hullNums) : 10
    const honorEnd = Math.max(110, Math.ceil((maxHull + 5) / 10) * 10)

    // 空位统计
    const occupied = new Set(hullNums)
    let gapCount = 0
    for (let i = 0; i <= maxHull; i++) { if (!occupied.has(i)) gapCount++ }

    const totalAssigned = hullNums.length
    const blacklistTotal = (memberBlRes.count || 0) + (extBlRes.count || 0)

    const IMG_W = 900
    const IMG_H = calcHeight(maxHull)

    // 渲染各分区格子
    const renderSection = (sec) => {
      const start = sec.range[0]
      const end = sec.range[1] === Infinity ? honorEnd : sec.range[1]
      if (end < start) return null

      const cells = []
      for (let n = start; n <= end; n++) {
        const name = assignments.get(n)
        cells.push(
          <div key={n} style={{
            width: CELL_W, height: CELL_H,
            borderRadius: 5,
            border: `1px solid ${name ? sec.color + '55' : sec.dimBg}`,
            background: name ? sec.color + '20' : sec.dimBg,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 2,
            opacity: name ? 1 : 0.5,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: name ? sec.color : sec.dimColor }}>
              {pad3(n)}
            </span>
            {name && (
              <span style={{ fontSize: 9, color: sec.color + 'cc', maxWidth: 74, overflow: 'hidden' }}>
                {name.slice(0, 9)}
              </span>
            )}
          </div>
        )
      }

      return (
        <div key={sec.label} style={{
          marginBottom: 12, border: `1px solid ${sec.color}22`,
          borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          {/* 分区标题 */}
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 8,
            padding: '7px 12px', background: '#0f111a',
            borderBottom: `1px solid ${sec.color}22`,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: sec.color }}>{sec.label}</span>
            <span style={{ fontSize: 10, color: '#374151' }}>{sec.sub}</span>
          </div>
          {/* 格子网格 */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: GAP,
            padding: SECTION_PAD, background: '#0b0d15',
          }}>
            {cells}
          </div>
        </div>
      )
    }

    const ts = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })

    const element = (
      <div style={{
        width: IMG_W, height: IMG_H,
        background: '#0c0e16', padding: 16,
        display: 'flex', flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif', color: '#e2e8f0',
      }}>
        {/* 头部统计 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', background: '#13151f',
          borderRadius: 8, border: '1px solid #1e2030', marginBottom: 12,
        }}>
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '0.04em' }}>
            ⚓ HORIZN 舷号座位图
          </span>
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { val: totalAssigned, label: '已分配', color: '#f59e0b' },
              { val: blacklistTotal, label: '黑名单', color: '#ef4444' },
              { val: gapCount,       label: '空位',   color: '#4b5563' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: s.color }}>{s.val}</span>
                <span style={{ fontSize: 11, color: '#4b5563', marginTop: 1 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 三个分区 */}
        {SECTIONS.map(renderSection)}

        {/* 页脚 */}
        <div style={{ fontSize: 10, color: '#1f2937', textAlign: 'right', marginTop: 4 }}>
          艾米莉亚 · {ts}
        </div>
      </div>
    )

    return new ImageResponse(element, { width: IMG_W, height: IMG_H })

  } catch (err) {
    console.error('[hull-seatmap] 生成失败:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
}
