/**
 * 设置/修改密码接口（可选）
 * POST /api/auth/set-password
 *
 * 用户激活后可选设置密码，下次恢复时需要输入
 */

import { NextResponse } from 'next/server'
import { getSupabase } from '@lib/supabase/serverClient'

export async function POST(request) {
  try {
    const { activation_code, current_password, new_password } = await request.json()

    if (!activation_code || !new_password) {
      return NextResponse.json(
        { error: '缺少激活码或新密码' },
        { status: 400 }
      )
    }

    if (new_password.length < 4 || new_password.length > 50) {
      return NextResponse.json(
        { error: '密码长度需要 4-50 个字符' },
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
    const { data: membership, error: findError } = await supabase
      .from('memberships')
      .select('id, password_hash, is_active')
      .eq('activation_code', activation_code.toUpperCase().trim())
      .single()

    if (findError || !membership) {
      return NextResponse.json(
        { error: '激活码不存在' },
        { status: 404 }
      )
    }

    if (!membership.is_active) {
      return NextResponse.json(
        { error: '该激活码尚未激活' },
        { status: 403 }
      )
    }

    const bcrypt = await import('bcryptjs')

    // 如果已有密码，需要验证当前密码
    if (membership.password_hash) {
      if (!current_password) {
        return NextResponse.json(
          { error: '修改密码需要输入当前密码' },
          { status: 400 }
        )
      }

      const isValid = await bcrypt.compare(current_password, membership.password_hash)
      if (!isValid) {
        return NextResponse.json(
          { error: '当前密码错误' },
          { status: 401 }
        )
      }
    }

    // 哈希新密码
    const salt = await bcrypt.genSalt(10)
    const newHash = await bcrypt.hash(new_password, salt)

    // 更新密码
    const { error: updateError } = await supabase
      .from('memberships')
      .update({
        password_hash: newHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', membership.id)

    if (updateError) {
      console.error('[设置密码] 更新失败:', updateError)
      return NextResponse.json(
        { error: '密码设置失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '密码设置成功'
    })

  } catch (error) {
    console.error('[设置密码失败]', error)
    return NextResponse.json(
      { error: '服务器内部错误', message: error.message },
      { status: 500 }
    )
  }
}
