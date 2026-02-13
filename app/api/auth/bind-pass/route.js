/**
 * 绑定新通行证到已有账号
 * POST /api/auth/bind-pass
 *
 * 用户已登录（有 user_id），把一个新的激活码绑到自己账号上。
 * 成功后 all_memberships 多一条，剩余天数串行叠加。
 *
 * 核心逻辑：新通行证的时间排到当前账号最晚过期时间之后，
 * 避免多张通行证同时消耗时间。
 */

import { NextResponse } from 'next/server'
import { getSupabase } from '@lib/supabase/serverClient'

function computeRemainingDays(expireAt) {
  if (!expireAt) return 0
  const diff = new Date(expireAt) - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/**
 * 串行计算每张通行证的贡献天数（与 verify 一致）
 */
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
    const { current_activation_code, new_activation_code, device_id } = await request.json()

    if (!current_activation_code || !new_activation_code) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }
    if (!device_id) {
      return NextResponse.json({ error: '缺少设备ID' }, { status: 400 })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase 未配置' }, { status: 503 })
    }

    // 1. 验证当前激活码身份 + 设备
    const { data: currentMem, error: curErr } = await supabase
      .from('memberships')
      .select('id, user_id, devices')
      .eq('activation_code', current_activation_code.toUpperCase().trim())
      .single()

    if (curErr || !currentMem) {
      return NextResponse.json({ error: '当前通行证密钥无效' }, { status: 401 })
    }
    if (!currentMem.user_id) {
      return NextResponse.json({ error: '当前通行证密钥未绑定账号，请先绑定账号' }, { status: 403 })
    }

    // 校验设备在当前 membership 的 devices 列表中
    const devices = Array.isArray(currentMem.devices) ? currentMem.devices : []
    const deviceFound = devices.some(d => d.device_id === device_id)
    if (!deviceFound) {
      return NextResponse.json({ error: '设备验证失败' }, { status: 403 })
    }

    const userId = currentMem.user_id

    // 2. 查询新激活码
    const { data: newMem, error: newErr } = await supabase
      .from('memberships')
      .select('id, is_active, user_id, membership_expire_at')
      .eq('activation_code', new_activation_code.toUpperCase().trim())
      .single()

    if (newErr || !newMem) {
      return NextResponse.json({ error: '通行证不存在' }, { status: 404 })
    }

    if (!newMem.is_active) {
      return NextResponse.json({ error: '该通行证尚未完成支付' }, { status: 403 })
    }

    // 检查是否已过期
    if (newMem.membership_expire_at && new Date(newMem.membership_expire_at) < new Date()) {
      return NextResponse.json({ error: '该通行证已过期' }, { status: 400 })
    }

    // 检查是否已被其他用户绑定
    if (newMem.user_id && newMem.user_id !== userId) {
      return NextResponse.json({ error: '该通行证已被其他用户绑定' }, { status: 409 })
    }

    // 幂等：已经绑定到当前用户
    if (newMem.user_id === userId) {
      const { data: userMemberships } = await supabase
        .from('memberships')
        .select('activation_code, membership_type, membership_expire_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('membership_expire_at', { ascending: false })

      return NextResponse.json({
        success: true,
        message: '该通行证已绑定到您的账号',
        data: buildAllMemberships(userMemberships || [])
      })
    }

    // 3. 计算新通行证的剩余天数，然后排到当前账号最晚过期之后
    const newMemRemainingDays = computeRemainingDays(newMem.membership_expire_at)

    // 查询该用户当前所有 active memberships，找出最晚过期时间
    const { data: existingMemberships } = await supabase
      .from('memberships')
      .select('membership_expire_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('membership_expire_at', { ascending: false })
      .limit(1)

    const now = new Date()
    let latestExpire = now
    if (existingMemberships?.length > 0 && existingMemberships[0].membership_expire_at) {
      const existing = new Date(existingMemberships[0].membership_expire_at)
      if (existing > now) latestExpire = existing
    }

    // 新通行证的过期时间 = 当前最晚过期时间 + 新通行证的剩余天数
    const newExpireAt = new Date(latestExpire.getTime() + newMemRemainingDays * 24 * 60 * 60 * 1000)

    // 绑定：更新 user_id + 调整 membership_expire_at
    const { error: updateErr } = await supabase
      .from('memberships')
      .update({
        user_id: userId,
        membership_expire_at: newExpireAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', newMem.id)

    if (updateErr) {
      console.error('[绑定通行证] 更新失败:', updateErr)
      return NextResponse.json({ error: '绑定失败' }, { status: 500 })
    }

    // 4. 查询该用户所有 active memberships
    const { data: userMemberships } = await supabase
      .from('memberships')
      .select('activation_code, membership_type, membership_expire_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('membership_expire_at', { ascending: false })

    return NextResponse.json({
      success: true,
      message: '通行证绑定成功',
      data: buildAllMemberships(userMemberships || [])
    })

  } catch (error) {
    console.error('[绑定通行证失败]', error)
    return NextResponse.json(
      { error: '服务器内部错误', message: error.message },
      { status: 500 }
    )
  }
}
