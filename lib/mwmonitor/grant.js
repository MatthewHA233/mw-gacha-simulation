/**
 * MW市场幽灵 会员发货：支付成功后用自建 Supabase(supabase.lingflow.cn) 的 service_role
 * 调 mw.grant_membership RPC 直接开通/续费(无激活码)。
 *
 * 环境变量(本地 .env + Vercel 都要配):
 * - MWMON_SUPABASE_URL          自建 Supabase 地址, 如 https://supabase.lingflow.cn
 * - MWMON_SUPABASE_SERVICE_KEY  自建实例的 service_role key(服务器 /opt/supabase/docker/.env 里的 SERVICE_ROLE_KEY)
 */

// 下单前探查用户当前有效等级/到期(服务端权威计算续费/升级差价用)
export async function peekMwMonitorProfile(user_id) {
  const url = process.env.MWMON_SUPABASE_URL
  const key = process.env.MWMON_SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('MWMON_SUPABASE_URL / MWMON_SUPABASE_SERVICE_KEY 未配置')
  const resp = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/peek_profile`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Profile': 'mw',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_user_id: user_id })
  })
  const text = await resp.text()
  if (!resp.ok) throw new Error(`peek_profile ${resp.status}: ${text.slice(0, 200)}`)
  return JSON.parse(text) // { tier, expires_at }
}

export async function grantMwMonitorMembership({ user_id, tier, duration_days, out_trade_no, amount_cents = null }) {
  const url = process.env.MWMON_SUPABASE_URL
  const key = process.env.MWMON_SUPABASE_SERVICE_KEY
  if (!url || !key) {
    throw new Error('MWMON_SUPABASE_URL / MWMON_SUPABASE_SERVICE_KEY 未配置')
  }

  const resp = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/grant_membership`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Profile': 'mw',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_user_id: user_id,
      p_tier: tier,
      p_days: duration_days,
      p_order_no: out_trade_no,
      p_amount_cents: amount_cents
    })
  })

  const text = await resp.text()
  if (!resp.ok) {
    throw new Error(`grant_membership ${resp.status}: ${text.slice(0, 300)}`)
  }
  return JSON.parse(text) // { tier, expires_at, order_no }
}
