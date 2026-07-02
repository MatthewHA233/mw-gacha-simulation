/**
 * 查询订单状态接口
 * GET /api/payment/query?out_trade_no=订单号
 *
 * 优先查 Supabase（跨环境共享），fallback 查内存 orderStore。
 * 本地开发环境通过 Supabase 能看到生产回调写入的支付结果。
 */

import { NextResponse } from 'next/server'
import { getOrder } from '@lib/payment/orderStore'
import { getSupabase } from '@lib/supabase/serverClient'
import { grantMwMonitorMembership } from '@lib/mwmonitor/grant'

export const dynamic = 'force-dynamic'

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

    // 优先查 Supabase
    const supabase = getSupabase()
    if (supabase) {
      const { data: order } = await supabase
        .from('payment_orders')
        .select('out_trade_no, trade_no, status, amount, description, pay_type, pay_time, activation_code, membership_type, order_type, duration_days, metadata, created_at, updated_at')
        .eq('out_trade_no', out_trade_no)
        .single()

      if (order) {
        // MW市场幽灵 自愈补发：已付但未发货(notify 那次失败/网络抖动) → 轮询时重试。
        // 发货函数按订单号幂等, 与 notify 并发也不会重复加时长。
        if (
          order.order_type === 'mwmonitor' &&
          order.status === 'paid' &&
          order.metadata?.granted !== true &&
          order.metadata?.user_id
        ) {
          try {
            const r = await grantMwMonitorMembership({
              user_id: order.metadata.user_id,
              tier: order.membership_type,
              duration_days: order.duration_days,
              out_trade_no: order.out_trade_no,
              amount_cents: order.amount
            })
            console.log(`[MW幽灵会员] 轮询自愈发货成功 订单=${order.out_trade_no} tier=${r.tier}`)
            await supabase
              .from('payment_orders')
              .update({
                metadata: { ...order.metadata, granted: true, granted_by: 'query-selfheal' },
                updated_at: new Date().toISOString()
              })
              .eq('out_trade_no', order.out_trade_no)
          } catch (err) {
            console.error(`[MW幽灵会员] 轮询自愈发货失败 订单=${order.out_trade_no}:`, err)
          }
        }
        return NextResponse.json({
          success: true,
          data: {
            out_trade_no: order.out_trade_no,
            trade_no: order.trade_no,
            status: order.status,
            amount: order.amount,
            description: order.description,
            pay_type: order.pay_type,
            pay_time: order.pay_time || null,
            activation_code: order.activation_code || null,
            membership_type: order.membership_type || null,
            createdAt: order.created_at,
            updatedAt: order.updated_at,
          }
        })
      }
    }

    // Fallback: 查内存
    const order = getOrder(out_trade_no)

    if (!order) {
      return NextResponse.json(
        { error: '订单不存在', out_trade_no },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        out_trade_no: order.out_trade_no,
        trade_no: order.trade_no,
        status: order.status,
        amount: order.amount,
        description: order.description,
        pay_type: order.pay_type,
        pay_time: order.pay_time || null,
        activation_code: null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      }
    })

  } catch (error) {
    console.error('[查询订单失败]', error)
    return NextResponse.json(
      { error: '服务器内部错误', message: error.message },
      { status: 500 }
    )
  }
}
