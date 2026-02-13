/**
 * 绑定登录账号
 * POST /api/auth/bind-account
 *
 * 数据模型：users 表（账号密码）← memberships.user_id（一对多）
 *
 * 场景1：新用户 → 创建 user + 绑定当前 membership
 * 场景2：已有账号的用户买了新激活码 → 验证密码 + 绑定新 membership
 */

import { NextResponse } from 'next/server'
import { getSupabase } from '@lib/supabase/serverClient'

export async function POST(request) {
  try {
    const { activation_code, login_id, password } = await request.json()

    if (!activation_code) {
      return NextResponse.json({ error: '缺少激活码' }, { status: 400 })
    }
    if (!login_id?.trim()) {
      return NextResponse.json({ error: '请输入登录账号' }, { status: 400 })
    }
    if (!password || password.length < 4) {
      return NextResponse.json({ error: '密码至少 4 个字符' }, { status: 400 })
    }

    const trimmedLoginId = login_id.trim()
    if (trimmedLoginId.length < 2 || trimmedLoginId.length > 50) {
      return NextResponse.json({ error: '账号长度 2-50 个字符' }, { status: 400 })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase 未配置' }, { status: 503 })
    }

    // 1. 查找 membership
    const { data: membership, error: memErr } = await supabase
      .from('memberships')
      .select('id, is_active, user_id')
      .eq('activation_code', activation_code.toUpperCase().trim())
      .single()

    if (memErr || !membership) {
      return NextResponse.json({ error: '激活码不存在' }, { status: 404 })
    }
    if (!membership.is_active) {
      return NextResponse.json({ error: '激活码尚未激活' }, { status: 403 })
    }

    const bcrypt = await import('bcryptjs')

    // 2. 检查该 login_id 是否已有 user
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('login_id', trimmedLoginId)
      .maybeSingle()

    let userId

    if (existingUser) {
      // 账号已存在 → 验证密码，然后把当前 membership 绑到该用户
      const isValid = await bcrypt.compare(password, existingUser.password_hash)
      if (!isValid) {
        return NextResponse.json(
          { error: '该账号已存在，密码不正确' },
          { status: 401 }
        )
      }
      userId = existingUser.id
    } else {
      // 新账号 → 创建 user
      const salt = await bcrypt.genSalt(10)
      const passwordHash = await bcrypt.hash(password, salt)

      const { data: newUser, error: createErr } = await supabase
        .from('users')
        .insert({
          login_id: trimmedLoginId,
          password_hash: passwordHash
        })
        .select('id')
        .single()

      if (createErr) {
        if (createErr.code === '23505') {
          return NextResponse.json({ error: '该账号已被使用' }, { status: 409 })
        }
        console.error('[绑定账号] 创建用户失败:', createErr)
        return NextResponse.json({ error: '创建账号失败' }, { status: 500 })
      }
      userId = newUser.id
    }

    // 3. 将 membership 绑定到 user
    const { error: linkErr } = await supabase
      .from('memberships')
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq('id', membership.id)

    if (linkErr) {
      console.error('[绑定账号] 关联失败:', linkErr)
      return NextResponse.json({ error: '绑定失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: existingUser ? '已绑定到现有账号' : '账号创建并绑定成功',
      data: { user_id: userId, login_id: trimmedLoginId }
    })

  } catch (error) {
    console.error('[绑定账号失败]', error)
    return NextResponse.json(
      { error: '服务器内部错误', message: error.message },
      { status: 500 }
    )
  }
}
