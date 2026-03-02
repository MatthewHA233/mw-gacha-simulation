/**
 * DELETE /api/admin/costs/[id]
 */

import { NextResponse } from 'next/server'
import { getSupabase } from '@lib/supabase/serverClient'

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ error: 'Supabase 未配置' }, { status: 503 })

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
