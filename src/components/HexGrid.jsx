'use client'

import { HexItem } from './HexItem';

export const HexGrid = ({ items, onItemClick, highlightedItemName }) => {
  // 定义尺寸范围
  const MIN_SIZE = 60;    // 最小尺寸（最常见的物品）
  const MAX_SIZE = 130;   // 最大尺寸（最稀有的物品）
  const MID_SIZE = (MIN_SIZE + MAX_SIZE) / 2;  // 概率缺失时的中性尺寸

  // 概率范围只依赖 items，提取到循环外计算一次
  // 只统计 > 0 的概率：部分早期活动的配置没有概率数据（全为 0），
  // Math.log(0) === -Infinity 会让归一化算出 NaN，导致六边形塌成 0 尺寸重叠
  const validProbs = items.map(item => item.probability).filter(p => p > 0);
  const minProb = validProbs.length ? Math.min(...validProbs) : 0;
  const maxProb = validProbs.length ? Math.max(...validProbs) : 0;

  // 根据概率计算六边形大小（对数映射）
  const calculateSize = (probability) => {
    // 无概率数据，或所有物品概率相同（分母为 0）时，统一用中性尺寸
    if (!(probability > 0) || !validProbs.length || minProb === maxProb) {
      return MID_SIZE;
    }

    // 使用对数映射，因为概率跨度很大（0.08% 到 33%）
    // 归一化到 0-1，然后反转（概率低 -> 尺寸大）
    const normalized = 1 - (Math.log(probability) - Math.log(minProb)) / (Math.log(maxProb) - Math.log(minProb));

    // 映射到尺寸范围
    return MIN_SIZE + normalized * (MAX_SIZE - MIN_SIZE);
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
