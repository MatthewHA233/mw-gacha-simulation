/**
 * 活动起止时间显示
 *
 * index.json / 活动配置 metadata 从 2026 年 10 月起带 startDate / endDate（游戏奖池给的 UTC 时间）。
 * endDate 为 null 表示游戏没给真实截止（旗舰宝箱），显示「~ 月底」；没有 startDate 的旧活动返回空串，调用方照旧显示年月。
 */

const WINDOW_TIME = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
})

const timeParts = (value) => {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  return Object.fromEntries(WINDOW_TIME.formatToParts(date).map((part) => [part.type, part.value]))
}

// 北京时间「2026年10月8日 15:00」；sameYearAs 给了且同一年时省掉年份（结束时间用）
const formatTime = (value, sameYearAs) => {
  const parts = timeParts(value)
  if (!parts) return '?'
  const year = sameYearAs && timeParts(sameYearAs)?.year === parts.year ? '' : `${parts.year}年`
  return `${year}${parts.month}月${parts.day}日 ${parts.hour}:${parts.minute}`
}

// 拆成日期与时间两段（侧边栏把时间用小一号的字显示，窄屏上放得下）
const splitTime = (value, sameYearAs) => {
  const parts = timeParts(value)
  if (!parts) return { date: '?', time: '' }
  const year = sameYearAs && timeParts(sameYearAs)?.year === parts.year ? '' : `${parts.year}年`
  return { date: `${year}${parts.month}月${parts.day}日`, time: `${parts.hour}:${parts.minute}` }
}

/**
 * 活动时间段的分段：{ start: {date, time}, end: {date, time} | null }；end 为 null 表示「月底」。没有起止时间返回 null。
 */
export const activityWindowParts = (activity) => {
  const start = activity?.startDate
  if (!start) return null
  const end = activity?.endDate
  return { start: splitTime(start), end: end ? splitTime(end, start) : null }
}

/**
 * 活动时间段文本，例如「2026年10月8日 15:00 ~ 10月27日 14:59」「2026年10月15日 15:00 ~ 月底」
 */
export const formatActivityWindow = (activity) => {
  const start = activity?.startDate
  if (!start) return ''
  const end = activity?.endDate
  return `${formatTime(start)} ~ ${end ? formatTime(end, start) : '月底'}`
}
