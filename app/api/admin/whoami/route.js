export const dynamic = 'force-dynamic'
/**
 * 当前登录者是否管理员
 * GET /api/admin/whoami
 *
 * 管理员账号只在服务端环境变量里，前端不再本地比对 login_id（2026-10-15 前 ADMIN_ID 硬编码在源码里并打进了浏览器 JS）。
 * 身份头与其它 /api/admin/* 一致，由 requireAdmin 核对。
 */

import { NextResponse } from 'next/server'
import { getSupabase } from '@lib/supabase/serverClient'
import { requireAdmin } from '@lib/admin/adminAuth'

export async function GET(request) {
  try {
    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ error: 'Supabase 未配置' }, { status: 503 })
    const auth = await requireAdmin(request, supabase)
    if (!auth.ok) return NextResponse.json({ isAdmin: false, error: auth.error }, { status: auth.status })
    return NextResponse.json({ isAdmin: true })
  } catch (err) {
    console.error('[Admin Whoami]', err)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
