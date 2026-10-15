/**
 * GET  /api/admin/gift-codes  — 管理员赠送的兑换码列表
 * POST /api/admin/gift-codes  — 生成一张一个月的兑换码 { note }（自己用或送人）
 *
 * 只有管理员能调（服务端校验，见 lib/admin/adminAuth.js）。
 *
 * 不算收入（2026-10-15 号主定）：赠送码照样在 payment_orders 记一条，便于后台列出来，
 * 但 order_type='gift'、amount=0、status='gifted'。收入统计 admin_revenue_stats 和交易流水都只认
 * status='paid'，所以既不进收入，也不进订单笔数、客单价和各种分布图。兑换码本身和付费月卡完全一样：
 * memberships 一条 is_active、30 天、total_spent_cents=0，登录、叠加都照常；有效期从生成时开始算。
 */

import { NextResponse } from 'next/server'
import { getSupabase } from '@lib/supabase/serverClient'
import { requireAdmin } from '@lib/admin/adminAuth'
import { generateUniqueActivationCode } from '@lib/membership/activationCode'

const GIFT_DAYS = 30
const NOTE_MAX = 60
const LIST_LIMIT = 200

function giftOrderNo() {
  return `GIFT${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

async function authorize(request) {
  const supabase = getSupabase()
  if (!supabase) return { response: NextResponse.json({ error: 'Supabase 未配置' }, { status: 503 }) }
  const auth = await requireAdmin(request, supabase)
  if (!auth.ok) return { response: NextResponse.json({ error: auth.error }, { status: auth.status }) }
  return { supabase, auth }
}

export async function GET(request) {
  try {
    const { supabase, response } = await authorize(request)
    if (response) return response

    const { data: orders, error } = await supabase
      .from('payment_orders')
      .select('out_trade_no, activation_code, membership_id, description, duration_days, created_at')
      .eq('order_type', 'gift')
      .order('created_at', { ascending: false })
      .limit(LIST_LIMIT)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const ids = (orders || []).map((o) => o.membership_id).filter(Boolean)
    const { data: memberships, error: memError } = ids.length
      ? await supabase.from('memberships').select('id, membership_expire_at, devices, user_id').in('id', ids)
      : { data: [], error: null }
    if (memError) return NextResponse.json({ error: memError.message }, { status: 500 })

    const byId = new Map((memberships || []).map((m) => [m.id, m]))
    const gifts = (orders || []).map((o) => {
      const m = byId.get(o.membership_id) || {}
      return {
        order_no: o.out_trade_no,
        code: o.activation_code,
        note: o.description || '',
        duration_days: o.duration_days,
        created_at: o.created_at,
        expire_at: m.membership_expire_at || null,
        device_count: Array.isArray(m.devices) ? m.devices.length : 0,
        bound: !!m.user_id,
      }
    })
    return NextResponse.json({ gifts })
  } catch (err) {
    console.error('[Admin GiftCodes GET]', err)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { supabase, auth, response } = await authorize(request)
    if (response) return response

    const body = await request.json().catch(() => ({}))
    const note = String(body?.note || '').trim().slice(0, NOTE_MAX)

    const code = await generateUniqueActivationCode(supabase)
    if (!code) return NextResponse.json({ error: '兑换码生成失败，请重试' }, { status: 500 })

    const now = new Date()
    const expireAt = new Date(now.getTime() + GIFT_DAYS * 86400000)

    const { data: membership, error: memError } = await supabase
      .from('memberships')
      .insert({
        activation_code: code,
        is_active: true,
        membership_type: 'monthly',
        membership_start_at: now.toISOString(),
        membership_expire_at: expireAt.toISOString(),
        total_spent_cents: 0,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select('id')
      .single()
    if (memError) return NextResponse.json({ error: memError.message }, { status: 500 })

    const orderNo = giftOrderNo()
    const { error: orderError } = await supabase
      .from('payment_orders')
      .insert({
        out_trade_no: orderNo,
        order_type: 'gift',
        membership_type: 'monthly',
        duration_days: GIFT_DAYS,
        activation_code: code,
        membership_id: membership.id,
        amount: 0,
        description: note,
        pay_type: 'gift',
        status: 'gifted',
        metadata: { granted_by: auth.loginId },
      })
    if (orderError) {
      // 记录没写成就把码收回，免得出现一张后台列表里看不到的会员
      await supabase.from('memberships').delete().eq('id', membership.id)
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    // 审计记录与付费开通一致（价格 0）；写不进去不影响兑换码本身
    const { error: subError } = await supabase.from('subscriptions').insert({
      membership_id: membership.id,
      subscription_type: 'monthly',
      price_cents: 0,
      duration_days: GIFT_DAYS,
      activated_at: now.toISOString(),
    })
    if (subError) console.error('[Admin GiftCodes POST] subscriptions 审计记录写入失败', subError.message)

    return NextResponse.json({
      gift: {
        order_no: orderNo,
        code,
        note,
        duration_days: GIFT_DAYS,
        created_at: now.toISOString(),
        expire_at: expireAt.toISOString(),
        device_count: 0,
        bound: false,
      },
    })
  } catch (err) {
    console.error('[Admin GiftCodes POST]', err)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
