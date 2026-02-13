/**
 * 激活/登录接口
 * POST /api/auth/activate
 *
 * 方式1：activation_code（+可选密码）→ 序列号登录
 * 方式2：login_id + password → 账号密码登录（查 users 表 → 找最佳 membership）
 */

import { NextResponse } from 'next/server'
import { getSupabase } from '@lib/supabase/serverClient'

const MAX_DEVICES = 3

function computeRemainingDays(expireAt) {
  if (!expireAt) return 0
  const diff = new Date(expireAt) - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function buildAllMemberships(memberships) {
  const now = new Date()
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
    const { activation_code, login_id, password, device_id } = await request.json()

    if (!device_id) {
      return NextResponse.json({ error: '缺少设备ID' }, { status: 400 })
    }
    if (!activation_code && !login_id) {
      return NextResponse.json({ error: '请输入序列号或登录账号' }, { status: 400 })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase 未配置' }, { status: 503 })
    }

    let membership
    let userAccount = null // { login_id, user_id }
    let memberships = null // 账号登录时的全部 memberships

    if (login_id) {
      // ========== 方式2：账号密码登录 ==========
      if (!password) {
        return NextResponse.json({ error: '请输入密码', requires_password: true }, { status: 401 })
      }

      // 查 users 表
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, login_id, password_hash')
        .eq('login_id', login_id.trim())
        .single()

      if (userErr || !user) {
        return NextResponse.json({ error: '账号不存在' }, { status: 404 })
      }

      const bcrypt = await import('bcryptjs')
      const isValid = await bcrypt.compare(password, user.password_hash)
      if (!isValid) {
        return NextResponse.json({ error: '密码错误', requires_password: true }, { status: 401 })
      }

      userAccount = { login_id: user.login_id, user_id: user.id }

      // 查该用户的所有 membership，找最佳的（未过期优先，然后按过期时间倒序）
      const { data: userMems, error: memErr } = await supabase
        .from('memberships')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('membership_expire_at', { ascending: false })

      if (memErr || !userMems?.length) {
        return NextResponse.json({ error: '该账号暂无有效会员' }, { status: 404 })
      }
      memberships = userMems

      // 优先选未过期的，否则选最近过期的
      const now = new Date()
      membership = memberships.find(m =>
        m.membership_expire_at && new Date(m.membership_expire_at) > now
      ) || memberships[0]

    } else {
      // ========== 方式1：序列号登录 ==========
      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .eq('activation_code', activation_code.toUpperCase().trim())
        .single()

      if (error || !data) {
        return NextResponse.json({ error: '通行证密钥不存在' }, { status: 404 })
      }
      membership = data

      // 如果该 membership 绑了 user，也返回 userAccount
      if (membership.user_id) {
        const { data: user } = await supabase
          .from('users')
          .select('login_id')
          .eq('id', membership.user_id)
          .single()
        if (user) {
          userAccount = { login_id: user.login_id, user_id: membership.user_id }
        }
      }
    }

    // 检查是否已激活（已付费）
    if (!membership.is_active) {
      return NextResponse.json({ error: '该通行证密钥尚未完成支付' }, { status: 403 })
    }

    // 设备管理（FIFO）
    const now = new Date().toISOString()
    let devices = Array.isArray(membership.devices) ? [...membership.devices] : []
    const existingIdx = devices.findIndex(d => d.device_id === device_id)

    if (existingIdx >= 0) {
      devices[existingIdx].last_active_at = now
    } else {
      if (devices.length >= MAX_DEVICES) {
        devices.sort((a, b) => new Date(a.last_active_at) - new Date(b.last_active_at))
        devices.shift()
      }
      devices.push({ device_id, last_active_at: now })
    }

    await supabase
      .from('memberships')
      .update({ devices, updated_at: now })
      .eq('id', membership.id)

    // 收集该用户所有 memberships
    let allMembershipsData = { all_memberships: [], total_remaining_days: 0 }

    if (login_id && memberships?.length) {
      // 方式2：已有完整 memberships 数组
      allMembershipsData = buildAllMemberships(memberships)
    } else if (membership.user_id) {
      // 方式1：激活码登录，但绑了用户 → 查该用户所有 active memberships
      const { data: userMemberships } = await supabase
        .from('memberships')
        .select('activation_code, membership_type, membership_expire_at')
        .eq('user_id', membership.user_id)
        .eq('is_active', true)
        .order('membership_expire_at', { ascending: false })

      if (userMemberships?.length) {
        allMembershipsData = buildAllMemberships(userMemberships)
      } else {
        allMembershipsData = buildAllMemberships([membership])
      }
    } else {
      // 无绑定用户，只有当前这一条
      allMembershipsData = buildAllMemberships([membership])
    }

    // is_expired: 当所有绑定的 memberships 都过期时才 true
    const isExpired = allMembershipsData.all_memberships.length > 0
      ? allMembershipsData.all_memberships.every(m => m.remaining_days === 0)
      : (membership.membership_expire_at ? new Date(membership.membership_expire_at) < new Date() : true)

    return NextResponse.json({
      success: true,
      data: {
        activation_code: membership.activation_code,
        membership_type: membership.membership_type,
        membership_start_at: membership.membership_start_at,
        membership_expire_at: membership.membership_expire_at,
        is_active: membership.is_active,
        is_expired: isExpired,
        user_account: userAccount,
        ...allMembershipsData
      }
    })

  } catch (error) {
    console.error('[激活失败]', error)
    return NextResponse.json(
      { error: '服务器内部错误', message: error.message },
      { status: 500 }
    )
  }
}
