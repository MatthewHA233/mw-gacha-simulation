import { useState, useEffect, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import { getMonthlyCheckData, getMonthlyRules, saveMonthlyRules, getQQMembers, sendGroupMessage } from '@/services/horiznSupabase'

// 默认规则配置（与 electron 版本格式一致）
const DEFAULT_RULES = {
  achievementLines: [
    {
      id: 'line_1',
      name: '达标线1',
      weekNumbers: [1, 2, 3, 4],
      condition: { weekly: 2500, daily: 500 },
      enabled: true
    }
  ],
  bufferEnable: false,  // 网页版不使用
  buffer: { weekly_min: 1500, weekly_max: 2500, review_daily_threshold: 500 },
  newcomerEnable: false,  // 网页版不使用
  newcomer: { start_day: 21, daily_threshold: 600 },
  cutoff: { weekly_hour: 12, daily_hour: 0 },
  exclude_members: []
}

/**
 * 追踪考核名单弹窗组件（简化版 - 活跃度达标核查）
 */
export default function CheckListModal({
  show,
  onClose,
  isMobile,
  yearMonth
}) {
  // 月份状态
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)

  // 数据状态
  const [loading, setLoading] = useState(false)
  const [checkData, setCheckData] = useState([])
  const [rulesConfig, setRulesConfig] = useState(DEFAULT_RULES)
  const [rawRulesConfig, setRawRulesConfig] = useState(null) // 保留原始完整配置
  const [hasIgnoredRules, setHasIgnoredRules] = useState(false) // 是否有被忽略的规则

  // UI 状态
  const [checkTab, setCheckTab] = useState(null) // null=未初始化, 0=进行中, 1-4=周
  const [showRulesModal, setShowRulesModal] = useState(false)
  const [rulesSaving, setRulesSaving] = useState(false)
  const [excludeSearch, setExcludeSearch] = useState('')

  // 催促消息状态
  const [showUrgeModal, setShowUrgeModal] = useState(false)
  const [urgeMessage, setUrgeMessage] = useState(null)
  const [urgeLoading, setUrgeLoading] = useState(false)
  const [urgeSending, setUrgeSending] = useState(false)

  // 复制选项
  const [copyOnlyFail, setCopyOnlyFail] = useState(true) // 只复制不达标

  // 从 yearMonth 初始化月份
  useEffect(() => {
    if (yearMonth && /^\d{6}$/.test(yearMonth)) {
      const y = parseInt(yearMonth.substring(0, 4))
      const m = parseInt(yearMonth.substring(4, 6))
      setSelectedYear(y)
      setSelectedMonth(m)
    }
  }, [yearMonth])

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 加载规则配置
      const rules = await getMonthlyRules(selectedYear, selectedMonth)
      if (rules) {
        // 保留原始完整配置
        setRawRulesConfig(rules)

        // 规则迁移：将旧格式转换为新格式（与 electron 版本一致）
        let migratedRules
        if (rules.achievementLines && Array.isArray(rules.achievementLines)) {
          // 新格式：已有 achievementLines
          migratedRules = rules
        } else {
          // 旧格式迁移
          const legacyWeekly = rules.weeklyThreshold ?? 2500
          const legacyDaily = rules.dailyThreshold ?? 500
          migratedRules = {
            achievementLines: [
              {
                id: 'line_1',
                name: '达标线1',
                weekNumbers: [1, 2, 3, 4],
                condition: { weekly: legacyWeekly, daily: legacyDaily },
                enabled: true
              }
            ],
            bufferEnable: rules.bufferEnable ?? false,
            buffer: rules.buffer ?? { weekly_min: 1500, weekly_max: 2500, review_daily_threshold: 500 },
            newcomerEnable: rules.newcomerEnable ?? false,
            newcomer: rules.newcomer ?? { start_day: 21, daily_threshold: 600 },
            cutoff: rules.cutoff ?? { weekly_hour: rules.cutoffHour ?? 12, daily_hour: 0 },
            exclude_members: rules.exclude_members ?? rules.excludeMembers ?? []
          }
        }

        setRulesConfig(migratedRules)

        // 检测是否有被忽略的规则（缓冲区、缓冲复核、月底新人）
        const ignoredFields = []
        if (migratedRules.bufferEnable) ignoredFields.push('缓冲区')
        if (migratedRules.newcomerEnable) ignoredFields.push('月底新人')
        setHasIgnoredRules(ignoredFields.length > 0)
      } else {
        setRawRulesConfig(null)
        setRulesConfig(DEFAULT_RULES)
        setHasIgnoredRules(false)
      }

      // 加载考核数据
      const cutoffHour = rules?.cutoff?.weekly_hour ?? rules?.cutoffHour ?? 12
      const data = await getMonthlyCheckData(selectedYear, selectedMonth, cutoffHour)
      setCheckData(data)
    } catch (err) {
      console.error('加载考核数据失败:', err)
      toast.error('加载考核数据失败')
    } finally {
      setLoading(false)
    }
  }, [selectedYear, selectedMonth])

  // 弹窗打开时加载数据
  useEffect(() => {
    if (show) {
      setCheckTab(null) // 重置标签
      loadData()
    }
  }, [show, loadData])

  // 从数据中提取周信息
  const weeklyFrames = useMemo(() => {
    const frameMap = new Map()
    for (const record of checkData) {
      if (!frameMap.has(record.week_number)) {
        frameMap.set(record.week_number, {
          session_time: record.session_time,
          frame_label: record.frame_label
        })
      }
    }
    return [...frameMap.entries()]
      .map(([week_number, info]) => ({ week_number, ...info }))
      .sort((a, b) => a.week_number - b.week_number)
  }, [checkData])

  // 计算周标签（支持周合并）
  const weekTabs = useMemo(() => {
    const now = new Date()
    const isCurrentMonth = now.getFullYear() === selectedYear && now.getMonth() + 1 === selectedMonth
    const weeksWithData = new Set(weeklyFrames.map(f => f.week_number))
    const hasInProgress = weeksWithData.has(0) && isCurrentMonth

    // 确定哪些周有达标线配置
    const weeksWithLines = new Set()
    for (const line of rulesConfig.achievementLines || []) {
      if (line.enabled !== false) {
        for (const weekNum of line.weekNumbers || []) {
          if (weekNum >= 1 && weekNum <= 4) {
            weeksWithLines.add(weekNum)
          }
        }
      }
    }

    const tabs = []
    let i = 1
    while (i <= 4) {
      if (!weeksWithData.has(i)) {
        i++
        continue
      }

      if (weeksWithLines.has(i)) {
        // 当前周有达标线，不需要合并
        const frame = weeklyFrames.find(f => f.week_number === i)
        tabs.push({
          week: i,
          mergeStart: i,
          label: `第${i}周`,
          frameTime: frame?.session_time || null,
          frameLabel: frame?.frame_label || ''
        })
        i++
      } else {
        // 当前周无达标线，寻找后续有达标线的周进行合并
        const mergeStart = i
        let mergeEnd = i

        // 向后查找第一个有达标线的周
        while (mergeEnd <= 4) {
          if (weeksWithLines.has(mergeEnd)) {
            break
          }
          mergeEnd++
        }

        // 如果找到有达标线的周，合并到该周
        if (mergeEnd <= 4 && weeksWithData.has(mergeEnd) && weeksWithLines.has(mergeEnd)) {
          const frame = weeklyFrames.find(f => f.week_number === mergeEnd)
          const label = mergeStart === mergeEnd ? `第${mergeEnd}周` : `第${mergeStart}-${mergeEnd}周`
          tabs.push({
            week: mergeEnd,
            mergeStart,
            label,
            frameTime: frame?.session_time || null,
            frameLabel: frame?.frame_label || ''
          })
          i = mergeEnd + 1
        } else {
          // 没找到有达标线的周，跳过这些周
          i = mergeEnd + 1
        }
      }
    }

    if (hasInProgress) {
      const inProgressFrame = weeklyFrames.find(f => f.week_number === 0)
      const currentWeek = Math.ceil(now.getDate() / 7)
      tabs.push({
        week: 0,
        mergeStart: 0,
        label: `第${currentWeek}周(进行中)`,
        frameTime: inProgressFrame?.session_time || null,
        frameLabel: inProgressFrame?.frame_label || ''
      })
    }

    return tabs
  }, [weeklyFrames, selectedYear, selectedMonth, rulesConfig.achievementLines])

  // 自动选中标签
  useEffect(() => {
    if (weekTabs.length === 0 || checkTab !== null) return
    const inProgressTab = weekTabs.find(t => t.week === 0)
    if (inProgressTab) {
      setCheckTab(0)
    } else if (weekTabs.length > 0) {
      setCheckTab(weekTabs[0].week)
    }
  }, [weekTabs, checkTab])

  // 当前周数据
  const currentWeekData = useMemo(() => {
    return checkData.filter(r => r.week_number === checkTab)
  }, [checkData, checkTab])

  // 当前周时间标签
  const currentFrameLabel = useMemo(() => {
    const frame = weekTabs.find(t => t.week === checkTab)
    return frame?.frameLabel || ''
  }, [weekTabs, checkTab])

  // 计算分类名单
  const categorizedList = useMemo(() => {
    if (currentWeekData.length === 0) {
      return { fail: [], pass: [] }
    }

    const frame = weekTabs.find(f => f.week === checkTab)
    const checkDate = frame?.frameTime ? new Date(frame.frameTime) : new Date()
    const monthStart = new Date(selectedYear, selectedMonth - 1, 1)
    const excludeSet = new Set((rulesConfig.exclude_members || []).map(id => id.toLowerCase()))

    // 筛选适用当前周的达标线（enabled !== false 且 weekNumbers 包含当前周）
    // 进行中的周（checkTab=0）使用当前是第几周来匹配
    const currentWeekNumber = checkTab === 0 ? Math.ceil(new Date().getDate() / 7) : checkTab
    const applicableLines = (rulesConfig.achievementLines || []).filter(
      line => (line.enabled !== false) && (line.weekNumbers || [1, 2, 3, 4]).includes(currentWeekNumber)
    )

    // 进行中的周：计算到本周周日的预测天数
    const isInProgress = checkTab === 0
    let predictedSundayDate = checkDate
    if (isInProgress) {
      const now = new Date()
      const dayOfWeek = now.getDay()
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
      predictedSundayDate = new Date(now)
      predictedSundayDate.setDate(now.getDate() + daysUntilSunday)
      predictedSundayDate.setHours(12, 0, 0, 0)
    }

    const fail = []
    const pass = []

    for (const p of currentWeekData) {
      if (excludeSet.has(p.player_id.toLowerCase())) continue

      let joinDate = p.join_date ? new Date(p.join_date) : monthStart
      if (joinDate < monthStart) joinDate = monthStart

      const targetDate = isInProgress ? predictedSundayDate : checkDate
      const daysInTeam = Math.max(1, Math.ceil((targetDate.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24)))
      const dailyAvg = Math.round(p.season_activity / daysInTeam)

      // 检查是否满足任一达标线
      let passedLine = null
      let passedBy = ''

      for (const line of applicableLines) {
        const { weekly, daily, season } = line.condition || {}
        const checks = []

        // 只检查非空的条件
        if (weekly !== undefined) checks.push(p.weekly_activity >= weekly)
        if (daily !== undefined) checks.push(dailyAvg >= daily)
        if (season !== undefined) checks.push(p.season_activity >= season)

        // 如果没有条件定义，跳过此达标线
        if (checks.length === 0) continue

        // 或逻辑：至少一个条件为真
        if (checks.some(c => c)) {
          passedLine = line
          // 记录通过的条件
          const passedConditions = []
          if (weekly !== undefined && p.weekly_activity >= weekly) passedConditions.push('周')
          if (daily !== undefined && dailyAvg >= daily) passedConditions.push('日均')
          if (season !== undefined && p.season_activity >= season) passedConditions.push('赛季')
          passedBy = passedConditions.join('/')
          break
        }
      }

      const item = {
        ...p,
        daysInTeam,
        dailyAvg,
        joinDay: joinDate.getDate()
      }

      if (passedLine) {
        pass.push({ ...item, passBy: passedBy || 'unknown', joinMonth: joinDate.getMonth() + 1 })
      } else {
        // 计算距离第一条适用达标线的差距
        const referenceLine = applicableLines.length > 0 ? applicableLines[0] : null
        const weeklyGap = referenceLine?.condition?.weekly !== undefined ? referenceLine.condition.weekly - p.weekly_activity : null
        // 日均差值 = (日均要求 × 天数) - 赛季活跃度
        const dailyGap = referenceLine?.condition?.daily !== undefined
          ? Math.round((referenceLine.condition.daily * daysInTeam) - p.season_activity)
          : null
        const seasonGap = referenceLine?.condition?.season !== undefined ? referenceLine.condition.season - p.season_activity : null

        // 计算最小差距（只看有规则的项）
        const gaps = [weeklyGap, dailyGap, seasonGap].filter(g => g !== null)
        const minGap = gaps.length > 0 ? Math.min(...gaps) : 0

        fail.push({
          ...item,
          weeklyGap,
          dailyGap,
          seasonGap,
          minGap,
          joinMonth: joinDate.getMonth() + 1
        })
      }
    }

    // 验证是否有成员遗漏
    const totalCategorized = fail.length + pass.length
    const expectedTotal = currentWeekData.filter(p => !excludeSet.has(p.player_id.toLowerCase())).length
    if (totalCategorized !== expectedTotal) {
      console.warn(
        `[CheckListModal] 成员数量不匹配！期望 ${expectedTotal} 人，实际分类 ${totalCategorized} 人`,
        `(原始数据 ${currentWeekData.length} 人 - 排除 ${excludeSet.size} 人)`
      )
    }

    return {
      fail: fail.sort((a, b) => a.weekly_activity - b.weekly_activity),
      pass: pass.sort((a, b) => b.weekly_activity - a.weekly_activity)
    }
  }, [currentWeekData, weekTabs, rulesConfig, selectedYear, selectedMonth, checkTab])

  // 月份切换
  const handlePrevMonth = () => {
    setCheckTab(null)
    if (selectedMonth === 1) {
      setSelectedYear(y => y - 1)
      setSelectedMonth(12)
    } else {
      setSelectedMonth(m => m - 1)
    }
  }

  const handleNextMonth = () => {
    setCheckTab(null)
    if (selectedMonth === 12) {
      setSelectedYear(y => y + 1)
      setSelectedMonth(1)
    } else {
      setSelectedMonth(m => m + 1)
    }
  }

  // 复制 Player ID
  const handleCopyPlayerId = (playerId) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(playerId)
        .then(() => toast.success('已复制 ID', { duration: 1500 }))
        .catch(() => toast.error('复制失败'))
    }
  }

  // 复制名单
  const handleCopyList = () => {
    const { fail, pass } = categorizedList
    if (fail.length === 0 && pass.length === 0) {
      toast.error('没有成员数据')
      return
    }

    // 筛选适用当前周的达标线
    const currentWeekNumber = checkTab === 0 ? Math.ceil(new Date().getDate() / 7) : checkTab
    const applicableLines = (rulesConfig.achievementLines || []).filter(
      line => (line.enabled !== false) && (line.weekNumbers || [1, 2, 3, 4]).includes(currentWeekNumber)
    )

    // 生成规则说明
    let standardText = '(无适用规则)'
    if (applicableLines.length > 0) {
      standardText = applicableLines.map((line, i) => {
        const conditions = []
        if (line.condition?.weekly !== undefined) conditions.push(`周≥${line.condition.weekly}`)
        if (line.condition?.daily !== undefined) conditions.push(`日均≥${line.condition.daily}`)
        if (line.condition?.season !== undefined) conditions.push(`赛季≥${line.condition.season}`)
        const condStr = conditions.length > 0 ? conditions.join(' 或 ') : '无条件'
        return applicableLines.length > 1 ? `${line.name || `线${i + 1}`}: ${condStr}` : condStr
      }).join('；')
    }

    let text = `HORIZN地平线 ${selectedMonth}月第${checkTab === 0 ? Math.ceil(new Date().getDate() / 7) : checkTab}周活跃度考核\n`
    text += `考核标准：${standardText}\n`
    text += `时间：${currentFrameLabel}\n\n`

    // 不达标名单
    if (fail.length > 0) {
      text += `【不达标】共${fail.length}人\n`
      fail.forEach((p, i) => {
        let line = `${i + 1}. ${p.member_name} (${p.player_id})`
        if (p.joinDay > 1) line += ` ${p.joinMonth}.${p.joinDay}入`
        line += ` 周${p.weekly_activity} 赛季${p.season_activity} 日均${p.season_activity}/${p.daysInTeam}=${p.dailyAvg}`
        // 根据有规则的项显示差值
        const gaps = []
        if (p.weeklyGap !== null) gaps.push(p.weeklyGap)
        if (p.seasonGap !== null) gaps.push(p.seasonGap)
        if (p.dailyGap !== null) gaps.push(p.dailyGap)
        if (gaps.length > 0) line += ` 差${gaps.join('/')}`
        text += line + '\n'
      })
    }

    // 达标名单（如果未勾选"只复制不达标"）
    if (!copyOnlyFail && pass.length > 0) {
      text += `\n【达标】共${pass.length}人\n`
      pass.forEach((p, i) => {
        let line = `${i + 1}. ${p.member_name} (${p.player_id})`
        if (p.joinDay > 1) line += ` ${p.joinMonth}.${p.joinDay}入`
        line += ` 周${p.weekly_activity} 赛季${p.season_activity} 日均${p.season_activity}/${p.daysInTeam}=${p.dailyAvg}`
        text += line + '\n'
      })
    }

    const totalCopied = copyOnlyFail ? fail.length : fail.length + pass.length
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text.trim())
        .then(() => toast.success(`已复制 ${totalCopied} 人`))
        .catch(() => toast.error('复制失败'))
    }
  }

  // 复制为表格格式（TSV）
  const handleCopyAsTable = () => {
    const { fail, pass } = categorizedList
    if (fail.length === 0 && pass.length === 0) {
      toast.error('没有成员数据')
      return
    }

    // 筛选适用当前周的达标线
    const currentWeekNumber = checkTab === 0 ? Math.ceil(new Date().getDate() / 7) : checkTab
    const applicableLines = (rulesConfig.achievementLines || []).filter(
      line => (line.enabled !== false) && (line.weekNumbers || [1, 2, 3, 4]).includes(currentWeekNumber)
    )

    // 构建 TSV 格式（Tab分隔）
    const lines = []
    // 表头
    const headers = ['排名', '成员名', 'ID', '入队日期', '周活跃', '赛季活跃', '天数', '日均', '状态']

    // 根据达标线条件决定是否显示差值列
    const hasWeeklyCond = applicableLines.some(line => line.condition?.weekly !== undefined)
    const hasDailyCond = applicableLines.some(line => line.condition?.daily !== undefined)
    const hasSeasonCond = applicableLines.some(line => line.condition?.season !== undefined)

    if (hasWeeklyCond) headers.push('周差值')
    if (hasSeasonCond) headers.push('赛季差值')
    if (hasDailyCond) headers.push('日均差值')

    lines.push(headers.join('\t'))

    // 数据行 - 不达标
    let rank = 1
    if (fail.length > 0) {
      fail.forEach((p) => {
        const joinDate = p.joinDay > 1 ? `${p.joinMonth}月${p.joinDay}日` : ''
        const row = [
          rank++,
          p.member_name,
          p.player_id,
          joinDate,
          p.weekly_activity,
          p.season_activity,
          p.daysInTeam,
          p.dailyAvg,
          '不达标'
        ]

        if (hasWeeklyCond) row.push(p.weeklyGap !== null ? p.weeklyGap : '')
        if (hasSeasonCond) row.push(p.seasonGap !== null ? p.seasonGap : '')
        if (hasDailyCond) row.push(p.dailyGap !== null ? p.dailyGap : '')

        lines.push(row.join('\t'))
      })
    }

    // 数据行 - 达标（如果未勾选"只复制不达标"）
    if (!copyOnlyFail && pass.length > 0) {
      pass.forEach((p) => {
        const joinDate = p.joinDay > 1 ? `${p.joinMonth}月${p.joinDay}日` : ''
        const row = [
          rank++,
          p.member_name,
          p.player_id,
          joinDate,
          p.weekly_activity,
          p.season_activity,
          p.daysInTeam,
          p.dailyAvg,
          '达标'
        ]

        // 达标名单没有差值
        if (hasWeeklyCond) row.push('')
        if (hasSeasonCond) row.push('')
        if (hasDailyCond) row.push('')

        lines.push(row.join('\t'))
      })
    }

    const tsvContent = lines.join('\n')
    const totalCopied = copyOnlyFail ? fail.length : fail.length + pass.length

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsvContent)
        .then(() => toast.success(`已复制 ${totalCopied} 人（表格格式）`, { duration: 2000 }))
        .catch(() => toast.error('复制失败'))
    }
  }

  // 生成催促消息（仅进行中标签页可用）
  const handleGenerateUrgeMessage = async () => {
    if (checkTab !== 0 || categorizedList.fail.length === 0) return

    setUrgeLoading(true)
    try {
      // 获取 QQ 成员列表
      const qqMembers = await getQQMembers()

      // 找出最新的更新时间（判断退群的基准）
      const latestUpdateTime = qqMembers.reduce((latest, qq) => {
        const updatedAt = new Date(qq.updated_at || 0).getTime()
        return Math.max(latest, updatedAt)
      }, 0)

      // 时间差阈值：1分钟（退群成员的 updated_at 会落后）
      const THRESHOLD_MS = 60 * 1000

      // 构建 player_id -> QQ 信息的映射
      const playerToQQ = new Map()
      qqMembers.forEach(qq => {
        if (qq.member?.player_id) {
          const qqName = qq.card || qq.nickname || ''
          const updatedAt = new Date(qq.updated_at || 0).getTime()
          const hasLeft = (latestUpdateTime - updatedAt) > THRESHOLD_MS

          playerToQQ.set(qq.member.player_id, {
            qqName,
            qqId: qq.qq_id,
            inGroup: qqName.length > 0 && !hasLeft,
            hasLeft
          })
        }
      })

      // 分类不达标成员
      const inGroup = []
      const leftGroup = []
      const notInGroup = []

      categorizedList.fail.forEach(p => {
        // 计算差值信息：找出最小的差值
        const gaps = [
          p.weeklyGap !== null ? { type: '周', value: p.weeklyGap, activity: p.weekly_activity } : null,
          p.seasonGap !== null ? { type: '赛季', value: p.seasonGap, activity: p.season_activity } : null,
          p.dailyGap !== null ? { type: '日均', value: p.dailyGap, activity: p.dailyAvg } : null
        ].filter(Boolean)

        const minGap = gaps.length > 0 ? gaps.reduce((min, g) => g.value < min.value ? g : min) : null
        const info = minGap ? `${minGap.type}${minGap.activity} 还差${minGap.value}` : `周${p.weekly_activity}`

        const qqInfo = playerToQQ.get(p.player_id)
        if (qqInfo) {
          if (qqInfo.hasLeft) {
            // 已退群成员
            leftGroup.push({
              name: p.member_name,
              qqName: qqInfo.qqName,
              info
            })
          } else if (qqInfo.inGroup) {
            // 在群成员
            inGroup.push({
              name: p.member_name,
              qqName: qqInfo.qqName,
              qqId: qqInfo.qqId,
              info
            })
          } else {
            // 未绑定
            notInGroup.push({
              name: p.member_name,
              info
            })
          }
        } else {
          // 未绑定
          notInGroup.push({
            name: p.member_name,
            info
          })
        }
      })

      setUrgeMessage({ inGroup, leftGroup, notInGroup })
      setShowUrgeModal(true)
    } catch (err) {
      console.error('生成催促消息失败:', err)
      toast.error('生成催促消息失败')
    } finally {
      setUrgeLoading(false)
    }
  }

  // 发送催促消息到群
  const handleSendUrgeMessage = async () => {
    if (!urgeMessage || urgeMessage.inGroup.length === 0) return

    setUrgeSending(true)
    try {
      // 构建 CQ 码格式的消息
      const lines = ['以下成员请确保在周日中午12点前活跃度达标：', '']

      urgeMessage.inGroup.forEach(m => {
        lines.push(`[CQ:at,qq=${m.qqId}] ${m.info}`)
      })

      const message = lines.join('\n')

      const result = await sendGroupMessage(message)
      if (result.success) {
        toast.success('消息发送成功！')
        setShowUrgeModal(false)
      } else {
        toast.error(`发送失败：${result.error}`)
      }
    } catch (err) {
      console.error('发送失败:', err)
      toast.error('发送失败')
    } finally {
      setUrgeSending(false)
    }
  }

  // 保存规则
  const handleSaveRules = async () => {
    setRulesSaving(true)

    // 直接保存完整的 rulesConfig（已经是 electron 兼容格式）
    const success = await saveMonthlyRules(selectedYear, selectedMonth, rulesConfig)
    setRulesSaving(false)
    if (success) {
      toast.success('规则已保存')
      setShowRulesModal(false)
      loadData() // 重新加载数据
    } else {
      toast.error('保存失败')
    }
  }

  // 添加排除成员
  const addExcludeMember = (playerId) => {
    if ((rulesConfig.exclude_members || []).includes(playerId)) return
    setRulesConfig(prev => ({
      ...prev,
      exclude_members: [...(prev.exclude_members || []), playerId]
    }))
    setExcludeSearch('')
  }

  // 移除排除成员
  const removeExcludeMember = (playerId) => {
    setRulesConfig(prev => ({
      ...prev,
      exclude_members: (prev.exclude_members || []).filter(id => id !== playerId)
    }))
  }

  // 搜索排除成员
  const excludeSearchResults = useMemo(() => {
    if (!excludeSearch.trim() || excludeSearch.length < 2) return []
    const query = excludeSearch.toLowerCase()
    const excludeSet = new Set(rulesConfig.exclude_members || [])
    return currentWeekData
      .filter(p => {
        if (excludeSet.has(p.player_id)) return false
        if (p.player_id.toLowerCase().includes(query)) return true
        if (p.member_name.toLowerCase().includes(query)) return true
        return false
      })
      .slice(0, 8)
  }, [excludeSearch, currentWeekData, rulesConfig.exclude_members])

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className={`bg-gray-800/95 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] ${isMobile ? 'select-none' : ''}`}>
        {/* 顶部装饰条 */}
        <div className="h-0.5 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 flex-shrink-0"></div>

        {/* 标题栏 */}
        <div className="px-3 py-2 border-b border-gray-700/50 flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            活跃度达标核查
          </h3>

          {/* 月份选择器（居中） */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm text-white font-medium min-w-[80px] text-center">
              {selectedYear}年{selectedMonth}月
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-all disabled:opacity-50"
              title="刷新数据"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={() => setShowRulesModal(true)}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-all"
              title="规则设置"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-700/50 rounded p-0.5 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 周标签 */}
        {weekTabs.length > 0 && (
          <div className="flex border-b border-gray-700/50 flex-shrink-0">
            {weekTabs.map(tab => (
              <button
                key={tab.week}
                onClick={() => setCheckTab(tab.week)}
                className={`flex-1 py-1.5 text-[11px] font-medium transition-all border-b-2 ${
                  checkTab === tab.week
                    ? 'text-yellow-400 border-yellow-400 bg-yellow-400/10'
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* 内容区 - 可滚动 */}
        <div className="flex-1 overflow-auto px-3 py-2 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : weekTabs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-xs">暂无考核数据</div>
          ) : (
            <>
              {/* 考核信息（时间点 + 达标条件并排显示） */}
              <div className="bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 border border-blue-500/30 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                  {/* 考核时间点 / 当前时间戳 */}
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-300 font-medium">
                      {checkTab === 0 ? '当前时间戳' : '考核时间点'}：
                      <span className="text-white">{currentFrameLabel || '-'}</span>
                      {(() => {
                        // 如果是进行中标签页，检查是否有当前周的已结算标签页
                        if (checkTab === 0) {
                          const currentWeekNumber = Math.ceil(new Date().getDate() / 7)
                          const settledWeekTab = weekTabs.find(t => t.week !== 0 && t.week === currentWeekNumber)

                          if (settledWeekTab) {
                            return (
                              <button
                                onClick={() => setCheckTab(currentWeekNumber)}
                                className="ml-2 text-yellow-400 hover:text-yellow-300 underline cursor-pointer transition-colors"
                              >
                                (已有本周考核时间点，点击跳转)
                              </button>
                            )
                          }
                        }
                        return null
                      })()}
                    </span>
                  </div>

                  {/* 达标条件 */}
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-300 font-medium">
                      达标条件：
                      <span className="text-yellow-300">
                        {(() => {
                          const currentWeekNumber = checkTab === 0 ? Math.ceil(new Date().getDate() / 7) : checkTab
                          const applicableLines = (rulesConfig.achievementLines || []).filter(
                            line => (line.enabled !== false) && (line.weekNumbers || [1, 2, 3, 4]).includes(currentWeekNumber)
                          )
                          if (applicableLines.length === 0) return '(无适用达标线)'
                          if (applicableLines.length === 1) {
                            const line = applicableLines[0]
                            const conds = []
                            if (line.condition?.weekly !== undefined) conds.push(`周≥${line.condition.weekly}`)
                            if (line.condition?.daily !== undefined) conds.push(`日均≥${line.condition.daily}`)
                            if (line.condition?.season !== undefined) conds.push(`赛季≥${line.condition.season}`)
                            return conds.join(' 或 ') || '无条件'
                          }
                          return applicableLines.map(line => {
                            const conds = []
                            if (line.condition?.weekly !== undefined) conds.push(`周≥${line.condition.weekly}`)
                            if (line.condition?.daily !== undefined) conds.push(`日均≥${line.condition.daily}`)
                            if (line.condition?.season !== undefined) conds.push(`赛季≥${line.condition.season}`)
                            return `${line.name || '线'}(${conds.join('/') || '无'})`
                          }).join('、')
                        })()}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 忽略规则提示 */}
              {hasIgnoredRules && (
                <div className="text-[10px] text-amber-500/80 bg-amber-900/20 border border-amber-700/30 rounded px-2 py-1 text-center">
                  ⚠️ 已忽略缓冲区相关规则
                </div>
              )}

              {/* 统计 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-4 text-[11px]">
                  <div className="relative">
                    <div className="px-2 rounded border-2 border-blue-400/50 bg-blue-600/10">
                      <span className="text-gray-500">总共</span>
                      <span className="text-blue-400 font-medium ml-1">{currentWeekData.length}人</span>
                      {(() => {
                        const excludeSet = new Set((rulesConfig.exclude_members || []).map(id => id.toLowerCase()))
                        const excludedCount = currentWeekData.filter(p => excludeSet.has(p.player_id.toLowerCase())).length
                        return excludedCount > 0 ? (
                          <span className="text-gray-500 ml-1">
                            - <span className="text-yellow-500">{excludedCount}</span>人(白名单)
                          </span>
                        ) : null
                      })()}
                    </div>
                    {checkTab !== 0 && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-0.5 text-[9px] text-blue-400 whitespace-nowrap">
                        可能会漏数量，请核对无误，有误差则等待一俩小时
                      </div>
                    )}
                  </div>
                  <span>
                    <span className="text-gray-500">不达标</span>
                    <span className="text-red-400 font-medium ml-1">{categorizedList.fail.length}人</span>
                  </span>
                  <span>
                    <span className="text-gray-500">达标</span>
                    <span className="text-green-400 font-medium ml-1">{categorizedList.pass.length}人</span>
                  </span>
                </div>
              </div>

              {/* 不达标名单 */}
              <div className="bg-gray-900/50 rounded border border-gray-700/50 overflow-hidden">
                <div className="px-2 py-1 bg-red-600/10 border-b border-gray-700/50 flex items-center justify-between">
                  <span className="text-[10px] text-red-400 font-medium">不达标名单</span>
                  <span className="text-[10px] text-gray-500">{categorizedList.fail.length}人</span>
                </div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar divide-y divide-gray-800/50">
                  {categorizedList.fail.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-xs">无</div>
                  ) : (
                    categorizedList.fail.map((p, i) => {
                      // 获取适用的达标线，判断各项条件
                      const currentWeekNumber = checkTab === 0 ? Math.ceil(new Date().getDate() / 7) : checkTab
                      const applicableLines = (rulesConfig.achievementLines || []).filter(
                        line => (line.enabled !== false) && (line.weekNumbers || [1, 2, 3, 4]).includes(currentWeekNumber)
                      )

                      // 判断各项是否在达标线条件中
                      const hasWeeklyCond = applicableLines.some(line => line.condition?.weekly !== undefined)
                      const hasDailyCond = applicableLines.some(line => line.condition?.daily !== undefined)
                      const hasSeasonCond = applicableLines.some(line => line.condition?.season !== undefined)

                      // 判断是否满足条件
                      const weeklyMet = hasWeeklyCond && applicableLines.some(line =>
                        line.condition?.weekly !== undefined && p.weekly_activity >= line.condition.weekly
                      )
                      const dailyMet = hasDailyCond && applicableLines.some(line =>
                        line.condition?.daily !== undefined && p.dailyAvg >= line.condition.daily
                      )
                      const seasonMet = hasSeasonCond && applicableLines.some(line =>
                        line.condition?.season !== undefined && p.season_activity >= line.condition.season
                      )

                      // 计算差值（只计算有条件且未满足的）
                      const gaps = []
                      if (hasWeeklyCond && !weeklyMet) {
                        const minRequired = Math.min(...applicableLines
                          .filter(line => line.condition?.weekly !== undefined)
                          .map(line => line.condition.weekly))
                        gaps.push({ type: 'weekly', value: minRequired - p.weekly_activity })
                      }
                      if (hasSeasonCond && !seasonMet) {
                        const minRequired = Math.min(...applicableLines
                          .filter(line => line.condition?.season !== undefined)
                          .map(line => line.condition.season))
                        gaps.push({ type: 'season', value: minRequired - p.season_activity })
                      }
                      if (hasDailyCond && !dailyMet) {
                        // 日均差值 = (日均要求 × 天数) - 赛季活跃度
                        const minRequired = Math.min(...applicableLines
                          .filter(line => line.condition?.daily !== undefined)
                          .map(line => line.condition.daily))
                        const targetSeason = minRequired * p.daysInTeam
                        gaps.push({ type: 'daily', value: Math.round(targetSeason - p.season_activity) })
                      }

                      // 找到最小差值
                      const minGapValue = gaps.length > 0 ? Math.min(...gaps.map(g => g.value)) : 0

                      return (
                        <div key={p.player_id} className="px-2 py-1 hover:bg-gray-800/30 transition-colors">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              <span className="text-[10px] text-gray-600 w-4 flex-shrink-0">{i + 1}.</span>
                              <span className="text-xs text-white truncate">{p.member_name}</span>
                              {p.joinDay > 1 && (
                                <span className="text-[9px] text-green-400/70">{p.joinMonth}.{p.joinDay}入</span>
                              )}
                              {/* 复制 ID 按钮 */}
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                <button
                                  onClick={() => handleCopyPlayerId(p.player_id)}
                                  className="p-0.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/20 rounded transition-all"
                                  title="复制 ID"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                                <span className="text-[10px] text-gray-500 font-mono">
                                  {p.player_id}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-mono flex-shrink-0">
                              <span className={hasWeeklyCond ? (weeklyMet ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}>
                                周{p.weekly_activity}
                              </span>
                              <span className={hasSeasonCond ? (seasonMet ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}>
                                赛季{p.season_activity}
                              </span>
                              <span className={hasDailyCond ? (dailyMet ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}>
                                日均{p.season_activity}/{p.daysInTeam}={p.dailyAvg}
                              </span>
                              {gaps.length > 0 && (
                                <span className="text-gray-400">
                                  差{gaps.map((g, idx) => (
                                    <span key={idx}>
                                      {idx > 0 && '/'}
                                      <span className={g.value === minGapValue ? 'text-orange-400' : ''}>
                                        {g.value}
                                      </span>
                                    </span>
                                  ))}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* 达标名单（折叠） */}
              {categorizedList.pass.length > 0 && (
                <details className="bg-gray-900/50 rounded border border-gray-700/50 overflow-hidden">
                  <summary className="px-2 py-1 bg-green-600/10 cursor-pointer hover:bg-green-600/20 transition-colors flex items-center justify-between">
                    <span className="text-[10px] text-green-400 font-medium">达标名单</span>
                    <span className="text-[10px] text-gray-500">{categorizedList.pass.length}人</span>
                  </summary>
                  <div className="max-h-32 overflow-y-auto custom-scrollbar divide-y divide-gray-800/50">
                    {categorizedList.pass.map((p, i) => {
                      // 获取适用的达标线，判断各项条件
                      const currentWeekNumber = checkTab === 0 ? Math.ceil(new Date().getDate() / 7) : checkTab
                      const applicableLines = (rulesConfig.achievementLines || []).filter(
                        line => (line.enabled !== false) && (line.weekNumbers || [1, 2, 3, 4]).includes(currentWeekNumber)
                      )

                      // 判断各项是否在达标线条件中
                      const hasWeeklyCond = applicableLines.some(line => line.condition?.weekly !== undefined)
                      const hasDailyCond = applicableLines.some(line => line.condition?.daily !== undefined)
                      const hasSeasonCond = applicableLines.some(line => line.condition?.season !== undefined)

                      // 判断是否满足条件
                      const weeklyMet = hasWeeklyCond && applicableLines.some(line =>
                        line.condition?.weekly !== undefined && p.weekly_activity >= line.condition.weekly
                      )
                      const dailyMet = hasDailyCond && applicableLines.some(line =>
                        line.condition?.daily !== undefined && p.dailyAvg >= line.condition.daily
                      )
                      const seasonMet = hasSeasonCond && applicableLines.some(line =>
                        line.condition?.season !== undefined && p.season_activity >= line.condition.season
                      )

                      return (
                        <div key={p.player_id} className="px-2 py-1 hover:bg-gray-800/30 transition-colors">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              <span className="text-[10px] text-gray-600 w-4 flex-shrink-0">{i + 1}.</span>
                              <span className="text-xs text-white truncate">{p.member_name}</span>
                              {p.joinDay > 1 && (
                                <span className="text-[9px] text-green-400/70">{p.joinMonth}.{p.joinDay}入</span>
                              )}
                              {/* 复制 ID 按钮 */}
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                <button
                                  onClick={() => handleCopyPlayerId(p.player_id)}
                                  className="p-0.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/20 rounded transition-all"
                                  title="复制 ID"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                                <span className="text-[10px] text-gray-500 font-mono">
                                  {p.player_id}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-mono flex-shrink-0">
                              <span className={hasWeeklyCond ? (weeklyMet ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}>
                                周{p.weekly_activity}
                              </span>
                              <span className={hasSeasonCond ? (seasonMet ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}>
                                赛季{p.season_activity}
                              </span>
                              <span className={hasDailyCond ? (dailyMet ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}>
                                日均{p.season_activity}/{p.daysInTeam}={p.dailyAvg}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </details>
              )}
            </>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-3 py-2 bg-gray-900/30 border-t border-gray-700/50 flex gap-2 flex-shrink-0">
          {checkTab === 0 && categorizedList.fail.length > 0 && (
            <button
              onClick={handleGenerateUrgeMessage}
              disabled={urgeLoading}
              className="px-3 py-1.5 bg-yellow-600/80 hover:bg-yellow-600 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {urgeLoading ? (
                <div className="w-3 h-3 border border-current animate-spin rounded-full" />
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              )}
              催促消息
            </button>
          )}

          {/* 只复制不达标勾选框 */}
          <label className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-700/30 hover:bg-gray-700/50 rounded transition-colors cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={copyOnlyFail}
              onChange={(e) => setCopyOnlyFail(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-yellow-500 focus:ring-yellow-500/30 focus:ring-offset-0"
            />
            <span className="text-xs text-gray-300 whitespace-nowrap">只复制不达标</span>
          </label>

          <button
            onClick={handleCopyAsTable}
            disabled={categorizedList.fail.length === 0 && categorizedList.pass.length === 0}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-white text-xs font-semibold rounded shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>复制表格</span>
          </button>
          <button
            onClick={handleCopyList}
            disabled={categorizedList.fail.length === 0 && categorizedList.pass.length === 0}
            className="px-4 py-1.5 bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-700 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-white text-xs font-semibold rounded shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            复制文本
          </button>
        </div>
      </div>

      {/* 规则设置弹窗 */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-60 p-3">
          <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-sm overflow-hidden">
            {/* 弹窗标题 */}
            <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">{selectedMonth}月考核规则</h4>
              <button
                onClick={() => setShowRulesModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 规则配置 */}
            <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* 达标线列表 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-gray-400">达标线（满足任一即达标）</label>
                  {rulesConfig.achievementLines.length < 4 && (
                    <button
                      onClick={() => setRulesConfig(prev => ({
                        ...prev,
                        achievementLines: [...prev.achievementLines, {
                          id: `line_${Date.now()}`,
                          name: `达标线${prev.achievementLines.length + 1}`,
                          weekNumbers: [1, 2, 3, 4],
                          condition: { weekly: 2000, daily: 400 },
                          enabled: true
                        }]
                      }))}
                      className="text-[10px] text-yellow-400 hover:text-yellow-300"
                    >
                      + 添加达标线
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {rulesConfig.achievementLines.map((line, index) => (
                    <div key={line.id || index} className={`bg-gray-900/50 rounded p-2 border ${line.enabled !== false ? 'border-gray-700/50' : 'border-gray-700/30 opacity-60'}`}>
                      {/* 达标线头部：名称 + 开关 + 删除 */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={line.name || `达标线${index + 1}`}
                            onChange={(e) => setRulesConfig(prev => ({
                              ...prev,
                              achievementLines: prev.achievementLines.map((l, i) =>
                                i === index ? { ...l, name: e.target.value } : l
                              )
                            }))}
                            className="w-20 h-5 px-1 bg-gray-700 text-white text-[10px] rounded border border-gray-600 focus:border-yellow-500 focus:outline-none"
                          />
                          {/* 启用开关 */}
                          <button
                            onClick={() => setRulesConfig(prev => ({
                              ...prev,
                              achievementLines: prev.achievementLines.map((l, i) =>
                                i === index ? { ...l, enabled: !(l.enabled !== false) } : l
                              )
                            }))}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${line.enabled !== false ? 'bg-green-600/30 text-green-400' : 'bg-gray-700 text-gray-500'}`}
                          >
                            {line.enabled !== false ? '启用' : '禁用'}
                          </button>
                        </div>
                        {rulesConfig.achievementLines.length > 1 && (
                          <button
                            onClick={() => setRulesConfig(prev => ({
                              ...prev,
                              achievementLines: prev.achievementLines.filter((_, i) => i !== index)
                            }))}
                            className="text-[10px] text-red-400 hover:text-red-300"
                          >
                            删除
                          </button>
                        )}
                      </div>

                      {/* 适用周数 */}
                      <div className="flex items-center gap-1 mb-1.5">
                        <span className="text-[10px] text-gray-500 w-12 flex-shrink-0">适用周</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map(w => (
                            <button
                              key={w}
                              onClick={() => setRulesConfig(prev => ({
                                ...prev,
                                achievementLines: prev.achievementLines.map((l, i) => {
                                  if (i !== index) return l
                                  const weeks = l.weekNumbers || [1, 2, 3, 4]
                                  const newWeeks = weeks.includes(w) ? weeks.filter(x => x !== w) : [...weeks, w].sort()
                                  return { ...l, weekNumbers: newWeeks.length > 0 ? newWeeks : [w] }
                                })
                              }))}
                              className={`w-6 h-5 text-[10px] rounded border ${(line.weekNumbers || [1, 2, 3, 4]).includes(w)
                                ? 'bg-yellow-600/30 border-yellow-600 text-yellow-400'
                                : 'bg-gray-700 border-gray-600 text-gray-500'}`}
                            >
                              {w}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 条件配置 - 一行三列 */}
                      <div className="flex items-center gap-2">
                        {/* 周活跃度 */}
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-500 block mb-0.5">周活跃</label>
                          <input
                            type="number"
                            value={line.condition?.weekly ?? ''}
                            placeholder="不限"
                            onChange={(e) => setRulesConfig(prev => ({
                              ...prev,
                              achievementLines: prev.achievementLines.map((l, i) =>
                                i === index ? { ...l, condition: { ...l.condition, weekly: e.target.value ? parseInt(e.target.value) : undefined } } : l
                              )
                            }))}
                            className="w-full h-6 px-1 bg-gray-700 text-white text-center text-[10px] rounded border border-gray-600 focus:border-yellow-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>

                        {/* 日均活跃度 */}
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-500 block mb-0.5">日均</label>
                          <input
                            type="number"
                            value={line.condition?.daily ?? ''}
                            placeholder="不限"
                            onChange={(e) => setRulesConfig(prev => ({
                              ...prev,
                              achievementLines: prev.achievementLines.map((l, i) =>
                                i === index ? { ...l, condition: { ...l.condition, daily: e.target.value ? parseInt(e.target.value) : undefined } } : l
                              )
                            }))}
                            className="w-full h-6 px-1 bg-gray-700 text-white text-center text-[10px] rounded border border-gray-600 focus:border-yellow-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>

                        {/* 赛季活跃度 */}
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-500 block mb-0.5">赛季</label>
                          <input
                            type="number"
                            value={line.condition?.season ?? ''}
                            placeholder="不限"
                            onChange={(e) => setRulesConfig(prev => ({
                              ...prev,
                              achievementLines: prev.achievementLines.map((l, i) =>
                                i === index ? { ...l, condition: { ...l.condition, season: e.target.value ? parseInt(e.target.value) : undefined } } : l
                              )
                            }))}
                            className="w-full h-6 px-1 bg-gray-700 text-white text-center text-[10px] rounded border border-gray-600 focus:border-yellow-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-gray-500">
                判定逻辑：满足适用当前周的任一达标线的任一条件（或关系）即为达标
              </p>

              {/* 排除成员 */}
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">排除成员（不参与考核）</label>
                <input
                  type="text"
                  value={excludeSearch}
                  onChange={(e) => setExcludeSearch(e.target.value)}
                  placeholder="搜索添加..."
                  className="w-full h-7 px-2 bg-gray-700 text-white text-xs rounded border border-gray-600 focus:border-yellow-500 focus:outline-none"
                />
                {/* 搜索结果 */}
                {excludeSearchResults.length > 0 && (
                  <div className="mt-1 max-h-24 overflow-auto bg-gray-700 border border-gray-600 rounded">
                    {excludeSearchResults.map(p => (
                      <button
                        key={p.player_id}
                        onClick={() => addExcludeMember(p.player_id)}
                        className="w-full px-2 py-1 text-left text-xs hover:bg-gray-600 transition-colors flex items-center justify-between"
                      >
                        <span className="text-white">{p.member_name}</span>
                        <span className="text-gray-500 text-[10px]">{p.player_id}</span>
                      </button>
                    ))}
                  </div>
                )}
                {/* 已排除成员 */}
                {(rulesConfig.exclude_members || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(rulesConfig.exclude_members || []).map(id => {
                      const member = currentWeekData.find(p => p.player_id === id)
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-700 text-white text-[10px] rounded"
                        >
                          {member?.member_name || id}
                          <button
                            onClick={() => removeExcludeMember(id)}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="px-3 py-2 bg-gray-900/50 border-t border-gray-700 flex gap-2">
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveRules}
                disabled={rulesSaving}
                className="flex-1 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white text-xs font-medium rounded transition-colors"
              >
                {rulesSaving ? '保存中...' : '保存规则'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 催促消息预览弹窗 */}
      {showUrgeModal && urgeMessage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-60 p-3">
          <div className="bg-gray-800 rounded-xl border border-yellow-600/50 shadow-2xl w-full max-w-md overflow-hidden">
            {/* 弹窗标题 */}
            <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between bg-yellow-600/10">
              <h4 className="text-sm font-medium text-yellow-500">催促消息预览</h4>
              <button
                onClick={() => setShowUrgeModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="max-h-[60vh] overflow-y-auto p-3 space-y-3">
              {/* 消息预览 */}
              <div className="bg-gray-900/50 border border-gray-700 rounded p-2">
                <div className="text-xs font-mono leading-relaxed whitespace-pre-wrap">
                  <div className="text-yellow-500 font-medium mb-1">以下成员请确保在周日中午12点前活跃度达标：</div>
                  {urgeMessage.inGroup.map((m, i) => (
                    <div key={i} className="text-gray-300">
                      <span className="text-cyan-400">@{m.qqName}</span> {m.info}
                    </div>
                  ))}
                </div>
              </div>

              {/* 在群成员统计 */}
              <div>
                <div className="text-xs text-green-500 font-medium mb-1">
                  在群成员 ({urgeMessage.inGroup.length}人)
                </div>
                <div className="text-xs text-gray-300 space-y-0.5">
                  {urgeMessage.inGroup.map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span>{m.name}</span>
                      <span className="text-gray-500">→</span>
                      <span className="text-cyan-400">@{m.qqName}</span>
                      <span className="text-gray-500">{m.info}</span>
                    </div>
                  ))}
                  {urgeMessage.inGroup.length === 0 && (
                    <div className="text-gray-500">无</div>
                  )}
                </div>
              </div>

              {/* 已退群成员 */}
              {urgeMessage.leftGroup.length > 0 && (
                <div>
                  <div className="text-xs text-yellow-500 font-medium mb-1">
                    已退群成员 ({urgeMessage.leftGroup.length}人)
                  </div>
                  <div className="text-xs text-gray-300 space-y-0.5">
                    {urgeMessage.leftGroup.map((m, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span>{m.name}</span>
                        <span className="text-gray-500">→</span>
                        <span className="text-yellow-500">@{m.qqName}</span>
                        <span className="text-gray-500">{m.info}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 不在群成员 */}
              {urgeMessage.notInGroup.length > 0 && (
                <div>
                  <div className="text-xs text-red-500 font-medium mb-1">
                    不在群/未绑定 ({urgeMessage.notInGroup.length}人)
                  </div>
                  <div className="text-xs text-gray-300 space-y-0.5">
                    {urgeMessage.notInGroup.map((m, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span>{m.name}</span>
                        <span className="text-gray-500">{m.info}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 弹窗底部 */}
            <div className="px-3 py-2 bg-gray-900/50 border-t border-gray-700 flex gap-2">
              <button
                onClick={() => setShowUrgeModal(false)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              >
                关闭
              </button>
              <button
                onClick={handleSendUrgeMessage}
                disabled={urgeMessage.inGroup.length === 0 || urgeSending}
                className="flex-1 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white text-xs font-medium rounded transition-colors flex items-center justify-center gap-1"
              >
                {urgeSending ? (
                  <>
                    <div className="w-3 h-3 border border-current animate-spin rounded-full" />
                    发送中...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                    发送群消息
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
