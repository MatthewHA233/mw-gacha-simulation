import { NextResponse } from 'next/server'

/**
 * 发送 QQ 群消息（代理接口）
 * 通过服务端转发，避免客户端 Mixed Content 错误
 */
export async function POST(request) {
  try {
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json(
        { success: false, error: '消息内容不能为空' },
        { status: 400 }
      )
    }

    const NAPCAT_URL = process.env.NEXT_PUBLIC_NAPCAT_URL
    const NAPCAT_TOKEN = process.env.NEXT_PUBLIC_NAPCAT_TOKEN
    const GROUP_ID = process.env.NEXT_PUBLIC_NAPCAT_GROUP_ID

    // 检查配置
    if (!NAPCAT_URL || !GROUP_ID) {
      return NextResponse.json(
        {
          success: false,
          error: 'NapCat 配置不完整，请检查环境变量 NEXT_PUBLIC_NAPCAT_URL 和 NEXT_PUBLIC_NAPCAT_GROUP_ID'
        },
        { status: 500 }
      )
    }

    console.log('[NapCat Proxy] Sending message to group:', GROUP_ID)

    // 调用 NapCat API
    const resp = await fetch(`${NAPCAT_URL}/send_group_msg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NAPCAT_TOKEN}`
      },
      body: JSON.stringify({
        group_id: Number(GROUP_ID),
        message: message
      })
    })

    const data = await resp.json()

    if (data.status !== 'ok') {
      let errorMsg = data.message || data.wording || '发送失败'

      // 友好错误提示
      if (errorMsg.includes('GetUidError') || errorMsg.includes('get_uid')) {
        errorMsg = '发送失败：无法获取用户UID，请检查 @ 的 QQ 号是否正确，或稍后重试'
      } else if (errorMsg.includes('timeout')) {
        errorMsg = '发送超时，请检查 NapCat 服务是否正常运行'
      } else if (errorMsg.includes('permission')) {
        errorMsg = '权限不足，请检查机器人是否有发送消息的权限'
      }

      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message_id: data.data?.message_id
    })
  } catch (err) {
    console.error('[NapCat Proxy] Error:', err)

    let errorMsg = '网络请求失败'
    if (err instanceof Error) {
      if (err.message.includes('fetch')) {
        errorMsg = `无法连接到 NapCat 服务，请检查服务是否启动`
      } else {
        errorMsg = err.message
      }
    }

    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    )
  }
}
