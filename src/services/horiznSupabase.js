import { assertSupabase } from './supabaseClient'
import { generateColorMap } from '@/utils/csvParser'

const DEFAULT_MAX_SESSIONS = Number(process.env.NEXT_PUBLIC_HORIZN_MAX_SESSIONS)
  || (process.env.NODE_ENV === 'development' ? 80 : 200)
const DEFAULT_DATE_LIMIT = Number(process.env.NEXT_PUBLIC_HORIZN_DATE_LIMIT) || 400
const AVAILABLE_MONTHS_CACHE_TTL_MS = 5 * 60 * 1000

let cachedMembersIdMapping = null
let cachedAvailableMonths = null
let cachedAvailableMonthsAt = 0
const monthlyBaseCache = new Map()

const normalizeIsoDate = (dateValue) => {
  if (!dateValue) return ''
  return String(dateValue).replace(/-/g, '')
}

const toYmd8 = (dateValue) => {
  const ymd = normalizeIsoDate(dateValue)
  return ymd.length >= 8 ? ymd.slice(0, 8) : ymd
}

const getYearMonthFromDateValue = (dateValue) => normalizeIsoDate(dateValue).slice(0, 6)

const buildIdMappingFromMembers = (members) => {
  const mapping = {}
  for (const m of members || []) {
    const primaryName = m.primary_name || m.player_id
    const group0 = Array.isArray(m.name_groups) ? m.name_groups.find(g => g.group_index === 0) : null
    const variants = Array.isArray(group0?.names)
      ? group0.names.map(n => n?.name).filter(Boolean)
      : []
    const variantsStr = variants.length ? variants.join('|') : primaryName

    mapping[m.player_id] = {
      name: primaryName,
      nameVariants: variantsStr || m.player_id,
      joinDate: m.join_date ? toYmd8(m.join_date) : null,
      leaveDate: m.leave_date ? toYmd8(m.leave_date) : null
    }
  }
  return mapping
}

async function getMembersIdMapping() {
  if (cachedMembersIdMapping) return cachedMembersIdMapping

  const supabase = assertSupabase()
  const { data, error } = await supabase.rpc('horizn_get_members')
  if (error) throw error

  cachedMembersIdMapping = buildIdMappingFromMembers(data || [])
  return cachedMembersIdMapping
}

async function getAvailableDates(limit = DEFAULT_DATE_LIMIT) {
  const supabase = assertSupabase()
  const { data, error } = await supabase.rpc('horizn_get_available_dates', { p_limit: limit })
  if (error) throw error
  return data || []
}

function buildSessionsFromDaily(dailyData, dateValue) {
  const timestamps = Array.isArray(dailyData?.timestamps) ? dailyData.timestamps : []
  const members = Array.isArray(dailyData?.members) ? dailyData.members : []

  return timestamps.map((timeSlot) => {
    const entries = members.map((m) => {
      const ts = m.timeseries?.[timeSlot] || {}
      return {
        player_id: m.player_id,
        weekly_activity: ts.weekly ?? 0,
        season_activity: ts.season ?? 0
      }
    })

    return {
      session_time: `${dateValue} ${timeSlot}:00`,
      entries
    }
  })
}

const formatTimestamp = (input) => {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return input
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

const parseDateStr = (val) => {
  if (!val || val.length !== 8) return null
  const y = Number(val.slice(0, 4))
  const m = Number(val.slice(4, 6)) - 1
  const d = Number(val.slice(6, 8))
  const dt = new Date(y, m, d)
  return Number.isNaN(dt.getTime()) ? null : dt
}

const buildIdMapping = (rawMapping = {}) => {
  const mapping = {}
  Object.entries(rawMapping).forEach(([playerId, info]) => {
    mapping[playerId] = {
      name: info?.name || playerId,
      nameVariants: info?.name_variants || info?.nameVariants || playerId,
      joinDate: info?.join_date || info?.joinDate || null,
      leaveDate: info?.leave_date || info?.leaveDate || null
    }
  })
  return mapping
}

const getLeaveStatus = (leaveDateStr, monthStart, monthEnd) => {
  const leaveDate = parseDateStr(leaveDateStr)
  if (!leaveDate) return null
  if (leaveDate < monthStart) return 'left_before'
  if (leaveDate <= monthEnd) return 'left_this_month'
  return null
}

const buildTimeline = (sessions = [], idMapping, valueKey, monthStart, monthEnd) => {
  const playerIdSet = new Set(Object.keys(idMapping || {}))
  const frames = []
  const names = new Set()

  // 收集所有出现场景的玩家，确保未映射成员也能展示
  sessions.forEach((session) => {
    const entries = Array.isArray(session.entries) ? session.entries : []
    entries.forEach(e => playerIdSet.add(e.player_id))
  })

  const playerIds = Array.from(playerIdSet).sort()

  sessions.forEach((session) => {
    const entries = Array.isArray(session.entries) ? session.entries : []
    const valueMap = new Map(entries.map(e => [e.player_id, e[valueKey] ?? 0]))

    const allData = playerIds.map((playerId) => {
      const mapping = idMapping[playerId] || { name: playerId, nameVariants: playerId, joinDate: null, leaveDate: null }
      const value = Number(valueMap.get(playerId) || 0)
      const leaveStatus = getLeaveStatus(mapping.leaveDate, monthStart, monthEnd)
      const item = {
        playerId,
        name: mapping.name || playerId,
        value,
        isOnline: false,
        playerInfo: mapping,
        leaveStatus
      }
      names.add(item.name)
      return item
    })

    const filteredAll = monthStart ? allData.filter(item => item.leaveStatus !== 'left_before') : allData
    const sortedAll = filteredAll.slice().sort((a, b) => b.value - a.value)
    const displayData = sortedAll.filter(item => item.value > 0)
    const total = sortedAll.reduce((sum, item) => sum + item.value, 0)

    frames.push({
      timestamp: formatTimestamp(session.session_time),
      data: displayData,
      allData: sortedAll,
      total,
      onlineCount: 0
    })
  })

  return { timeline: frames, names }
}

export async function getHoriznAvailableMonths() {
  const now = Date.now()
  if (cachedAvailableMonths && now - cachedAvailableMonthsAt < AVAILABLE_MONTHS_CACHE_TTL_MS) {
    return cachedAvailableMonths
  }

  const supabase = assertSupabase()
  const { data, error } = await supabase.rpc('horizn_get_available_months')
  if (error) throw error

  cachedAvailableMonths = (data || []).map(item => ({
    yearMonth: item.year_month,
    startDate: item.start_date,
    endDate: item.end_date,
    scanCount: item.scan_count
  }))
  cachedAvailableMonthsAt = now
  return cachedAvailableMonths
}

async function runMonthlyRpc(supabase, yearMonth, sessionLimit) {
  const { data, error } = await supabase.rpc('horizn_get_monthly_activity', {
    p_year_month: yearMonth,
    p_max_sessions: sessionLimit
  })
  if (!error) return data

  if (String(error.code) === '57014' && sessionLimit > 50) {
    const nextLimit = Math.max(50, Math.floor(sessionLimit / 2))
    if (nextLimit < sessionLimit) {
      console.warn('[horiznSupabase] RPC timeout, retry with smaller p_max_sessions:', nextLimit)
      return runMonthlyRpc(supabase, yearMonth, nextLimit)
    }
  }

  throw error
}

export async function getHoriznMonthlyBase(yearMonth, maxSessions = DEFAULT_MAX_SESSIONS) {
  const cacheKey = `${yearMonth || ''}:${maxSessions}`
  if (monthlyBaseCache.has(cacheKey)) {
    const cached = monthlyBaseCache.get(cacheKey)
    return typeof cached?.then === 'function' ? await cached : cached
  }

  const supabase = assertSupabase()

  const promise = (async () => {
    const membersPromise = getMembersIdMapping().catch((e) => {
      console.warn('[horiznSupabase] Failed to load members mapping:', e)
      return {}
    })
    const data = await runMonthlyRpc(supabase, yearMonth, maxSessions)
    const sessions = Array.isArray(data?.sessions) ? data.sessions : []

    const playerIdSet = new Set()
    sessions.forEach((session) => {
      const entries = Array.isArray(session?.entries) ? session.entries : []
      entries.forEach(e => playerIdSet.add(e.player_id))
    })

    const [membersMappingRaw] = await Promise.all([membersPromise])
    const rpcMapping = buildIdMapping(data?.id_mapping || {})
    const membersMapping = membersMappingRaw || {}

    const mergedMapping = { ...membersMapping, ...rpcMapping }
    const idMapping = {}
    playerIdSet.forEach((playerId) => {
      if (mergedMapping[playerId]) idMapping[playerId] = mergedMapping[playerId]
    })

    // 月份边界，用于离队标记
    const start = parseDateStr(`${yearMonth}01`) || new Date()
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59)

    const allNames = new Set()
    Object.values(idMapping).forEach((info) => allNames.add(info?.name))
    playerIdSet.forEach((playerId) => {
      if (!mergedMapping[playerId]) allNames.add(playerId)
    })

    return {
      yearMonth,
      sessions,
      idMapping,
      colorMap: generateColorMap(Array.from(allNames).filter(Boolean)),
      monthStart: start,
      monthEnd: end
    }
  })()

  monthlyBaseCache.set(cacheKey, promise)
  try {
    const resolved = await promise
    monthlyBaseCache.set(cacheKey, resolved)
    return resolved
  } catch (e) {
    monthlyBaseCache.delete(cacheKey)
    throw e
  }
}

export function buildHoriznTimelineFromBase(base, valueKey) {
  return buildTimeline(base?.sessions || [], base?.idMapping || {}, valueKey, base?.monthStart, base?.monthEnd).timeline
}

export async function getHoriznMonthlyData(yearMonth, maxSessions = DEFAULT_MAX_SESSIONS) {
  const base = await getHoriznMonthlyBase(yearMonth, maxSessions)
  const weeklyTimeline = buildHoriznTimelineFromBase(base, 'weekly_activity')
  const seasonTimeline = buildHoriznTimelineFromBase(base, 'season_activity')

  return {
    weekly: { timeline: weeklyTimeline, colorMap: base.colorMap, idMapping: base.idMapping },
    season: { timeline: seasonTimeline, colorMap: base.colorMap, idMapping: base.idMapping }
  }
}

export async function getLatestHoriznMonth() {
  const months = await getHoriznAvailableMonths()
  return months?.[0]?.yearMonth || null
}

// ============================================
// 新版：从缓存表读取（毫秒级响应）
// ============================================

/**
 * 从缓存表获取月度数据（直接查表，不走 RPC）
 */
export async function getHoriznMonthlyBaseCached(yearMonth) {
  const cacheKey = `cached:${yearMonth}`
  if (monthlyBaseCache.has(cacheKey)) {
    const cached = monthlyBaseCache.get(cacheKey)
    return typeof cached?.then === 'function' ? await cached : cached
  }

  const supabase = assertSupabase()

  const promise = (async () => {
    console.log('[horiznSupabase] Fetching from cache table (direct query):', yearMonth)
    const startTime = Date.now()

    // 并行查询：缓存表 + 成员映射
    const [cacheResult, membersResult] = await Promise.all([
      supabase
        .from('horizn_timeline_cache')
        .select('date, timeline, frame_count')
        .eq('year_month', yearMonth)
        .order('date'),
      getMembersIdMapping()
    ])

    if (cacheResult.error) {
      console.error('[horiznSupabase] Cache query error:', cacheResult.error)
      throw cacheResult.error
    }

    const elapsed = Date.now() - startTime
    console.log(`[horiznSupabase] Cache fetch took ${elapsed}ms`)

    const days = cacheResult.data || []
    const idMapping = membersResult || {}

    // 合并所有天的 timeline，转换成 sessions 格式
    // 格式: {ts: "HH:MM", d: [{p: playerId, w: weekly, s: season}, ...]}
    const sessions = []
    const allNames = new Set()

    // 从 idMapping 收集所有名字
    Object.values(idMapping).forEach(info => {
      if (info?.name) allNames.add(info.name)
    })

    days.forEach(day => {
      const dateStr = day.date // "2025-12-22"
      const timeline = day.timeline || []
      timeline.forEach(frame => {
        const entries = (frame.d || []).map(p => ({
          player_id: p.p,
          weekly_activity: p.w || 0,
          season_activity: p.s || 0
        }))
        sessions.push({
          session_time: `${dateStr} ${frame.ts}:00`,
          entries
        })
      })
    })

    // 月份边界
    const start = parseDateStr(`${yearMonth}01`) || new Date()
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59)

    const totalFrames = days.reduce((sum, d) => sum + (d.frame_count || 0), 0)

    return {
      yearMonth,
      sessions,
      idMapping,
      colorMap: generateColorMap(Array.from(allNames).filter(Boolean)),
      monthStart: start,
      monthEnd: end,
      _fromCache: true,
      _totalFrames: totalFrames
    }
  })()

  monthlyBaseCache.set(cacheKey, promise)
  try {
    const resolved = await promise
    monthlyBaseCache.set(cacheKey, resolved)
    return resolved
  } catch (e) {
    monthlyBaseCache.delete(cacheKey)
    throw e
  }
}

/**
 * 从 Next.js API 获取数据（服务端缓存）
 */
export async function getHoriznMonthlyBaseFromAPI(yearMonth) {
  const cacheKey = `api:${yearMonth}`
  if (monthlyBaseCache.has(cacheKey)) {
    const cached = monthlyBaseCache.get(cacheKey)
    return typeof cached?.then === 'function' ? await cached : cached
  }

  const promise = (async () => {
    console.log('[horiznSupabase] Fetching from API (server cached):', yearMonth)
    const startTime = Date.now()

    const res = await fetch(`/api/horizn/timeline?yearMonth=${yearMonth}`)
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'API request failed')
    }

    const data = await res.json()
    const elapsed = Date.now() - startTime
    console.log(`[horiznSupabase] API fetch took ${elapsed}ms`)

    const { days, idMapping, totalFrames } = data

    // 转换成 sessions 格式
    const sessions = []
    const allNames = new Set()

    Object.values(idMapping || {}).forEach(info => {
      if (info?.name) allNames.add(info.name)
    })

    ;(days || []).forEach(day => {
      const dateStr = day.date
      const timeline = day.timeline || []
      timeline.forEach(frame => {
        const entries = (frame.d || []).map(p => ({
          player_id: p.p,
          weekly_activity: p.w || 0,
          season_activity: p.s || 0
        }))
        sessions.push({
          session_time: `${dateStr} ${frame.ts}:00`,
          entries
        })
      })
    })

    const start = parseDateStr(`${yearMonth}01`) || new Date()
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59)

    return {
      yearMonth,
      sessions,
      idMapping: idMapping || {},
      colorMap: generateColorMap(Array.from(allNames).filter(Boolean)),
      monthStart: start,
      monthEnd: end,
      _fromCache: true,
      _fromAPI: true,
      _totalFrames: totalFrames || 0
    }
  })()

  monthlyBaseCache.set(cacheKey, promise)
  try {
    const resolved = await promise
    monthlyBaseCache.set(cacheKey, resolved)
    return resolved
  } catch (e) {
    monthlyBaseCache.delete(cacheKey)
    throw e
  }
}

const OSS_HORIZN_BASE = 'https://lingflow.oss-cn-heyuan.aliyuncs.com/mw-gacha-simulation/horizn'

/**
 * 从 OSS 获取预缓存数据（最快）
 */
export async function getHoriznMonthlyBaseFromOSS(yearMonth) {
  const cacheKey = `oss:${yearMonth}`
  if (monthlyBaseCache.has(cacheKey)) {
    const cached = monthlyBaseCache.get(cacheKey)
    return typeof cached?.then === 'function' ? await cached : cached
  }

  const promise = (async () => {
    console.log('[horiznSupabase] Fetching from OSS:', yearMonth)
    const startTime = Date.now()

    // 并行获取 idMapping 和可用月份信息
    const [idMappingRes, availableMonthsRes] = await Promise.all([
      fetch(`${OSS_HORIZN_BASE}/id-mapping.json?t=${Date.now()}`),
      fetch(`${OSS_HORIZN_BASE}/available-months.json?t=${Date.now()}`)
    ])

    if (!idMappingRes.ok) throw new Error('id-mapping not found')
    if (!availableMonthsRes.ok) throw new Error('available-months not found')

    const [idMappingData, availableMonths] = await Promise.all([
      idMappingRes.json(),
      availableMonthsRes.json()
    ])

    // 新格式: { months: { "202512": ["04", "05", ...], ... } }
    const availableDays = availableMonths.months?.[yearMonth]
    if (!availableDays || availableDays.length === 0) {
      throw new Error(`Month ${yearMonth} not available in OSS`)
    }

    console.log(`[horiznSupabase] OSS has ${availableDays.length} days for ${yearMonth}:`, availableDays.join(', '))

    // 只请求有数据的日期
    const dayPromises = availableDays.map(dayStr =>
      fetch(`${OSS_HORIZN_BASE}/timeline/${yearMonth}/${dayStr}.json`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    )

    const daysData = await Promise.all(dayPromises)
    const days = daysData.filter(Boolean).sort((a, b) => a.date.localeCompare(b.date))

    const elapsed = Date.now() - startTime
    console.log(`[horiznSupabase] OSS fetch took ${elapsed}ms, ${days.length} days`)

    const idMapping = idMappingData?.data || {}

    // 转换成 sessions 格式
    const sessions = []
    const allNames = new Set()

    Object.values(idMapping).forEach(info => {
      if (info?.name) allNames.add(info.name)
    })

    days.forEach(day => {
      const dateStr = day.date
      const timeline = day.timeline || []
      timeline.forEach(frame => {
        const entries = (frame.d || []).map(p => ({
          player_id: p.p,
          weekly_activity: p.w || 0,
          season_activity: p.s || 0
        }))
        sessions.push({
          session_time: `${dateStr} ${frame.ts}:00`,
          entries
        })
      })
    })

    const start = parseDateStr(`${yearMonth}01`) || new Date()
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59)
    const totalFrames = days.reduce((sum, d) => sum + (d.frameCount || 0), 0)

    return {
      yearMonth,
      sessions,
      idMapping,
      colorMap: generateColorMap(Array.from(allNames).filter(Boolean)),
      monthStart: start,
      monthEnd: end,
      _fromCache: true,
      _fromOSS: true,
      _totalFrames: totalFrames
    }
  })()

  monthlyBaseCache.set(cacheKey, promise)
  try {
    const resolved = await promise
    monthlyBaseCache.set(cacheKey, resolved)
    return resolved
  } catch (e) {
    monthlyBaseCache.delete(cacheKey)
    throw e
  }
}

/**
 * 智能获取月度数据：OSS（预缓存）→ 直接查表 → 原始 RPC
 */
export async function getHoriznMonthlyBaseSmart(yearMonth, maxSessions = DEFAULT_MAX_SESSIONS) {
  // 1. 优先从 OSS 获取（预缓存，最快）
  try {
    return await getHoriznMonthlyBaseFromOSS(yearMonth)
  } catch (e) {
    console.warn('[horiznSupabase] OSS failed, fallback to direct query:', e.message)
  }

  // 2. 回退到直接查表
  try {
    return await getHoriznMonthlyBaseCached(yearMonth)
  } catch (e) {
    console.warn('[horiznSupabase] Direct query failed, fallback to original RPC:', e.message)
  }

  // 3. 最后回退到原始 RPC
  return await getHoriznMonthlyBase(yearMonth, maxSessions)
}

/**
 * 获取被踢出的成员列表（用于审核回队资格）
 * @returns {Promise<Array>} 被踢出的成员列表
 */
export async function getKickedMembers() {
  const supabase = assertSupabase()

  // 查询所有被标记为 is_kicked 的离队事件
  const { data: kickedEvents, error } = await supabase
    .from('horizn_membership_events')
    .select(`
      id,
      player_id,
      event_time,
      is_kicked,
      member:horizn_members!horizn_membership_events_member_id_fkey (
        player_id,
        member_number
      )
    `)
    .eq('event_type', 'leave')
    .eq('is_kicked', true)
    .order('event_time', { ascending: false })

  if (error) {
    console.error('[horiznSupabase] Failed to load kicked members:', error)
    throw error
  }

  if (!kickedEvents || kickedEvents.length === 0) {
    return []
  }

  // 获取所有被踢出成员的 player_id 列表
  const playerIds = [...new Set(kickedEvents.map(e => e.player_id))]

  // 查询这些成员的所有 join 事件，用于判断是否已归队
  const { data: joinEvents, error: joinError } = await supabase
    .from('horizn_membership_events')
    .select('player_id, event_time')
    .eq('event_type', 'join')
    .in('player_id', playerIds)
    .order('event_time', { ascending: false })

  if (joinError) {
    console.warn('[horiznSupabase] Failed to load join events:', joinError)
  }

  // 构建 player_id -> 最新 join 时间 的映射
  const latestJoinMap = new Map()
  for (const je of (joinEvents || [])) {
    if (!latestJoinMap.has(je.player_id)) {
      latestJoinMap.set(je.player_id, new Date(je.event_time))
    }
  }

  // 获取成员 ID 映射以获取名字
  const idMapping = await getMembersIdMapping()

  // 转换数据格式
  return kickedEvents.map(event => {
    const kickedAt = new Date(event.event_time)
    const rejoinAllowedAt = new Date(kickedAt.getTime() + 30 * 24 * 60 * 60 * 1000) // 踢出后30天
    const now = new Date()
    const canRejoin = now >= rejoinAllowedAt

    // 检查是否已归队（有踢出后的 join 事件）
    const latestJoin = latestJoinMap.get(event.player_id)
    const hasRejoined = latestJoin && latestJoin > kickedAt

    // 计算提前归队天数（如果在30天冷却期结束前归队）
    let earlyRejoinDays = 0
    if (hasRejoined && latestJoin < rejoinAllowedAt) {
      earlyRejoinDays = Math.ceil((rejoinAllowedAt.getTime() - latestJoin.getTime()) / (1000 * 60 * 60 * 24))
    }

    // 从 idMapping 获取名字
    const memberInfo = idMapping[event.player_id]
    const memberName = memberInfo?.name || event.player_id

    return {
      id: event.id,
      playerId: event.player_id,
      memberName,
      memberNumber: event.member?.member_number || '',
      kickedAt: kickedAt.toISOString(),
      rejoinAllowedAt: rejoinAllowedAt.toISOString(),
      canRejoin,
      daysUntilRejoin: canRejoin ? 0 : Math.ceil((rejoinAllowedAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      hasRejoined,
      rejoinedAt: hasRejoined ? latestJoin.toISOString() : null,
      earlyRejoinDays
    }
  })
}

/**
 * 获取指定月份的成员入离队事件
 * @param {number} year - 年份
 * @param {number} month - 月份 (1-12)
 * @returns {Promise<Array>} 入离队事件列表
 */
export async function getMonthlyMembershipEvents(year, month) {
  const supabase = assertSupabase()

  // 构建月份范围
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59, 999)

  const { data, error } = await supabase
    .from('horizn_membership_events')
    .select(`
      id,
      player_id,
      event_type,
      event_time,
      is_kicked,
      member:horizn_members!horizn_membership_events_member_id_fkey (
        player_id,
        member_number
      )
    `)
    .gte('event_time', startDate.toISOString())
    .lte('event_time', endDate.toISOString())
    .order('event_time', { ascending: false })

  if (error) {
    console.error('[horiznSupabase] Failed to load membership events:', error)
    throw error
  }

  // 获取成员 ID 映射以获取名字
  const idMapping = await getMembersIdMapping()

  // 转换数据格式
  return (data || []).map(event => {
    const memberInfo = idMapping[event.player_id]
    return {
      id: event.id,
      playerId: event.player_id,
      memberName: memberInfo?.name || event.player_id,
      memberNumber: event.member?.member_number || '',
      eventType: event.event_type, // 'join' | 'leave'
      eventTime: event.event_time,
      isKicked: event.is_kicked || false
    }
  })
}

/**
 * 标记/取消标记离队事件为被踢出
 * @param {string} eventId - 事件 ID
 * @param {boolean} isKicked - 是否被踢出
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function markEventKicked(eventId, isKicked) {
  const supabase = assertSupabase()

  const { error } = await supabase
    .from('horizn_membership_events')
    .update({ is_kicked: isKicked })
    .eq('id', eventId)

  if (error) {
    console.error('[horiznSupabase] Failed to mark event kicked:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
