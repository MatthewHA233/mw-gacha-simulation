/**
 * GET  /api/admin/costs  — 获取成本列表
 * POST /api/admin/costs  — 新增成本记录 { amount, description, cost_date }
 *   amount 以分为单位
 */

import { NextResponse } from 'next/server'
import { getSupabase } from '@lib/supabase/serverClient'
import { requireAdmin } from '@lib/admin/adminAuth'

export async function GET(request) {
  try {
    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ error: 'Supabase 未配置' }, { status: 503 })
    // 管理员身份在服务端核对（2026-10-15 前这些接口不校验，谁都能调）
    const auth = await requireAdmin(request, supabase)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { data, error } = await supabase
      .from('admin_costs')
      .select('id, amount, description, cost_date, created_at')
      .order('cost_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ costs: data || [] })
  } catch (err) {
    console.error('[Admin Costs GET]', err)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { amount, description, cost_date } = body

    if (!amount || !description || !cost_date) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 })
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: '金额无效' }, { status: 400 })
    }

    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ error: 'Supabase 未配置' }, { status: 503 })
    // 管理员身份在服务端核对（2026-10-15 前这些接口不校验，谁都能调）
    const auth = await requireAdmin(request, supabase)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { data, error } = await supabase
      .from('admin_costs')
      .insert({ amount: Math.round(amount), description, cost_date })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ cost: data })
  } catch (err) {
    console.error('[Admin Costs POST]', err)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
