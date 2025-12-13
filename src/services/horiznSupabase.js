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
