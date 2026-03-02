/**
 * 管理员订单分页 API
 * GET /api/admin/orders?page=1&limit=20
 */

import { NextResponse } from 'next/server'
import { getSupabase } from '@lib/supabase/serverClient'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '20')))
    const from  = (page - 1) * limit
    const to    = from + limit - 1

    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ error: 'Supabase 未配置' }, { status: 503 })

    const { data: orders, error, count } = await supabase
      .from('payment_orders')
      .select('out_trade_no, amount, pay_type, pay_time, membership_type, is_admin_purchase, activation_code', { count: 'exact' })
      .eq('status', 'paid')
      .order('pay_time', { ascending: false })
      .range(from, to)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      orders: (orders || []).map(o => ({
        out_trade_no:      o.out_trade_no,
        amount:            o.amount,
        pay_type:          o.pay_type,
        pay_time:          o.pay_time,
        membership_type:   o.membership_type || 'unknown',
        is_admin_purchase: o.is_admin_purchase ?? false,
        activation_code:   o.activation_code   || null,
      })),
      total:      count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit)
    })
  } catch (err) {
    console.error('[Admin Orders]', err)
    return NextResponse.json({ error: '服务器内部错误', message: err.message }, { status: 500 })
  }
}
