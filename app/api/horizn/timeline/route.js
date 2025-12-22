import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

// 构建 idMapping
function buildIdMapping(members) {
  const mapping = {}
  for (const m of members || []) {
    const primaryName = m.primary_name || m.player_id
    const group0 = Array.isArray(m.name_groups)
      ? m.name_groups.find(g => g.group_index === 0)
      : null
    const variants = Array.isArray(group0?.names)
      ? group0.names.map(n => n?.name).filter(Boolean)
      : []
    const variantsStr = variants.length ? variants.join('|') : primaryName

    mapping[m.player_id] = {
      name: primaryName,
      nameVariants: variantsStr || m.player_id,
      joinDate: m.join_date ? String(m.join_date).replace(/-/g, '').slice(0, 8) : null,
      leaveDate: m.leave_date ? String(m.leave_date).replace(/-/g, '').slice(0, 8) : null
    }
  }
  return mapping
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const yearMonth = searchParams.get('yearMonth')

  if (!yearMonth || !/^\d{6}$/.test(yearMonth)) {
    return NextResponse.json(
      { error: 'Invalid yearMonth parameter' },
      { status: 400 }
    )
  }

  try {
    const supabase = getSupabase()

    // 并行查询
    const [cacheResult, membersResult] = await Promise.all([
      supabase
        .from('horizn_timeline_cache')
        .select('date, timeline, frame_count')
        .eq('year_month', yearMonth)
        .order('date'),
      supabase.rpc('horizn_get_members')
    ])

    if (cacheResult.error) throw cacheResult.error

    const days = cacheResult.data || []
    const idMapping = buildIdMapping(membersResult.data)
    const totalFrames = days.reduce((sum, d) => sum + (d.frame_count || 0), 0)

    return NextResponse.json({
      yearMonth,
      days,
      idMapping,
      totalFrames
    }, {
      headers: {
        // Vercel Edge 缓存 5 分钟，过期后允许返回旧数据同时后台刷新
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    })
  } catch (error) {
    console.error('[API] horizn/timeline error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// 强制动态渲染，禁用静态生成
export const dynamic = 'force-dynamic'
