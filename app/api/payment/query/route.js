/**
 * 查询订单状态接口 (App Router 版本)
 * GET /api/payment/query?out_trade_no=订单号
 */

import { NextResponse } from 'next/server'
import { getOrder } from '@lib/payment/orderStore'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const out_trade_no = searchParams.get('out_trade_no')

    if (!out_trade_no) {
      return NextResponse.json(
        { error: '缺少 out_trade_no 参数' },
        { status: 400 }
      )
    }

    // 查询订单
    const order = getOrder(out_trade_no)

    if (!order) {
      return NextResponse.json(
        {
          error: '订单不存在',
          out_trade_no
        },
        { status: 404 }
      )
    }

    // 返回订单状态
    return NextResponse.json({
      success: true,
      data: {
        out_trade_no: order.out_trade_no,
        trade_no: order.trade_no,
        status: order.status,  // pending | paid | failed | expired
        amount: order.amount,
        description: order.description,
        pay_type: order.pay_type,
        pay_time: order.pay_time || null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      }
    })

  } catch (error) {
    console.error('[查询订单失败]', error)
    return NextResponse.json(
      {
        error: '服务器内部错误',
        message: error.message
      },
      { status: 500 }
    )
  }
}
