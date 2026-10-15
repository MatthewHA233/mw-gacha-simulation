/**
 * DELETE /api/admin/costs/[id]
 */

import { NextResponse } from 'next/server'
import { getSupabase } from '@lib/supabase/serverClient'
import { requireAdmin } from '@lib/admin/adminAuth'

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ error: 'Supabase 未配置' }, { status: 503 })
    // 管理员身份在服务端核对（2026-10-15 前这些接口不校验，谁都能调）
    const auth = await requireAdmin(request, supabase)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { error } = await supabase
      .from('admin_costs')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Admin Costs DELETE]', err)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
