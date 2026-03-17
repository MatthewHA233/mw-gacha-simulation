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

    // 并行获取 idMapping（Supabase）和可用月份信息（OSS）
    const [membersMapping, availableMonthsRes] = await Promise.all([
      getMembersIdMapping(),
      fetch(`${OSS_HORIZN_BASE}/available-months.json?t=${Date.now()}`)
    ])

    if (!availableMonthsRes.ok) throw new Error('available-months not found')

    const availableMonths = await availableMonthsRes.json()

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

    const idMapping = membersMapping || {}

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

  // 获取 QQ 成员列表
  const qqMembers = await getQQMembers()
  const playerIdToQQ = new Map()
  qqMembers.forEach(qq => {
    if (qq.member?.player_id) {
      playerIdToQQ.set(qq.member.player_id, qq.qq_id)
    }
  })

  // 转换数据格式
  return (data || []).map(event => {
    const memberInfo = idMapping[event.player_id]
    const qqId = playerIdToQQ.get(event.player_id)
    return {
      id: event.id,
      playerId: event.player_id,
      memberName: memberInfo?.name || event.player_id,
      memberNumber: event.member?.member_number || '',
      eventType: event.event_type, // 'join' | 'leave'
      eventTime: event.event_time,
      isKicked: event.is_kicked || false,
      qqId: qqId || null
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

// ===================================================
// DuckDB HTTP API（活跃度数据）
// ===================================================

const DUCKDB_URL = process.env.NEXT_PUBLIC_DUCKDB_URL

async function queryDuckDB(sql, args = []) {
  if (!DUCKDB_URL) throw new Error('NEXT_PUBLIC_DUCKDB_URL 未配置')
  const response = await fetch(`${DUCKDB_URL}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, args })
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DuckDB query failed (${response.status}): ${errorText}`)
  }
  return response.json()
}

function getChinaToday() {
  const now = new Date()
  const chinaTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  return chinaTime.toISOString().slice(0, 10)
}

/**
 * 获取整月活跃度考核数据（DuckDB 活跃度 + Supabase 成员信息）
 * @param {number} year - 年份
 * @param {number} month - 月份 (1-12)
 * @param {number} cutoffHour - 考核截止小时（默认12，即周日中午12点）
 * @returns {Promise<Array>} 全月考核数据
 */
export async function getMonthlyCheckData(year, month, cutoffHour = 12) {
  const supabase = assertSupabase()

  console.log(`[horiznSupabase] 获取 ${year}年${month}月 全月考核数据 (DuckDB + Supabase)...`)

  const today = getChinaToday()
  const todayDate = new Date(today)
  const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() + 1 === month

  const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00`

  const duckDbSql = `
    WITH sunday_records AS (
      SELECT DISTINCT session_time,
        strftime(session_time, '%m-%d %H:%M') AS frame_label,
        CEIL(EXTRACT(DAY FROM session_time) / 7.0)::int AS week_number,
        session_time::date AS sunday_date,
        EXTRACT(HOUR FROM session_time) AS frame_hour
      FROM horizn_activity_records
      WHERE session_time >= ?::timestamp AND session_time < ?::timestamp
        AND EXTRACT(DOW FROM session_time) = 0
    ),
    ranked AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY sunday_date ORDER BY session_time) AS rn
      FROM sunday_records WHERE frame_hour >= ?
    ),
    sunday_frames AS (
      SELECT session_time, frame_label, week_number FROM ranked WHERE rn = 1
    ),
    latest_frame AS (
      SELECT session_time,
        strftime(session_time, '%m-%d %H:%M') AS frame_label,
        0 AS week_number
      FROM horizn_activity_records
      WHERE session_time >= ?::timestamp AND session_time < ?::timestamp
      ORDER BY session_time DESC LIMIT 1
    ),
    all_frames AS (
      SELECT * FROM sunday_frames
      UNION ALL
      SELECT * FROM latest_frame
      WHERE ? = true
        AND session_time NOT IN (SELECT session_time FROM sunday_frames)
    )
    SELECT af.week_number, af.session_time, af.frame_label,
           ar.player_id,
           COALESCE(ar.weekly_activity, 0) AS weekly_activity,
           COALESCE(ar.season_activity, 0) AS season_activity
    FROM all_frames af
    JOIN horizn_activity_records ar ON ar.session_time = af.session_time
    ORDER BY af.week_number, af.session_time, ar.player_id
  `

  // 并行请求 DuckDB 活跃度 + Supabase 成员 + 入队日期
  const [duckResult, membersResult, joinDatesResult] = await Promise.all([
    queryDuckDB(duckDbSql, [
      startDate, endDate,       // sunday_records WHERE
      cutoffHour,               // ranked WHERE
      startDate, endDate,       // latest_frame WHERE
      isCurrentMonth            // all_frames WHERE
    ]),
    supabase.rpc('horizn_get_members'),
    supabase
      .from('horizn_membership_events')
      .select('player_id, event_time')
      .eq('event_type', 'join')
      .order('event_time', { ascending: false })
  ])

  // 成员 Map
  const memberMap = new Map()
  if (membersResult.data) {
    for (const m of membersResult.data) {
      memberMap.set(m.player_id, {
        name: m.primary_name || m.player_id,
        member_number: m.member_number
      })
    }
  }

  // 入队日期 Map
  const joinDateMap = new Map()
  if (joinDatesResult.data) {
    for (const event of joinDatesResult.data) {
      if (!joinDateMap.has(event.player_id)) {
        joinDateMap.set(event.player_id, event.event_time.slice(0, 10))
      }
    }
  }

  // 合并
  const rows = duckResult.rows || []
  const records = rows.map(row => {
    const playerId = row[3]
    const info = memberMap.get(playerId)
    return {
      week_number: row[0],
      session_time: row[1],
      frame_label: row[2],
      player_id: playerId,
      member_name: info?.name || playerId,
      member_number: info?.member_number || '???',
      join_date: joinDateMap.get(playerId) || null,
      weekly_activity: row[4],
      season_activity: row[5]
    }
  })

  console.log(`[horiznSupabase] DuckDB ${rows.length} 行活跃度 + ${memberMap.size} 成员 → ${records.length} 条考核数据`)
  return records
}

/**
 * 获取新人每日追踪数据（DuckDB 活跃度 + Supabase 成员/入队事件）
 * @param {number} year
 * @param {number} month
 * @param {number} startDay - 从几号开始算新人（1 = 追踪本月所有入队新人）
 * @param {number} cutoffHour - 凌晨几点算次日数据
 * @returns {Promise<Array>} NewcomerDailyRecord[]
 */
export async function getNewcomerDailyCheck(year, month, startDay = 1, cutoffHour = 0) {
  const supabase = assertSupabase()

  console.log(`[horiznSupabase] 获取 ${year}年${month}月 新人追踪数据 (startDay=${startDay})...`)

  const today = getChinaToday()
  const newcomerStart = `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
  const monthEnd = new Date(year, month, 0)
  const monthEndStr = monthEnd.toISOString().slice(0, 10)

  // 1. 从 Supabase 查找本月 startDay 后入队的新人
  const { data: joinEvents, error: joinError } = await supabase
    .from('horizn_membership_events')
    .select('player_id, event_time')
    .eq('event_type', 'join')
    .gte('event_time', `${newcomerStart}T00:00:00`)
    .lte('event_time', `${monthEndStr}T23:59:59`)
    .order('event_time', { ascending: false })

  if (joinError) {
    console.error('[horiznSupabase] 获取新人入队事件失败:', joinError)
    throw joinError
  }

  if (!joinEvents || joinEvents.length === 0) {
    console.log('[horiznSupabase] 本月无新人')
    return []
  }

  // 去重：每个 player_id 只取最新的入队事件
  const newcomerMap = new Map()
  for (const event of joinEvents) {
    if (!newcomerMap.has(event.player_id)) {
      newcomerMap.set(event.player_id, {
        player_id: event.player_id,
        join_date: event.event_time.slice(0, 10)
      })
    }
  }

  const playerIds = Array.from(newcomerMap.keys())
  console.log(`[horiznSupabase] 找到 ${playerIds.length} 个新人`)

  // 2. DuckDB 查每日活跃度
  const newcomerStartPlus1 = new Date(year, month - 1, startDay + 1).toISOString().slice(0, 10)
  const playerPlaceholders = playerIds.map(() => '?').join(', ')

  const sql = `
    WITH
    history_frames AS (
      SELECT
        (session_time::date - INTERVAL '1 day')::date AS frame_date,
        session_time AS frame_time,
        false AS is_today,
        ROW_NUMBER() OVER (
          PARTITION BY (session_time::date - INTERVAL '1 day')::date
          ORDER BY session_time ASC
        ) AS rn
      FROM horizn_activity_records
      WHERE session_time::date >= ?::date
        AND session_time::date <= ?::date
        AND EXTRACT(HOUR FROM session_time) >= ?
        AND (session_time::date - INTERVAL '1 day')::date >= ?::date
        AND (session_time::date - INTERVAL '1 day')::date < ?::date
    ),
    today_frame AS (
      SELECT ?::date AS frame_date, session_time AS frame_time, true AS is_today,
        ROW_NUMBER() OVER (ORDER BY session_time DESC) AS rn
      FROM horizn_activity_records
      WHERE session_time::date = ?::date
    ),
    all_frames AS (
      SELECT frame_date, frame_time, is_today FROM history_frames WHERE rn = 1
      UNION ALL
      SELECT frame_date, frame_time, is_today FROM today_frame WHERE rn = 1
    )
    SELECT af.frame_date, af.frame_time, af.is_today,
           ar.player_id, COALESCE(ar.season_activity, 0) AS season_activity
    FROM all_frames af
    LEFT JOIN horizn_activity_records ar
      ON ar.session_time = af.frame_time
      AND ar.player_id IN (${playerPlaceholders})
    ORDER BY af.frame_date, ar.player_id
  `

  const duckArgs = [
    newcomerStartPlus1, today, cutoffHour,
    newcomerStart, today,
    today, today,
    ...playerIds
  ]

  // 并行查 DuckDB + 成员信息
  const [duckResult, membersResult] = await Promise.all([
    queryDuckDB(sql, duckArgs),
    supabase.rpc('horizn_get_members')
  ])

  const memberMap = new Map()
  if (membersResult.data) {
    for (const m of membersResult.data) {
      memberMap.set(m.player_id, {
        name: m.primary_name || m.player_id,
        member_number: m.member_number
      })
    }
  }

  // 合并
  const records = []
  for (const row of (duckResult.rows || [])) {
    const playerId = row[3]
    if (!playerId) continue
    const newcomer = newcomerMap.get(playerId)
    if (!newcomer) continue
    const frameDate = row[0]
    if (frameDate < newcomer.join_date) continue

    const info = memberMap.get(playerId)
    records.push({
      player_id: playerId,
      member_name: info?.name || playerId,
      member_number: info?.member_number || '???',
      join_date: newcomer.join_date,
      check_date: frameDate,
      check_time: row[1],
      season_activity: row[4],
      is_today: row[2]
    })
  }

  records.sort((a, b) => {
    if (a.join_date !== b.join_date) return b.join_date.localeCompare(a.join_date)
    if (a.player_id !== b.player_id) return a.player_id.localeCompare(b.player_id)
    return a.check_date.localeCompare(b.check_date)
  })

  console.log(`[horiznSupabase] 返回 ${records.length} 条新人追踪数据`)
  return records
}

/**
 * 获取月度规则配置
 * @param {number} year - 年份
 * @param {number} month - 月份 (1-12)
 * @returns {Promise<Object|null>} 规则配置
 */
export async function getMonthlyRules(year, month) {
  const supabase = assertSupabase()

  const { data, error } = await supabase
    .from('horizn_monthly_rules')
    .select('rule_config')
    .eq('year', year)
    .eq('month', month)
    .eq('rule_type', 'assessment')
    .eq('rule_name', 'monthly_rules')
    .single()

  if (error || !data) {
    return null
  }

  return data.rule_config
}

/**
 * 保存月度规则配置
 * @param {number} year - 年份
 * @param {number} month - 月份 (1-12)
 * @param {Object} config - 规则配置
 * @returns {Promise<boolean>} 是否成功
 */
export async function saveMonthlyRules(year, month, config) {
  const supabase = assertSupabase()

  const { error } = await supabase
    .from('horizn_monthly_rules')
    .upsert({
      year,
      month,
      rule_type: 'assessment',
      rule_name: 'monthly_rules',
      rule_config: config,
      is_active: true,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'year,month,rule_type,rule_name'
    })

  if (error) {
    console.error('[horiznSupabase] 保存月度规则失败:', error)
    return false
  }

  return true
}

/**
 * 获取 QQ 群成员列表（关联游戏成员）
 * @returns {Promise<Array>} QQ 成员列表
 */
export async function getQQMembers() {
  const supabase = assertSupabase()

  const { data, error } = await supabase.rpc('horizn_get_qq_members')

  if (error) {
    console.error('[horiznSupabase] 获取 QQ 成员列表失败:', error)
    return []
  }

  return data || []
}

/**
 * 发送群消息（通过 Next.js API 代理）
 * @param {string} message - 消息内容（支持 CQ 码）
 * @returns {Promise<{success: boolean, message_id?: number, error?: string}>}
 */
/**
 * 获取全部成员（含 hull_number / blacklist 字段），不走缓存
 * @returns {Promise<Array>} 成员列表
 */
export async function getAllMembersForAdmin() {
  const supabase = assertSupabase()

  // 专用轻量 RPC：服务端关联名字，一次返回全部
  const { data, error } = await supabase.rpc('horizn_get_members_admin')
  if (error) {
    console.error('[horiznSupabase] getAllMembersForAdmin failed:', error)
    throw error
  }
  return data || []
}

/**
 * 设置成员舷号
 * @param {string} playerId - 玩家 ID
 * @param {string|null} hullNumber - 舷号（null 清除）
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function setHullNumber(playerId, hullNumber) {
  const supabase = assertSupabase()
  const { data, error } = await supabase.rpc('horizn_set_hull_number', {
    p_player_id: playerId,
    p_hull_number: hullNumber
  })
  if (error) {
    console.error('[horiznSupabase] setHullNumber failed:', error)
    return { success: false, error: error.message }
  }
  // RPC 返回 jsonb { success, error, ... }
  if (data && !data.success) {
    return { success: false, error: data.error || '未知错误' }
  }
  return { success: true }
}

/**
 * 设置成员黑名单状态
 * @param {string} playerId - 玩家 ID
 * @param {boolean} isBlacklisted - 是否加入黑名单
 * @param {string} [note] - 备注
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function setHullDate(playerId, hullDate) {
  const supabase = assertSupabase()
  const { error } = await supabase
    .from('horizn_members')
    .update({ hull_date: hullDate })
    .eq('player_id', playerId)
  if (error) {
    console.error('[horiznSupabase] setHullDate failed:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function setMemberBlacklist(playerId, isBlacklisted, note) {
  const supabase = assertSupabase()
  const { data, error } = await supabase.rpc('horizn_set_member_blacklist', {
    p_player_id: playerId,
    p_is_blacklisted: isBlacklisted,
    p_note: note || null
  })
  if (error) {
    console.error('[horiznSupabase] setMemberBlacklist failed:', error)
    return { success: false, error: error.message }
  }
  if (data && !data.success) {
    return { success: false, error: data.error || '未知错误' }
  }
  return { success: true }
}

export async function setMemberBlacklistDate(playerId, date) {
  const supabase = assertSupabase()
  const { error } = await supabase
    .from('horizn_members')
    .update({ blacklist_date: date || null })
    .eq('player_id', playerId)
  if (error) {
    console.error('[horiznSupabase] setMemberBlacklistDate failed:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * 更迭舷号（旧持有人标记为[旧]，新持有人获得舷号）
 * @param {string} oldPlayerId - 旧持有人 player_id
 * @param {string} newPlayerId - 新持有人 player_id
 * @param {string} hullNumber - 舷号（如 No.001）
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function transferHullNumber(oldPlayerId, newPlayerId, hullNumber) {
  const supabase = assertSupabase()
  const { data, error } = await supabase.rpc('horizn_transfer_hull_number', {
    p_old_player_id: oldPlayerId,
    p_new_player_id: newPlayerId,
    p_hull_number: hullNumber
  })
  if (error) {
    console.error('[horiznSupabase] transferHullNumber failed:', error)
    return { success: false, error: error.message }
  }
  if (data && !data.success) {
    return { success: false, error: data.error || '未知错误' }
  }
  return { success: true }
}

/**
 * 订阅 horizn_members 表变更（Realtime）
 * @param {Function} callback - 回调函数，参数 { new: row, old: row }
 * @returns {Function} 取消订阅函数
 */
export function subscribeToMemberChanges(callback) {
  const supabase = assertSupabase()
  const channel = supabase
    .channel('member-admin-changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'horizn_members'
    }, (payload) => {
      callback({ new: payload.new, old: payload.old })
    })
    .subscribe()

  return () => { channel.unsubscribe() }
}

// ===================================================
// 外部黑名单（horizn_blacklist_else）
// ===================================================

/** 获取全部外部黑名单记录 */
export async function getBlacklistElse() {
  const supabase = assertSupabase()
  const { data, error } = await supabase
    .from('horizn_blacklist_else')
    .select('*')
    .order('blacklist_date', { ascending: false })
  if (error) {
    console.error('[horiznSupabase] getBlacklistElse failed:', error)
    throw error
  }
  return data || []
}

/** 新增外部黑名单记录 */
export async function addBlacklistElse({ name, player_id, qq_number, note }) {
  const supabase = assertSupabase()
  const { data, error } = await supabase
    .from('horizn_blacklist_else')
    .insert({ name, player_id: player_id || null, qq_number: qq_number || null, note: note || null })
    .select()
    .single()
  if (error) {
    console.error('[horiznSupabase] addBlacklistElse failed:', error)
    return { success: false, error: error.message }
  }
  return { success: true, data }
}

/** 更新外部黑名单记录 */
export async function updateBlacklistElse(id, { name, player_id, qq_number, note, blacklist_date }) {
  const supabase = assertSupabase()
  const payload = { name, player_id: player_id || null, qq_number: qq_number || null, note: note || null }
  if (blacklist_date !== undefined) payload.blacklist_date = blacklist_date || null
  const { error } = await supabase
    .from('horizn_blacklist_else')
    .update(payload)
    .eq('id', id)
  if (error) {
    console.error('[horiznSupabase] updateBlacklistElse failed:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

/** 删除外部黑名单记录 */
export async function deleteBlacklistElse(id) {
  const supabase = assertSupabase()
  const { error } = await supabase
    .from('horizn_blacklist_else')
    .delete()
    .eq('id', id)
  if (error) {
    console.error('[horiznSupabase] deleteBlacklistElse failed:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * 手动绑定 QQ（黑名单场景：只填 QQ 号 + 退群时间）
 * @param {string} playerId
 * @param {number} qqId
 * @param {string|null} leftAt - 退群时间 ISO 日期
 */
export async function manualBindQQ(playerId, qqId, leftAt) {
  const supabase = assertSupabase()

  // 1. 获取 member_id
  const { data: memberData, error: memberErr } = await supabase
    .from('horizn_members')
    .select('id')
    .eq('player_id', playerId)
    .single()

  if (memberErr || !memberData) {
    return { success: false, error: '成员不存在' }
  }

  // 2. upsert qq_accounts
  const { error } = await supabase
    .from('horizn_qq_accounts')
    .upsert({
      qq_id: qqId,
      member_id: memberData.id,
      left_at: leftAt || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'qq_id' })

  if (error) {
    console.error('[horiznSupabase] manualBindQQ failed:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * 更新 QQ 账号退群时间
 * @param {number} qqId
 * @param {string|null} leftAt
 */
export async function updateQQLeftAt(qqId, leftAt) {
  const supabase = assertSupabase()
  const { error } = await supabase
    .from('horizn_qq_accounts')
    .update({ left_at: leftAt || null, updated_at: new Date().toISOString() })
    .eq('qq_id', qqId)

  if (error) {
    console.error('[horiznSupabase] updateQQLeftAt failed:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function sendGroupMessage(message) {
  try {
    const resp = await fetch('/api/napcat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    })

    const data = await resp.json()
    return data
  } catch (err) {
    console.error('[sendGroupMessage] Error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : '发送失败'
    }
  }
}
