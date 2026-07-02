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
import { grantMwMonitorMembership } from '@lib/mwmonitor/grant'

/**
 * 将支付网关回调的北京本地时间字符串转换为 UTC ISO 字符串
 * 网关回调的 pay_time 为北京时间（UTC+8），不带时区信息，需手动补 +08:00
 */
function payTimeToUTC(payTime) {
  if (!payTime) return null
  const s = String(payTime).trim()
  // 已带时区信息（含 Z / + / -）则直接解析
  if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) {
    return new Date(s).toISOString()
  }
  // 无时区信息：视为北京时间（UTC+8），补 +08:00 后转 UTC
  return new Date(s.replace(' ', 'T') + '+08:00').toISOString()
}

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
            pay_time: payTimeToUTC(pay_time) || new Date().toISOString(),
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

    if (order_type === 'mwmonitor') {
      await handleMwMonitorSuccess(out_trade_no, order, customData)
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
 * 处理 MW市场幽灵 会员订单：无激活码，直接调自建 Supabase 开通/续费。
 * 发货失败只记日志(订单已标 paid)，据 out_trade_no 人工补发。
 */
async function handleMwMonitorSuccess(out_trade_no, order, customData) {
  const { user_id, tier, duration_days } = customData
  const supabase = getSupabase()
  const mark = async (patch) => {
    if (!supabase) return
    const { error } = await supabase
      .from('payment_orders')
      .update({
        metadata: { ...(order.metadata || {}), ...patch },
        updated_at: new Date().toISOString()
      })
      .eq('out_trade_no', out_trade_no)
    if (error) console.error('[MW幽灵会员] 订单标记失败:', error)
  }

  try {
    const r = await grantMwMonitorMembership({
      user_id, tier, duration_days, out_trade_no, amount_cents: order.amount
    })
    console.log(`[MW幽灵会员] 开通成功 user=${user_id} tier=${r.tier} 到期=${r.expires_at}`)
    await mark({ granted: true })
  } catch (err) {
    // 失败原因落到订单上(排查不再依赖函数日志); query 轮询会自动重试补发(发货幂等)
    console.error(`[MW幽灵会员] 发货失败(轮询将自动重试) 订单=${out_trade_no} user=${user_id}:`, err)
    await mark({ granted: false, grant_error: String(err).slice(0, 300) })
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
