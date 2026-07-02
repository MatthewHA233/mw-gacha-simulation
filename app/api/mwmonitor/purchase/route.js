/**
 * MW市场幽灵(桌面/移动 app) 会员购买接口
 * POST /api/mwmonitor/purchase
 *
 * 与 /api/membership/purchase 同一套支付平台/签名/订单存储，差异：
 * - 商品是 MW市场幽灵 的会员等级月卡(白银/黄金)
 * - attach 带 app 用户 uuid，支付成功后 notify 直接调自建 Supabase 开通(无激活码)
 *
 * 入参: { tier: 'silver'|'gold', pay_type: 'alipay'|'wechat', pay_mode: 'native'|'h5',
 *        user_id: <auth.users uuid>, email: <显示用> }
 */

import { NextResponse } from 'next/server'
import { addSign } from '@lib/payment/signUtil'
import { createOrder } from '@lib/payment/orderStore'
import { getSupabase } from '@lib/supabase/serverClient'

const PAYMENT_BASE_URL = process.env.PAYMENT_API_BASE_URL || 'https://open.h5zhifu.com'
const APP_ID = process.env.PAYMENT_APP_ID
const APP_SECRET = process.env.PAYMENT_APP_SECRET
const NOTIFY_URL = process.env.NEXT_PUBLIC_PAYMENT_NOTIFY_URL || 'https://mw.lingflow.cn/api/payment/notify'

// 价格单位: 分。等级/时长服务端定死，客户端只能选套餐，防篡改
const PLANS = {
  silver: { price: 1900, duration_days: 30, name: '白银会员·月卡' },
  gold: { price: 3900, duration_days: 30, name: '黄金会员·月卡' }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request) {
  try {
    const {
      tier,
      pay_type = 'wechat',
      pay_mode = 'native',
      user_id,
      email = ''
    } = await request.json()

    if (!tier || !PLANS[tier]) {
      return NextResponse.json({ error: '无效的套餐', valid: Object.keys(PLANS) }, { status: 400 })
    }
    if (!['alipay', 'wechat'].includes(pay_type)) {
      return NextResponse.json({ error: 'pay_type 必须是 alipay 或 wechat' }, { status: 400 })
    }
    if (!user_id || !UUID_RE.test(user_id)) {
      return NextResponse.json({ error: '缺少有效的 user_id(请先在 app 内登录)' }, { status: 400 })
    }

    const plan = PLANS[tier]
    // MWM 前缀区分 MW市场幽灵 订单
    const out_trade_no = `MWM${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`

    const apiPath = pay_mode === 'h5' ? '/api/h5' : '/api/native'
    const paymentApiUrl = `${PAYMENT_BASE_URL}${apiPath}`

    const params = {
      app_id: APP_ID,
      out_trade_no,
      description: `MW市场幽灵 - ${plan.name}`,
      pay_type,
      amount: plan.price,
      notify_url: NOTIFY_URL,
      attach: JSON.stringify({
        order_type: 'mwmonitor',
        tier,
        duration_days: plan.duration_days,
        user_id,
        email
      })
    }

    const signedParams = addSign(params, APP_SECRET)

    console.log(`[MW幽灵购买] 接口: ${paymentApiUrl}, 订单号: ${out_trade_no}, 用户: ${user_id}`)

    const response = await fetch(paymentApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(signedParams)
    })

    const result = await response.json()
    console.log('[MW幽灵购买] 支付平台响应:', result)

    if (result.code !== 200) {
      return NextResponse.json({ error: '支付平台返回错误', message: result.msg }, { status: 400 })
    }

    const payUrl = result.data.code_url || result.data.jump_url

    // Supabase 持久化(跨环境, notify 在生产环境也能查到)
    const supabase = getSupabase()
    if (supabase) {
      const { error: insertError } = await supabase.from('payment_orders').insert({
        out_trade_no,
        trade_no: result.data.trade_no,
        order_type: 'mwmonitor',
        membership_type: tier,
        duration_days: plan.duration_days,
        amount: plan.price,
        description: `MW市场幽灵 - ${plan.name}`,
        pay_type,
        status: 'pending',
        jump_url: payUrl,
        metadata: { pay_mode, user_id, email, expire_time: result.data.expire_time },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      if (insertError) {
        console.error('[MW幽灵购买] Supabase 订单创建失败:', insertError)
        // 不阻塞，继续走内存
      }
    }

    createOrder({
      out_trade_no,
      trade_no: result.data.trade_no,
      amount: plan.price,
      description: `MW市场幽灵 - ${plan.name}`,
      pay_type,
      attach: params.attach,
      jump_url: payUrl,
      expire_time: result.data.expire_time,
    })

    return NextResponse.json({
      success: true,
      data: {
        out_trade_no,
        trade_no: result.data.trade_no,
        pay_url: payUrl,
        code_url: result.data.code_url || null,
        jump_url: result.data.jump_url || null,
        expire_time: result.data.expire_time,
        pay_mode,
        plan: { tier, name: plan.name, price: plan.price, duration_days: plan.duration_days }
      }
    })
  } catch (error) {
    console.error('[MW幽灵购买失败]', error)
    return NextResponse.json({ error: '服务器内部错误', message: error.message }, { status: 500 })
  }
}
