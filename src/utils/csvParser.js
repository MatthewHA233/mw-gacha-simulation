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

    // name_variants 存储全部变体，显示时取第一个
    const nameVariants = values[colIndex.nameVariants]?.trim() || playerId
    const firstName = nameVariants.split('|')[0].trim() || playerId

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
 * 将时间线数据中的 playerId 替换为显示名称
 */
export function applyNameMapping(timeline, mapping) {
  return timeline.map(frame => ({
    ...frame,
    data: frame.data.map(item => ({
      ...item,
      name: mapping[item.playerId]?.name || item.playerId,
      playerInfo: mapping[item.playerId] || null
    })),
    allData: frame.allData.map(item => ({
      ...item,
      name: mapping[item.playerId]?.name || item.playerId,
      playerInfo: mapping[item.playerId] || null
    }))
  }))
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
