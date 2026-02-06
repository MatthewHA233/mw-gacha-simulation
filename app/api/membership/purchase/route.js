/**
 * 会员购买接口
 * POST /api/membership/purchase
 *
 * 流程：创建 Supabase 订单（pending）→ 调支付平台 → 返回二维码/跳转链接
 * 序列号在支付成功后由 notify 回调生成，不在这里提前创建。
 *
 * 支付平台文档：https://h5zhifu.com/doc/api/native.html
 * - H5支付  /api/h5     → 返回 jump_url（手机浏览器跳转）
 * - 扫码支付 /api/native → 返回 code_url（PC生成二维码）
 */

import { NextResponse } from 'next/server'
import { addSign } from '@lib/payment/signUtil'
import { createOrder } from '@lib/payment/orderStore'
import { getSupabase } from '@lib/supabase/serverClient'

const PAYMENT_BASE_URL = process.env.PAYMENT_API_BASE_URL || 'https://open.h5zhifu.com'
const APP_ID = process.env.PAYMENT_APP_ID
const APP_SECRET = process.env.PAYMENT_APP_SECRET
const NOTIFY_URL = process.env.NEXT_PUBLIC_PAYMENT_NOTIFY_URL || 'https://mw.lingflow.cn/api/payment/notify'

const PLANS = {
  test: { price: 10, duration_days: 1, name: '测试会员' },
  monthly: { price: 390, duration_days: 30, name: '月度会员' },
  yearly: { price: 2000, duration_days: 365, name: '年度会员' }
}

export async function POST(request) {
  try {
    const {
      subscriptionType,
      pay_type = 'wechat',
      pay_mode = 'native'
    } = await request.json()

    if (!subscriptionType || !PLANS[subscriptionType]) {
      return NextResponse.json(
        { error: '无效的套餐类型', valid: ['monthly', 'yearly'] },
        { status: 400 }
      )
    }

    if (!['alipay', 'wechat'].includes(pay_type)) {
      return NextResponse.json(
        { error: 'pay_type 必须是 alipay 或 wechat' },
        { status: 400 }
      )
    }

    const plan = PLANS[subscriptionType]

    // 生成商家订单号
    const out_trade_no = `MW${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`

    // 选择支付接口
    const apiPath = pay_mode === 'h5' ? '/api/h5' : '/api/native'
    const paymentApiUrl = `${PAYMENT_BASE_URL}${apiPath}`

    // 构建支付参数
    const params = {
      app_id: APP_ID,
      out_trade_no,
      description: `现代战舰模拟器 - ${plan.name}`,
      pay_type,
      amount: plan.price,
      notify_url: NOTIFY_URL,
      attach: JSON.stringify({
        order_type: 'subscription',
        membership_type: subscriptionType,
        duration_days: plan.duration_days
      })
    }

    const signedParams = addSign(params, APP_SECRET)

    console.log(`[会员购买] 接口: ${paymentApiUrl}, 订单号: ${out_trade_no}`)

    // 调用支付平台
    const response = await fetch(paymentApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(signedParams)
    })

    const result = await response.json()

    console.log('[会员购买] 支付平台响应:', result)

    if (result.code !== 200) {
      return NextResponse.json(
        { error: '支付平台返回错误', message: result.msg },
        { status: 400 }
      )
    }

    const payUrl = result.data.code_url || result.data.jump_url

    // 保存到 Supabase（跨环境共享）
    const supabase = getSupabase()
    if (supabase) {
      const { error: insertError } = await supabase
        .from('payment_orders')
        .insert({
          out_trade_no,
          trade_no: result.data.trade_no,
          order_type: 'subscription',
          membership_type: subscriptionType,
          duration_days: plan.duration_days,
          amount: plan.price,
          description: `现代战舰模拟器 - ${plan.name}`,
          pay_type,
          status: 'pending',
          jump_url: payUrl,
          metadata: { pay_mode, expire_time: result.data.expire_time },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('[会员购买] Supabase 订单创建失败:', insertError)
        // 不阻塞，继续走内存
      }
    }

    // 同时保存到内存（供 notify 同进程查询）
    createOrder({
      out_trade_no,
      trade_no: result.data.trade_no,
      amount: plan.price,
      description: `现代战舰模拟器 - ${plan.name}`,
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
        plan: {
          type: subscriptionType,
          name: plan.name,
          price: plan.price,
          duration_days: plan.duration_days
        }
      }
    })

  } catch (error) {
    console.error('[会员购买失败]', error)
    return NextResponse.json(
      { error: '服务器内部错误', message: error.message },
      { status: 500 }
    )
  }
}
