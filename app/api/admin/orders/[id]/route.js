/**
 * PATCH /api/admin/orders/[id]
 * 切换订单的管理员购置标记
 */

import { NextResponse } from 'next/server'
import { getSupabase } from '@lib/supabase/serverClient'

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const { is_admin_purchase } = await request.json()

    if (typeof is_admin_purchase !== 'boolean') {
      return NextResponse.json({ error: '参数错误' }, { status: 400 })
    }

    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ error: 'Supabase 未配置' }, { status: 503 })

    const { error } = await supabase
      .from('payment_orders')
      .update({ is_admin_purchase })
      .eq('out_trade_no', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Admin Orders Toggle]', err)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
