import { SquareItem } from '../SquareItem'

/**
 * 旗舰宝箱物品展示栏组件
 * 3列 x 5行布局（移动端4行），按概率从低到高排序
 */
export function LootboxItemGrid({ items, isScrolling = false }) {
  // 按概率从低到高排序（稀有物品在前）
  const sortedItems = [...items].sort((a, b) => a.probability - b.probability)

  return (
    <div
      className="flex flex-col gap-3 transition-opacity duration-500"
      style={{
        opacity: isScrolling ? 0 : 1
      }}
    >
      {/* 标题 */}
      <div className="text-center">
        <h3 className="text-base font-bold text-white/90">
          抽奖奖品列表
        </h3>
        <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mt-2" />
      </div>

      {/* 物品网格 - 静默滚动，增加顶部和左侧内边距防止溢出 */}
      <div
        className="grid grid-cols-3 gap-2 pr-1 pt-4 pl-2 overflow-y-auto scrollbar-hide max-h-[calc(4*(80px+8px)+16px)] md:max-h-[calc(5*(80px+8px)+16px)]"
      >
        {sortedItems.map((item, index) => (
          <SquareItem
            key={`${item.id}-${index}`}
            item={item}
            size={80}
            index={index}
            disableHover={true}
          />
        ))}
      </div>

      {/* 物品总数提示 */}
      <div className="text-center text-[10px] text-white/50">
        共 {sortedItems.length} 种奖品
      </div>
    </div>
  )
}
