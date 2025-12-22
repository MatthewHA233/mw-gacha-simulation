import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import OSS from 'ali-oss'

// Supabase 客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

// OSS 客户端
function getOSSClient() {
  return new OSS({
    region: 'oss-cn-heyuan',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    bucket: process.env.OSS_BUCKET_NAME
  })
}

const OSS_PREFIX = 'mw-gacha-simulation/horizn'

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

// 上传 JSON 到 OSS
async function uploadToOSS(client, path, data) {
  const content = JSON.stringify(data)
  await client.put(path, Buffer.from(content), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60'
    }
  })
  return content.length
}

export async function POST(request) {
  // 验证 Cron 密钥（防止未授权调用）
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // 开发环境允许无密钥调用
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { searchParams } = new URL(request.url)
  const initMode = searchParams.get('init') === 'true' // 初始化模式：同步所有数据

  const startTime = Date.now()
  const logs = []

  try {
    const supabase = getSupabase()
    const ossClient = getOSSClient()

    // 0. 先刷新 Supabase 缓存表
    if (initMode) {
      logs.push('Running horizn_init_cache()...')
      const { data: initResult, error: initError } = await supabase.rpc('horizn_init_cache')
      if (initError) throw initError
      logs.push(`Initialized ${initResult?.length || 0} days in Supabase cache`)
    } else {
      logs.push('Running horizn_smart_refresh()...')
      const { data: refreshResult, error: refreshError } = await supabase.rpc('horizn_smart_refresh', {
        p_hot_days: 2,
        p_max_stale: 10
      })
      if (refreshError) throw refreshError
      logs.push(`Refreshed ${refreshResult?.length || 0} days in Supabase cache`)
    }

    // 1. 同步成员映射
    logs.push('Fetching members...')
    const { data: members, error: membersError } = await supabase.rpc('horizn_get_members')
    if (membersError) throw membersError

    const idMapping = buildIdMapping(members)
    const mappingSize = await uploadToOSS(ossClient, `${OSS_PREFIX}/id-mapping.json`, {
      updatedAt: new Date().toISOString(),
      data: idMapping
    })
    logs.push(`Uploaded id-mapping.json (${mappingSize} bytes)`)

    // 2. 确定需要同步的日期
    const today = new Date()
    const hotDays = 2 // 最近2天强制同步

    // 获取缓存表中的数据
    const { data: cacheData, error: cacheError } = await supabase
      .from('horizn_timeline_cache')
      .select('date, timeline, frame_count, is_stale, updated_at')
      .order('date', { ascending: false })
      .limit(100) // 增加限制以支持初始化

    if (cacheError) throw cacheError

    // 3. 同步每天的 timeline
    let syncedCount = 0
    for (const day of cacheData || []) {
      const dayDate = new Date(day.date)
      const daysAgo = Math.floor((today - dayDate) / (1000 * 60 * 60 * 24))

      // 初始化模式同步所有，否则只同步热数据和脏数据
      const needsSync = initMode || daysAgo < hotDays || day.is_stale

      if (needsSync && day.timeline) {
        const dateStr = day.date // "2025-12-22"
        const yearMonth = dateStr.slice(0, 7).replace('-', '') // "202512"
        const dayNum = dateStr.slice(8, 10) // "22"

        const size = await uploadToOSS(
          ossClient,
          `${OSS_PREFIX}/timeline/${yearMonth}/${dayNum}.json`,
          {
            date: day.date,
            frameCount: day.frame_count,
            updatedAt: day.updated_at,
            timeline: day.timeline
          }
        )
        logs.push(`Synced ${dateStr} (${size} bytes, ${day.frame_count} frames)`)
        syncedCount++
      }
    }

    // 4. 更新可用月份列表（包含每月具体日期）
    const monthsMap = {}
    for (const day of cacheData || []) {
      const yearMonth = day.date.slice(0, 7).replace('-', '') // "202512"
      const dayNum = day.date.slice(8, 10) // "22"
      if (!monthsMap[yearMonth]) {
        monthsMap[yearMonth] = []
      }
      monthsMap[yearMonth].push(dayNum)
    }
    // 对每个月的日期排序
    for (const ym of Object.keys(monthsMap)) {
      monthsMap[ym].sort()
    }

    await uploadToOSS(ossClient, `${OSS_PREFIX}/available-months.json`, {
      updatedAt: new Date().toISOString(),
      months: monthsMap
    })
    const monthSummary = Object.entries(monthsMap)
      .map(([ym, days]) => `${ym}(${days.length}天)`)
      .join(', ')
    logs.push(`Updated available-months.json: ${monthSummary}`)

    const elapsed = Date.now() - startTime
    return NextResponse.json({
      success: true,
      syncedDays: syncedCount,
      elapsed: `${elapsed}ms`,
      logs
    })

  } catch (error) {
    console.error('[Sync] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      logs
    }, { status: 500 })
  }
}

// GET 方法用于手动触发测试
export async function GET(request) {
  return POST(request)
}
