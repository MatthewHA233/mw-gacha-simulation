/**
 * 解析 Bar Chart Race CSV 数据
 *
 * CSV 格式：
 * player_id,时间1,时间2,时间3,...
 * ID1,值|是否在线,值|是否在线,...
 * ID2,值|是否在线,值|是否在线,...
 */

/**
 * 解析单个数据单元格
 * 格式: "2218|False" -> { value: 2218, isOnline: false }
 */
function parseDataCell(cellValue) {
  if (!cellValue || cellValue.trim() === '') {
    return { value: 0, isOnline: false }
  }

  const trimmed = cellValue.trim()
  const [valueStr, onlineStr] = trimmed.split('|')
  const value = parseFloat(valueStr) || 0
  const isOnline = onlineStr?.toLowerCase() === 'true'
  return { value, isOnline }
}

export function parseBarChartRaceCSV(csvText) {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('Invalid CSV format')
  }

  // 移除 BOM（如果存在）
  const firstLine = lines[0].replace(/^\uFEFF/, '')
  const headers = firstLine.split(',')

  // 第一列是 player_id，后续列是时间戳
  const timestamps = headers.slice(1)

  // 解析数据行
  const players = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    if (values.length < 2) continue

    const playerId = values[0].trim()
    const data = values.slice(1).map(v => parseDataCell(v))

    players.push({ playerId, data })
  }

  // 转换为时间序列格式
  const timeline = timestamps.map((timestamp, index) => {
    // 所有玩家数据（包括0值）
    const allData = players
      .map(player => ({
        playerId: player.playerId,
        name: player.playerId, // 初始使用 playerId，后续会被映射表替换
        value: player.data[index]?.value || 0,
        isOnline: player.data[index]?.isOnline || false
      }))
      .sort((a, b) => b.value - a.value)

    // 过滤后的数据（排除0值）
    const displayData = allData.filter(item => item.value > 0)

    const total = allData.reduce((sum, item) => sum + item.value, 0)
    const onlineCount = allData.filter(item => item.isOnline === true).length

    return {
      timestamp: timestamp.trim(),
      data: displayData,
      allData: allData,
      total,
      onlineCount
    }
  })

  return timeline
}

/**
 * 解析 game_id_mapping.csv 文件
 * 返回映射对象：{ player_id: { name, joinDate, leaveDate } }
 */
export function parseGameIdMappingCSV(csvText) {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('Invalid game_id_mapping CSV format')
  }

  // 移除 BOM
  const firstLine = lines[0].replace(/^\uFEFF/, '')
  const headers = firstLine.split(',')

  // 找到列索引
  const colIndex = {
    playerId: headers.indexOf('player_id'),
    nameVariants: headers.indexOf('name_variants'),
    joinDate: headers.indexOf('join_date'),
    leaveDate: headers.indexOf('leave_date')
  }

  const mapping = {}

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length < 3) continue

    const playerId = values[colIndex.playerId]?.trim()
    if (!playerId) continue

    // name_variants 存储全部变体，显示时取第一个，并清理 [[]] 符号
    const nameVariants = values[colIndex.nameVariants]?.trim() || playerId
    const firstName = cleanName(nameVariants.split('|')[0].trim()) || playerId

    mapping[playerId] = {
      name: firstName,
      nameVariants: nameVariants,
      joinDate: values[colIndex.joinDate]?.trim() || null,
      leaveDate: values[colIndex.leaveDate]?.trim() || null
    }
  }

  return mapping
}

/**
 * 清理名字中的 [[]] 符号
 */
function cleanName(name) {
  if (!name) return name
  return name.replace(/\[\[|\]\]/g, '')
}

/**
 * 解析 CSV 行（处理引号内的逗号）
 */
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

/**
 * 解析日期字符串 YYYYMMDD -> Date
 */
function parseDateStr(dateStr) {
  if (!dateStr || dateStr.length !== 8) return null
  const year = parseInt(dateStr.substring(0, 4))
  const month = parseInt(dateStr.substring(4, 6)) - 1
  const day = parseInt(dateStr.substring(6, 8))
  return new Date(year, month, day)
}

/**
 * 将时间线数据中的 playerId 替换为显示名称
 * @param {Array} timeline - 时间线数据
 * @param {Object} mapping - player_id 到 playerInfo 的映射
 * @param {string} [yearMonth] - 可选，当前页面的年月（YYYYMM），用于判断离队时间
 */
export function applyNameMapping(timeline, mapping, yearMonth) {
  // 如果提供了 yearMonth，解析当前月份的起始和结束日期
  let monthStart = null
  let monthEnd = null
  if (yearMonth && yearMonth.length === 6) {
    const year = parseInt(yearMonth.substring(0, 4))
    const month = parseInt(yearMonth.substring(4, 6)) - 1
    monthStart = new Date(year, month, 1)
    monthEnd = new Date(year, month + 1, 0, 23, 59, 59)
  }

  const processItem = (item) => {
    const playerInfo = mapping[item.playerId] || null
    let leaveStatus = null

    // 只有提供了 yearMonth 才计算离队状态
    if (monthStart && playerInfo?.leaveDate) {
      const leaveDate = parseDateStr(playerInfo.leaveDate)
      if (leaveDate) {
        if (leaveDate < monthStart) {
          leaveStatus = 'left_before'
        } else if (leaveDate <= monthEnd) {
          leaveStatus = 'left_this_month'
        }
      }
    }

    return {
      ...item,
      name: playerInfo?.name || item.playerId,
      playerInfo,
      leaveStatus
    }
  }

  return timeline.map(frame => {
    const processedData = frame.data.map(processItem)
    const processedAllData = frame.allData.map(processItem)

    // 如果提供了 yearMonth，过滤掉本月之前离队的成员
    const filteredData = monthStart
      ? processedData.filter(item => item.leaveStatus !== 'left_before')
      : processedData
    const filteredAllData = monthStart
      ? processedAllData.filter(item => item.leaveStatus !== 'left_before')
      : processedAllData

    return {
      ...frame,
      data: filteredData,
      allData: filteredAllData
    }
  })
}

/**
 * 生成颜色调色板
 */
const COLOR_PALETTE = [
  '#D4A574', // 棕色
  '#C75B5B', // 红色
  '#4A9ECC', // 蓝色
  '#A076A8', // 紫色
  '#5B9EC7', // 青色
  '#8B7355', // 深棕
  '#4A8FB5', // 深蓝
  '#7FA85E', // 绿色
  '#C7875B', // 橙色
  '#9B7FA8', // 淡紫
  '#5BA87F', // 青绿
  '#A8925B', // 卡其
  '#C75BA8', // 粉紫
  '#5B7FC7', // 蓝紫
  '#A8C75B', // 黄绿
]

export function generateColorMap(names) {
  const colorMap = {}
  names.forEach((name, index) => {
    colorMap[name] = COLOR_PALETTE[index % COLOR_PALETTE.length]
  })
  return colorMap
}
