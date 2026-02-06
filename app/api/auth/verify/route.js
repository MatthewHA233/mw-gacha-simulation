/**
 * 会员状态验证接口（轻量级）
 * POST /api/auth/verify
 *
 * 前端定期调用，检查会员是否仍然有效
 */

import { NextResponse } from 'next/server'
import { getSupabase } from '@lib/supabase/serverClient'

export async function POST(request) {
  try {
    const { activation_code, device_id } = await request.json()

    if (!activation_code) {
      return NextResponse.json(
        { error: '缺少激活码' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase 未配置' },
        { status: 503 }
      )
    }

    // 查询 membership
    const { data: membership, error } = await supabase
      .from('memberships')
      .select('activation_code, display_name, is_active, membership_type, membership_start_at, membership_expire_at, password_hash, devices')
      .eq('activation_code', activation_code.toUpperCase().trim())
      .single()

    if (error || !membership) {
      return NextResponse.json(
        { error: '激活码不存在', valid: false },
        { status: 404 }
      )
    }

    if (!membership.is_active) {
      return NextResponse.json({
        success: true,
        data: { valid: false, reason: 'not_paid' }
      })
    }

    const isExpired = membership.membership_expire_at
      ? new Date(membership.membership_expire_at) < new Date()
      : true

    // 如果提供了 device_id，更新其 last_active_at
    if (device_id && Array.isArray(membership.devices)) {
      const devices = [...membership.devices]
      const idx = devices.findIndex(d => d.device_id === device_id)
      if (idx >= 0) {
        devices[idx].last_active_at = new Date().toISOString()
        await supabase
          .from('memberships')
          .update({ devices, updated_at: new Date().toISOString() })
          .eq('activation_code', activation_code.toUpperCase().trim())
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        activation_code: membership.activation_code,
        display_name: membership.display_name,
        membership_type: membership.membership_type,
        membership_start_at: membership.membership_start_at,
        membership_expire_at: membership.membership_expire_at,
        is_expired: isExpired,
        has_password: !!membership.password_hash
      }
    })

  } catch (error) {
    console.error('[验证失败]', error)
    return NextResponse.json(
      { error: '服务器内部错误', message: error.message },
      { status: 500 }
    )
  }
}
