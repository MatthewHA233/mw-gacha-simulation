/**
 * 支付回调接口 (App Router 版本)
 * POST /api/payment/notify
 *
 * 回调地址：https://mw.lingflow.cn/api/payment/notify
 */

import { NextResponse } from 'next/server'
import { verifySign } from '@lib/payment/signUtil'
import { getOrder, updateOrderStatus } from '@lib/payment/orderStore'

const APP_SECRET = process.env.PAYMENT_APP_SECRET

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
      status,
      pay_time,
      attach
    } = callbackData

    // 2. 查询订单
    const order = getOrder(out_trade_no)

    if (!order) {
      console.error(`[支付回调] 订单不存在: ${out_trade_no}`)
      return new Response('Order not found', { status: 404 })
    }

    // 3. 检查订单状态（防止重复处理）
    if (order.status === 'paid') {
      console.log(`[支付回调] 订单已处理: ${out_trade_no}`)
      return new Response('success', { status: 200 })
    }

    // 4. 验证金额
    if (order.amount !== amount) {
      console.error(`[支付回调] 金额不匹配: 订单 ${order.amount}, 回调 ${amount}`)
      return new Response('Amount mismatch', { status: 400 })
    }

    // 5. 处理支付成功逻辑
    if (status === 'success') {
      updateOrderStatus(out_trade_no, 'paid', {
        pay_time,
        platform_trade_no: trade_no
      })

      // 🎯 执行业务逻辑
      await handlePaymentSuccess(order, attach)

      console.log(`[支付回调] 支付成功: ${out_trade_no}, 金额: ${amount / 100} 元`)
    } else {
      updateOrderStatus(out_trade_no, 'failed')
      console.log(`[支付回调] 支付失败: ${out_trade_no}`)
    }

    // 6. 返回 success
    return new Response('success', { status: 200 })

  } catch (error) {
    console.error('[支付回调失败]', error)
    return new Response('fail', { status: 500 })
  }
}

/**
 * 处理支付成功后的业务逻辑
 */
async function handlePaymentSuccess(order, attach) {
  console.log('[业务处理] 开始处理支付成功逻辑')
  console.log('订单信息:', order)
  console.log('自定义数据:', attach)

  try {
    if (attach) {
      const customData = JSON.parse(attach)
      const { userId, itemType, itemCount } = customData

      console.log(`[业务处理] 为用户 ${userId} 发放 ${itemCount} 个 ${itemType}`)

      // TODO: 调用你的数据库/API，给用户账户添加货币
      // await addUserCurrency(userId, itemType, itemCount)
    }
  } catch (err) {
    console.error('[业务处理失败]', err)
  }
}
