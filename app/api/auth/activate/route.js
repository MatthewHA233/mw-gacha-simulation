/**
 * 激活码验证 + 设备注册接口
 * POST /api/auth/activate
 *
 * 输入激活码（+可选密码）→ 验证 → 注册设备（FIFO，最多3台）→ 返回会员数据
 */

import { NextResponse } from 'next/server'
import { getSupabase } from '@lib/supabase/serverClient'

const MAX_DEVICES = 3

export async function POST(request) {
  try {
    const { activation_code, password, device_id } = await request.json()

    if (!activation_code || !device_id) {
      return NextResponse.json(
        { error: '缺少激活码或设备ID' },
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

    // 1. 查找 membership 记录
    const { data: membership, error: findError } = await supabase
      .from('memberships')
      .select('*')
      .eq('activation_code', activation_code.toUpperCase().trim())
      .single()

    if (findError || !membership) {
      return NextResponse.json(
        { error: '激活码不存在' },
        { status: 404 }
      )
    }

    // 2. 检查是否已激活（已付费）
    if (!membership.is_active) {
      return NextResponse.json(
        { error: '该激活码尚未完成支付' },
        { status: 403 }
      )
    }

    // 3. 如果设了密码，验证密码
    if (membership.password_hash) {
      if (!password) {
        return NextResponse.json(
          { error: '该激活码需要密码验证', requires_password: true },
          { status: 401 }
        )
      }

      const bcrypt = await import('bcryptjs')
      const isValid = await bcrypt.compare(password, membership.password_hash)

      if (!isValid) {
        return NextResponse.json(
          { error: '密码错误', requires_password: true },
          { status: 401 }
        )
      }
    }

    // 4. 设备管理（FIFO，宽松策略）
    const now = new Date().toISOString()
    let devices = Array.isArray(membership.devices) ? [...membership.devices] : []

    // 检查当前设备是否已在列表中
    const existingIdx = devices.findIndex(d => d.device_id === device_id)

    if (existingIdx >= 0) {
      // 已存在，更新 last_active_at
      devices[existingIdx].last_active_at = now
    } else {
      // 新设备
      if (devices.length >= MAX_DEVICES) {
        // 挤掉最久未活跃的设备
        devices.sort((a, b) => new Date(a.last_active_at) - new Date(b.last_active_at))
        devices.shift()
      }
      devices.push({ device_id, last_active_at: now })
    }

    // 5. 更新设备列表
    const { error: updateError } = await supabase
      .from('memberships')
      .update({
        devices,
        updated_at: now
      })
      .eq('id', membership.id)

    if (updateError) {
      console.error('[激活] 设备列表更新失败:', updateError)
    }

    // 6. 返回会员数据
    const isExpired = membership.membership_expire_at
      ? new Date(membership.membership_expire_at) < new Date()
      : true

    return NextResponse.json({
      success: true,
      data: {
        activation_code: membership.activation_code,
        display_name: membership.display_name,
        membership_type: membership.membership_type,
        membership_start_at: membership.membership_start_at,
        membership_expire_at: membership.membership_expire_at,
        is_active: membership.is_active,
        is_expired: isExpired,
        has_password: !!membership.password_hash
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
