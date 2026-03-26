'use client'

import { buildLootboxTicketUrl } from '../../services/cdnService'

/**
 * 旗舰宝箱选择器组件
 * 显示宝箱选项
 */
export function LootboxSelector({ activityId, selectedType, onSelect, isScrolling = false, hasMediumLootbox = false }) {
  // 基础宝箱列表
  const baseLootboxes = [
    {
      type: 'common',
      label: '普通宝箱',
      disabled: true, // 常驻宝箱，不可选
    },
    {
      type: 'ad',
      label: '广告宝箱',
      disabled: true, // 常驻宝箱，不可选
    },
    {
      type: 'clan',
      label: '联队宝箱',
      disabled: true, // 常驻宝箱，不可选
    },
    {
      type: 'clan_premium',
      label: '精英联队宝箱',
      disabled: true, // 常驻宝箱，不可选
    },
    {
      type: 'clan_cosmetic',
      label: '联队装饰品宝箱',
      disabled: true, // 常驻宝箱，不可选
    },
    {
      type: 'event_common',
      label: '普通宝箱',
      disabled: false,
    },
  ]

  // 中等旗舰宝箱（仅当活动支持时显示）
  const mediumLootbox = {
    type: 'event_medium',
    label: '中等旗舰宝箱',
    disabled: false,
  }

  const premiumLootbox = {
    type: 'event_premium',
    label: '旗舰宝箱',
    disabled: false,
  }

  // 根据是否有中等旗舰宝箱组装最终列表
  const lootboxes = hasMediumLootbox
    ? [...baseLootboxes, mediumLootbox, premiumLootbox]
    : [...baseLootboxes, premiumLootbox]

  return (
    <div
      className="grid grid-cols-2 gap-2 md:gap-3 transition-opacity duration-500"
      style={{
        opacity: isScrolling ? 0 : 1
      }}
    >
      {lootboxes.map((lootbox) => {
        const imageUrl = buildLootboxTicketUrl(lootbox.type, activityId)
        const isSelected = selectedType === lootbox.type

        return (
          <button
            key={lootbox.type}
            onClick={() => !lootbox.disabled && onSelect(lootbox.type)}
            disabled={lootbox.disabled}
            className={`
              w-24 h-24 md:w-[112px] md:h-[112px] border flex items-center justify-center
              transition-all
              ${lootbox.disabled
                ? 'cursor-not-allowed opacity-60'
                : 'cursor-pointer hover:border-[#e7e3b9]/50'
              }
              ${isSelected
                ? 'bg-[#6e6938] border-[#e7e3b9]'
                : 'bg-transparent border-[#2b2b2d]'
              }
            `}
          >
            <img
              src={imageUrl}
              alt={lootbox.label}
              className="w-[88px] h-[88px] md:w-[100px] md:h-[100px] object-contain"
            />
          </button>
        )
      })}
    </div>
  )
}
