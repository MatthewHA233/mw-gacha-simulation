import { buildLootboxTicketUrl } from '../../services/cdnService'

/**
 * 旗舰宝箱选择器组件
 * 显示4个宝箱选项（2x2布局）
 */
export function LootboxSelector({ activityId, selectedType, onSelect, isScrolling = false }) {
  const lootboxes = [
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
      type: 'event_common',
      label: '宝箱',
      disabled: false,
    },
    {
      type: 'event_premium',
      label: '旗舰宝箱',
      disabled: false,
    },
  ]

  return (
    <div
      className="flex flex-col gap-4 transition-opacity duration-500"
      style={{
        opacity: isScrolling ? 0 : 1
      }}
    >
      {/* 第一排：常驻宝箱 */}
      <div className="flex gap-4">
        {lootboxes.slice(0, 2).map((lootbox) => {
          const imageUrl = buildLootboxTicketUrl(lootbox.type, activityId)
          const isSelected = selectedType === lootbox.type

          return (
            <div
              key={lootbox.type}
              className={`
                w-32 h-32 border-2 flex items-center justify-center
                transition-all cursor-not-allowed opacity-60
                ${isSelected
                  ? 'bg-[#6e6938] border-[#e7e3b9]'
                  : 'bg-transparent border-[#2b2b2d]'
                }
              `}
            >
              <img
                src={imageUrl}
                alt={lootbox.label}
                className="w-28 h-28 object-contain"
              />
            </div>
          )
        })}
      </div>

      {/* 第二排：活动宝箱 */}
      <div className="flex gap-4">
        {lootboxes.slice(2, 4).map((lootbox) => {
          const imageUrl = buildLootboxTicketUrl(lootbox.type, activityId)
          const isSelected = selectedType === lootbox.type

          return (
            <button
              key={lootbox.type}
              onClick={() => !lootbox.disabled && onSelect(lootbox.type)}
              disabled={lootbox.disabled}
              className={`
                w-32 h-32 border-2 flex items-center justify-center
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
                className="w-28 h-28 object-contain"
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
