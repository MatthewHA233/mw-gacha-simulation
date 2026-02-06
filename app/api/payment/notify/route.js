/**
 * 支付回调接口
 * POST /api/payment/notify
 *
 * 回调地址：https://mw.lingflow.cn/api/payment/notify
 *
 * 会员订单流程：
 * 验签 → 更新订单状态 → 生成序列号(MW-XXXXXXXX) → 创建会员记录 → 写回订单
 */

import { NextResponse } from 'next/server'
import { verifySign } from '@lib/payment/signUtil'
import { getOrder, updateOrderStatus } from '@lib/payment/orderStore'
import { getSupabase } from '@lib/supabase/serverClient'

const APP_SECRET = process.env.PAYMENT_APP_SECRET

/**
 * 序列号字符集：排除易混淆字符 0/O/1/I/L
 * 30 个字符 × 8 位 = 30^8 ≈ 6561 亿种组合
 */
const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function generateActivationCode() {
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return `MW-${code}`
}

export async function POST(request) {
  try {
    const callbackData = await request.json()

    console.log('[支付回调] 收到通知:', JSON.stringify(callbackData, null, 2))

    // 1. 验证签名
    if (!verifySign(callbackData, APP_SECRET)) {
      console.error('[支付回调] 签名验证失败')
      return new Response('Invalid signature', { status: 400 })
    }

    const {
      trade_no,
      out_trade_no,
      amount,
      pay_time,
      attach
    } = callbackData

    // 支付平台回调本身就代表支付成功（有 pay_time 即成功）
    const status = pay_time ? 'success' : 'failed'

    // 2. 查询订单（优先内存，再查 Supabase）
    let order = getOrder(out_trade_no)
    let orderFromSupabase = false

    const supabase = getSupabase()

    if (!order && supabase) {
      const { data } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('out_trade_no', out_trade_no)
        .single()

      if (data) {
        order = data
        orderFromSupabase = true
      }
    }

    if (!order) {
      console.error(`[支付回调] 订单不存在: ${out_trade_no}`)
      return new Response('Order not found', { status: 404 })
    }

    // 3. 防重复处理
    if (order.status === 'paid') {
      console.log(`[支付回调] 订单已处理: ${out_trade_no}`)
      return new Response('success', { status: 200 })
    }

    // 4. 验证金额
    if (order.amount !== amount) {
      console.error(`[支付回调] 金额不匹配: 订单 ${order.amount}, 回调 ${amount}`)
      return new Response('Amount mismatch', { status: 400 })
    }

    // 5. 处理支付结果
    if (status === 'success') {
      // 更新内存
      updateOrderStatus(out_trade_no, 'paid', {
        pay_time,
        platform_trade_no: trade_no
      })

      // 更新 Supabase 订单状态
      if (supabase) {
        await supabase
          .from('payment_orders')
          .update({
            status: 'paid',
            trade_no,
            pay_time: pay_time || new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('out_trade_no', out_trade_no)
      }

      // 执行业务逻辑
      await handlePaymentSuccess(out_trade_no, order, attach)

      console.log(`[支付回调] 支付成功: ${out_trade_no}, 金额: ${amount / 100} 元`)
    } else {
      updateOrderStatus(out_trade_no, 'failed')

      if (supabase) {
        await supabase
          .from('payment_orders')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('out_trade_no', out_trade_no)
      }

      console.log(`[支付回调] 支付失败: ${out_trade_no}`)
    }

    return new Response('success', { status: 200 })

  } catch (error) {
    console.error('[支付回调失败]', error)
    return new Response('fail', { status: 500 })
  }
}

/**
 * 处理支付成功
 */
async function handlePaymentSuccess(out_trade_no, order, attach) {
  try {
    if (!attach) {
      console.warn('[业务处理] 订单无 attach 数据，跳过')
      return
    }

    const customData = JSON.parse(attach)
    const { order_type } = customData

    if (order_type === 'subscription') {
      await handleSubscriptionSuccess(out_trade_no, order, customData)
      return
    }

    // 其他订单类型
    const { userId, itemType, itemCount } = customData
    console.log(`[业务处理] 为用户 ${userId} 发放 ${itemCount} 个 ${itemType}`)

  } catch (err) {
    console.error('[业务处理失败]', err)
  }
}

/**
 * 处理会员订阅成功
 * 生成序列号 → 创建 memberships 记录 → 写回 payment_orders
 */
async function handleSubscriptionSuccess(out_trade_no, order, customData) {
  const supabase = getSupabase()
  if (!supabase) {
    console.error('[会员开通] Supabase 未配置，无法处理会员订单')
    return
  }

  const { membership_type, duration_days } = customData

  // 1. 生成唯一序列号（重试机制）
  let activationCode = null
  for (let i = 0; i < 20; i++) {
    const code = generateActivationCode()
    const { data: existing } = await supabase
      .from('memberships')
      .select('id')
      .eq('activation_code', code)
      .single()

    if (!existing) {
      activationCode = code
      break
    }
  }

  if (!activationCode) {
    console.error('[会员开通] 序列号生成失败（20次重试耗尽）')
    return
  }

  const now = new Date()
  const expireAt = new Date(now.getTime() + duration_days * 24 * 60 * 60 * 1000)

  // 2. 创建 membership 记录（已激活）
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .insert({
      activation_code: activationCode,
      is_active: true,
      membership_type,
      membership_start_at: now.toISOString(),
      membership_expire_at: expireAt.toISOString(),
      total_spent_cents: order.amount,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    .select()
    .single()

  if (membershipError) {
    console.error('[会员开通] 创建 membership 失败:', membershipError)
    return
  }

  console.log(`[会员开通] 序列号: ${activationCode}, 会员ID: ${membership.id}`)

  // 3. 把序列号写回订单（前端轮询 query 时能拿到）
  const { error: updateError } = await supabase
    .from('payment_orders')
    .update({
      activation_code: activationCode,
      membership_id: membership.id,
      updated_at: now.toISOString()
    })
    .eq('out_trade_no', out_trade_no)

  if (updateError) {
    console.error('[会员开通] 订单更新失败:', updateError)
  }

  // 4. 创建订阅审计记录
  const { error: subscriptionError } = await supabase
    .from('subscriptions')
    .insert({
      membership_id: membership.id,
      subscription_type: membership_type,
      price_cents: order.amount,
      duration_days,
      activated_at: now.toISOString(),
      created_at: now.toISOString()
    })

  if (subscriptionError) {
    console.error('[会员开通] 订阅记录创建失败:', subscriptionError)
  }

  console.log(`[会员开通成功] 序列号: ${activationCode}, 类型: ${membership_type}, 过期: ${expireAt.toISOString()}`)
}
