/**
 * 发起支付接口 (App Router 版本)
 * POST /api/payment/create
 */

import { NextResponse } from 'next/server'
import { addSign } from '@lib/payment/signUtil'
import { createOrder } from '@lib/payment/orderStore'

const PAYMENT_API_URL = 'https://open.h5zhifu.com/api/h5'
const APP_ID = process.env.PAYMENT_APP_ID
const APP_SECRET = process.env.PAYMENT_APP_SECRET
const NOTIFY_URL = process.env.NEXT_PUBLIC_PAYMENT_NOTIFY_URL || 'https://mw.lingflow.cn/api/payment/notify'

export async function POST(request) {
  try {
    const { amount, description, pay_type, attach } = await request.json()

    // 参数验证
    if (!amount || !description || !pay_type) {
      return NextResponse.json(
        {
          error: '缺少必要参数',
          required: ['amount', 'description', 'pay_type']
        },
        { status: 400 }
      )
    }

    if (!['alipay', 'wechat'].includes(pay_type)) {
      return NextResponse.json(
        { error: 'pay_type 必须是 alipay 或 wechat' },
        { status: 400 }
      )
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'amount 必须是正整数（单位：分）' },
        { status: 400 }
      )
    }

    // 生成商家订单号
    const out_trade_no = `MW${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`

    // 构建请求参数
    const params = {
      app_id: APP_ID,
      out_trade_no,
      description,
      pay_type,
      amount,
      notify_url: NOTIFY_URL,
    }

    if (attach) {
      params.attach = attach
    }

    // 生成签名
    const signedParams = addSign(params, APP_SECRET)

    console.log('[发起支付] 请求参数:', signedParams)

    // 调用支付平台接口
    const response = await fetch(PAYMENT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(signedParams)
    })

    const result = await response.json()

    console.log('[发起支付] 支付平台响应:', result)

    if (result.code !== 200) {
      return NextResponse.json(
        {
          error: '支付平台返回错误',
          message: result.msg,
          code: result.code
        },
        { status: 400 }
      )
    }

    // 保存订单
    createOrder({
      out_trade_no,
      trade_no: result.data.trade_no,
      amount,
      description,
      pay_type,
      attach,
      jump_url: result.data.jump_url,
      expire_time: result.data.expire_time,
    })

    // 返回支付跳转信息
    return NextResponse.json({
      success: true,
      data: {
        out_trade_no,
        trade_no: result.data.trade_no,
        jump_url: result.data.jump_url,
        expire_time: result.data.expire_time,
      }
    })

  } catch (error) {
    console.error('[发起支付失败]', error)
    return NextResponse.json(
      {
        error: '服务器内部错误',
        message: error.message
      },
      { status: 500 }
    )
  }
}
