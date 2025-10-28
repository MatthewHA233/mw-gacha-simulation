/**
 * 解析 Bar Chart Race CSV 数据
 * CSV 格式：
 * Name,时间1,时间2,时间3,...
 * 玩家1,值1,值2,值3,...
 * 玩家2,值1,值2,值3,...
 */

export function parseBarChartRaceCSV(csvText) {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('Invalid CSV format')
  }

  // 移除 BOM（如果存在）
  const firstLine = lines[0].replace(/^\uFEFF/, '')
  const headers = firstLine.split(',')

  // 第一列是 Name，后续列是时间戳
  const timestamps = headers.slice(1)

  // 解析数据行
  const players = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    if (values.length < 2) continue

    const name = values[0].trim()
    const data = values.slice(1).map(v => parseFloat(v) || 0)

    players.push({ name, data })
  }

  // 转换为时间序列格式
  const timeline = timestamps.map((timestamp, index) => {
    // 所有玩家数据（包括0值）
    const allData = players
      .map(player => ({
        name: player.name,
        value: player.data[index] || 0
      }))
      .sort((a, b) => b.value - a.value) // 按值降序排序

    // 过滤后的数据（仅用于图表显示，排除0值）
    const displayData = allData.filter(item => item.value > 0)

    const total = allData.reduce((sum, item) => sum + item.value, 0)

    return {
      timestamp: timestamp.trim(),
      data: displayData,      // 图表显示用（过滤0值）
      allData: allData,       // 完整数据（包含0值，用于统计总人数）
      total
    }
  })

  return timeline
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
