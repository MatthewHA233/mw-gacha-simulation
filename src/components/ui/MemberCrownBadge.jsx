'use client'

import { MemberCrownIcon } from './AchievementIcon'
import { CROWN_TIER_NAMES } from '../../utils/crownTier'

/**
 * 顶栏的「会员王冠 + 剩余天数」（2026-10-15）：王冠按彩蛋档位换图，剩余天数的字色也跟着档位变。
 * 顶栏和 /test/toasts 展示页共用这一个组件，展示页看到的就是线上的样子。
 */
const DAYS_TONE = {
  0: 'text-orange-300/85',
  200000: 'text-pink-300',
  500000: 'text-amber-200',
  1000000: 'text-yellow-300 font-bold',
}

export function MemberCrownBadge({ tier = 0, remainingDays = 0 }) {
  return (
    <span className="flex items-center gap-0.5 md:gap-1.5" title={CROWN_TIER_NAMES[tier]}>
      <span className={`flex shrink-0 ${tier === 1000000 ? 'crown-king' : ''}`}>
        <MemberCrownIcon tier={tier} className="w-5 h-5 md:w-7 md:h-7" />
      </span>
      {remainingDays > 0 && (
        <span className={`text-[8px] md:text-[10px] font-mono ${DAYS_TONE[tier] || DAYS_TONE[0]}`}>
          剩余 {remainingDays} 天
        </span>
      )}
    </span>
  )
}
