/**
 * 会员状态验证接口（轻量级）
 * POST /api/auth/verify
 *
 * 前端定期调用，检查会员是否仍然有效
 */

import { NextResponse } from 'next/server'
import { getSupabase } from '@lib/supabase/serverClient'

/**
 * 串行计算每张通行证的贡献天数。
 * 通行证按 expire 升序排列后，每张的贡献 = expire - max(前一张expire, now)。
 * total = 最晚过期时间 - now。
 */
function buildAllMemberships(memberships) {
  const now = new Date()
  // 按过期时间升序
  const sorted = [...memberships].sort(
    (a, b) => new Date(a.membership_expire_at) - new Date(b.membership_expire_at)
  )

  let cursor = now
  const list = sorted.map(m => {
    const expireAt = m.membership_expire_at ? new Date(m.membership_expire_at) : now
    const start = cursor > now ? cursor : now
    const contribution = Math.max(0, Math.ceil((expireAt - start) / (1000 * 60 * 60 * 24)))
    if (expireAt > cursor) cursor = expireAt
    return {
      activation_code: m.activation_code,
      membership_type: m.membership_type,
      membership_expire_at: m.membership_expire_at,
      remaining_days: contribution
    }
  })

  const total = Math.max(0, Math.ceil((cursor - now) / (1000 * 60 * 60 * 24)))
  return { all_memberships: list, total_remaining_days: total }
}

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
      .select('activation_code, is_active, membership_type, membership_start_at, membership_expire_at, devices, user_id')
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

    // 收集该用户所有 memberships
    let allMembershipsData = buildAllMemberships([membership])

    if (membership.user_id) {
      const { data: userMemberships } = await supabase
        .from('memberships')
        .select('activation_code, membership_type, membership_expire_at')
        .eq('user_id', membership.user_id)
        .eq('is_active', true)
        .order('membership_expire_at', { ascending: false })

      if (userMemberships?.length) {
        allMembershipsData = buildAllMemberships(userMemberships)
      }
    }

    // is_expired: 当所有绑定的 memberships 都过期时才 true
    const isExpired = allMembershipsData.all_memberships.every(m => m.remaining_days === 0)

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
        is_active: membership.is_active,
        membership_type: membership.membership_type,
        membership_start_at: membership.membership_start_at,
        membership_expire_at: membership.membership_expire_at,
        is_expired: isExpired,
        ...allMembershipsData
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
