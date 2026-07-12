// MW市场幽灵会员套餐的服务端权威定价。
// 季卡/年卡先按月价与折扣计算，再四舍五入到整元，最后转成分。

export const MWMON_PERIODS = {
  month: { months: 1, duration_days: 30, discount: 1, label: '月卡' },
  quarter: { months: 3, duration_days: 90, discount: 0.9, label: '季卡' },
  year: { months: 12, duration_days: 365, discount: 0.8, label: '年卡' }
}

const TIERS = {
  silver: { monthly_yuan: 19, label: '白银会员' },
  gold: { monthly_yuan: 39, label: '黄金会员' }
}

export function getMwMonitorPlan(tier, period = 'month') {
  const tierDef = TIERS[tier]
  const periodDef = MWMON_PERIODS[period]
  if (!tierDef || !periodDef) return null

  const listPriceCents = tierDef.monthly_yuan * periodDef.months * 100
  // 用户要求折后价取整元，不保留角分。
  const price = Math.round(tierDef.monthly_yuan * periodDef.months * periodDef.discount) * 100
  return {
    tier,
    period,
    name: `${tierDef.label}·${periodDef.label}`,
    price,
    list_price: listPriceCents,
    period_discount_cents: listPriceCents - price,
    duration_days: periodDef.duration_days
  }
}

export function quoteMwMonitorPlan({ tier, period = 'month', currentTier, expiresAt, now = Date.now() }) {
  const plan = getMwMonitorPlan(tier, period)
  if (!plan) return null

  let mode = currentTier === tier ? 'renew' : 'buy'
  let amount = plan.price
  let durationDays = plan.duration_days
  let discount = null

  if (currentTier === 'silver' && tier === 'gold') {
    mode = 'upgrade'
    const remainMs = expiresAt ? new Date(expiresAt).getTime() - now : 0
    const remainDays = Math.max(0, Math.floor(remainMs / 86400000))
    const discountDays = Math.min(remainDays, 30)
    const discountCents = Math.round((discountDays / 30) * TIERS.silver.monthly_yuan * 100)
    const extraDays = Math.round(
      (Math.max(0, remainDays - 30) * TIERS.silver.monthly_yuan) / TIERS.gold.monthly_yuan
    )
    amount = plan.price - discountCents
    durationDays = plan.duration_days + extraDays
    discount = { remain_days: remainDays, discount_cents: discountCents, extra_days: extraDays }
  }

  return { ...plan, mode, amount, duration_days: durationDays, discount }
}
