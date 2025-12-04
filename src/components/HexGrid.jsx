'use client'

import { HexItem } from './HexItem';

export const HexGrid = ({ items, onItemClick, highlightedItemName }) => {
  // 根据概率计算六边形大小（线性映射）
  const calculateSize = (probability) => {
    // 找出所有物品的概率范围
    const probabilities = items.map(item => item.probability);
    const minProb = Math.min(...probabilities);
    const maxProb = Math.max(...probabilities);

    // 定义尺寸范围
    const minSize = 60;   // 最小尺寸（最常见的物品）
    const maxSize = 130;  // 最大尺寸（最稀有的物品）

    // 线性映射：概率越低，尺寸越大
    // 使用对数映射会更合理，因为概率跨度很大（0.08% 到 33%）
    const logProb = Math.log(probability);
    const logMin = Math.log(minProb);
    const logMax = Math.log(maxProb);

    // 归一化到 0-1，然后反转（概率低 -> 尺寸大）
    const normalized = 1 - (logProb - logMin) / (logMax - logMin);

    // 映射到尺寸范围
    return minSize + normalized * (maxSize - minSize);
  };

  // 梯形布局：3行递增 (3个 + 4个 + 8个 = 15个)
  const rowPattern = [3, 4, 8]; // 最后一行放所有小的普通物品
  const rows = [];
  let itemIndex = 0;

  for (const count of rowPattern) {
    if (itemIndex >= items.length) break;
    rows.push(items.slice(itemIndex, itemIndex + count));
    itemIndex += count;
  }

  return (
    <div className="flex flex-col gap-1 items-center">
      {rows.map((rowItems, rowIndex) => (
        <div
          key={rowIndex}
          className="flex justify-center gap-2 items-center"
        >
          {rowItems.map((item, itemIndex) => {
            const globalIndex = rows.slice(0, rowIndex).reduce((sum, r) => sum + r.length, 0) + itemIndex;
            const size = calculateSize(item.probability);
            return (
              <HexItem
                key={globalIndex}
                item={item}
                index={globalIndex}
                size={size}
                onClick={() => onItemClick && onItemClick(item)}
                isHighlighted={highlightedItemName === item.name}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};
