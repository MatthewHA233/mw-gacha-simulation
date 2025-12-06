import { NextResponse } from 'next/server'
import OSS from 'ali-oss'

// OSS 客户端配置
function getOSSClient() {
  return new OSS({
    endpoint: process.env.OSS_ENDPOINT,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    bucket: process.env.OSS_BUCKET_NAME
  })
}

// 配置文件路径：{OSS_PATH_PREFIX}/horizn/config.json
const CONFIG_PATH = `${process.env.OSS_PATH_PREFIX || 'mw-gacha-simulation'}/horizn/config.json`

// 默认配置
const DEFAULT_CONFIG = {
  weeklyThreshold: 2500,
  dailyThreshold: 500,
  excludeMembers: []
}

/**
 * GET /api/horizn/config
 * 读取 OSS 上的 horizn 配置
 */
export async function GET() {
  try {
    const client = getOSSClient()

    try {
      const result = await client.get(CONFIG_PATH)
      const config = JSON.parse(result.content.toString())
      return NextResponse.json(config)
    } catch (err) {
      // 文件不存在，返回默认配置
      if (err.code === 'NoSuchKey') {
        return NextResponse.json(DEFAULT_CONFIG)
      }
      throw err
    }
  } catch (error) {
    console.error('读取配置失败:', error)
    return NextResponse.json(
      { error: '读取配置失败', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/horizn/config
 * 写入 OSS 上的 horizn 配置
 */
export async function POST(request) {
  try {
    const config = await request.json()

    // 验证配置格式
    if (typeof config.weeklyThreshold !== 'number' ||
        typeof config.dailyThreshold !== 'number' ||
        !Array.isArray(config.excludeMembers)) {
      return NextResponse.json(
        { error: '配置格式错误' },
        { status: 400 }
      )
    }

    const client = getOSSClient()

    // 写入配置
    await client.put(CONFIG_PATH, Buffer.from(JSON.stringify(config, null, 2)), {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('保存配置失败:', error)
    return NextResponse.json(
      { error: '保存配置失败', message: error.message },
      { status: 500 }
    )
  }
}
