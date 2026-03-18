export const dynamic = 'force-dynamic'
/**
 * 管理员收入统计 API
 * GET /api/admin/stats?year=2026&month=3
 *
 * 返回：月度汇总、每日收入、过去12个月趋势、按类型分布、近期订单
 * 所有聚合由 Supabase RPC 函数 admin_revenue_stats 在数据库完成
 */

import { NextResponse } from 'next/server'
import { getSupabase } from '@lib/supabase/serverClient'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const now = new Date()
    const year  = parseInt(searchParams.get('year')  || now.getFullYear())
    const month = parseInt(searchParams.get('month') || now.getMonth() + 1)

    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ error: 'Supabase 未配置' }, { status: 503 })

    const { data, error } = await supabase.rpc('admin_revenue_stats', {
      p_year: year,
      p_month: month,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
  } catch (err) {
    console.error('[Admin Stats]', err)
    return NextResponse.json({ error: '服务器内部错误', message: err.message }, { status: 500 })
  }
}
