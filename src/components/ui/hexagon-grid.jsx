'use client'

import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import './hexagon.css';

export const HexagonItem = ({ item, index, onClick, getRarityClass, getRarityText }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="hexagon-container"
      onClick={onClick}
    >
      <div className="hexagon-wrapper">
        <div className={cn(
          "hexagon",
          item.rarity === 'legendary' && "hexagon-legendary",
          item.rarity === 'epic' && "hexagon-epic",
          item.rarity === 'rare' && "hexagon-rare",
          item.rarity === 'common' && "hexagon-common"
        )}>
          <div className="hexagon-inner">
            <div className="hexagon-content">
              {/* 物品图标/图片区域 */}
              <div className="hexagon-icon">
                {item.icon ? (
                  <img src={item.icon} alt={item.name} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-4xl">🎁</div>
                )}
              </div>

              {/* 物品名称 */}
              <div className="hexagon-name text-xs font-bold text-white mt-1 text-center truncate px-2">
                {item.name}
              </div>

              {/* 稀有度标签 */}
              <div className={cn("hexagon-rarity text-[10px] px-2 py-0.5 rounded-full mt-1", getRarityClass(item.rarity))}>
                {getRarityText(item.rarity)}
              </div>

              {/* 概率显示 */}
              {item.probability && (
                <div className="text-[10px] text-cyan-400 mt-1">
                  {item.probability.toFixed(2)}%
                </div>
              )}

              {/* 限量标识 */}
              {item.limit > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full z-10">
                  {item.limit - item.obtained}/{item.limit}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const HexagonGrid = ({ items, getRarityClass, getRarityText, onItemClick }) => {
  return (
    <div className="hexagon-grid">
      {items.map((item, index) => (
        <HexagonItem
          key={index}
          item={item}
          index={index}
          onClick={() => onItemClick && onItemClick(item)}
          getRarityClass={getRarityClass}
          getRarityText={getRarityText}
        />
      ))}
    </div>
  );
};
