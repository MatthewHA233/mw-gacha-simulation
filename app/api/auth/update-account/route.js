/**
 * 修改账号名 / 密码
 * POST /api/auth/update-account
 *
 * Body: { user_id, current_password, new_login_id?, new_password? }
 * new_login_id 和 new_password 至少填一个，留空表示不改该项。
 */

import { NextResponse } from 'next/server'
import { getSupabase } from '@lib/supabase/serverClient'

export async function POST(request) {
  try {
    const { user_id, current_password, new_login_id, new_password } = await request.json()

    if (!user_id) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 })
    }
    if (!current_password) {
      return NextResponse.json({ error: '请输入当前密码' }, { status: 400 })
    }

    const trimmedNewLoginId = new_login_id?.trim() || ''
    const trimmedNewPassword = new_password?.trim() || ''

    if (!trimmedNewLoginId && !trimmedNewPassword) {
      return NextResponse.json({ error: '账号名和新密码不能同时为空' }, { status: 400 })
    }
    if (trimmedNewLoginId && (trimmedNewLoginId.length < 2 || trimmedNewLoginId.length > 50)) {
      return NextResponse.json({ error: '账号名长度 2-50 个字符' }, { status: 400 })
    }
    if (trimmedNewPassword && trimmedNewPassword.length < 4) {
      return NextResponse.json({ error: '密码至少 4 个字符' }, { status: 400 })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase 未配置' }, { status: 503 })
    }

    // 查询当前用户
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, login_id, password_hash')
      .eq('id', user_id)
      .single()

    if (userErr || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 验证当前密码
    const bcrypt = await import('bcryptjs')
    const isValid = await bcrypt.compare(current_password, user.password_hash)
    if (!isValid) {
      return NextResponse.json({ error: '当前密码不正确' }, { status: 401 })
    }

    // 构造更新对象
    const updates = { updated_at: new Date().toISOString() }

    if (trimmedNewLoginId && trimmedNewLoginId !== user.login_id) {
      // 检查新账号名是否已被占用
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('login_id', trimmedNewLoginId)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: '该账号名已被使用' }, { status: 409 })
      }
      updates.login_id = trimmedNewLoginId
    }

    if (trimmedNewPassword) {
      const salt = await bcrypt.genSalt(10)
      updates.password_hash = await bcrypt.hash(trimmedNewPassword, salt)
    }

    const { error: updateErr } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user_id)

    if (updateErr) {
      console.error('[修改账号] 更新失败:', updateErr)
      return NextResponse.json({ error: '更新失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '修改成功',
      data: { login_id: updates.login_id || user.login_id }
    })

  } catch (error) {
    console.error('[修改账号失败]', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
