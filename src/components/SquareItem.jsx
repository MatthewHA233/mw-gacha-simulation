import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

// 原版游戏颜色
const RARITY_COLORS = {
  common: {
    border: '#4b5563',
    bg: 'rgba(30, 41, 59, 0.3)'
  },
  rare: {
    border: '#2563eb',
    bg: 'rgba(30, 58, 138, 0.3)'
  },
  epic: {
    border: '#b8761f',
    bg: 'rgba(224, 147, 46, 0.08)'
  },
  legendary: {
    border: '#7c5ca8',
    bg: 'rgba(162, 128, 210, 0.08)'
  }
};

export const SquareItem = ({
  item,
  size = 120,
  index = 0,
  onClick,
  drawNumber, // 第几抽获得的（可选）
}) => {
  const { rarity = 'common', limit = 0, obtained = 0, tier, type, name, probability } = item;
  const colors = RARITY_COLORS[rarity];

  // 光晕颜色
  const glowColor = rarity === 'legendary' ? '#a280d2' : rarity === 'epic' ? '#e0932e' : null;

  // 提示框状态（只对传奇/史诗生效）
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef(null);
  const isEpicOrLegendary = rarity === 'epic' || rarity === 'legendary';

  // 从名称中提取单位数量（如"4 艺术硬币"中的4）
  const getQuantity = () => {
    const match = name.match(/^(\d+)\s/);
    return match ? parseInt(match[1]) : null;
  };

  const quantity = getQuantity();

  // 清除定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // 处理点击（手机端）
  const handleClick = (e) => {
    if (isEpicOrLegendary) {
      e.stopPropagation();
      setShowTooltip(true);

      // 清除之前的定时器
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // 5秒后自动隐藏
      timerRef.current = setTimeout(() => {
        setShowTooltip(false);
      }, 5000);
    }

    if (onClick) {
      onClick(e);
    }
  };

  // 根据类型调整图标大小
  const getIconSize = () => {
    if (type === '舰船') return 'max-w-[90%] max-h-[90%]';
    if (type === '皮肤') return 'max-w-[50%] max-h-[50%]';
    return 'max-w-[70%] max-h-[70%]';
  };

  return (
    <motion.div
      className="relative select-none cursor-pointer rounded-lg"
      style={{
        width: size,
        height: size,
        backgroundColor: colors.bg,
        border: `2px solid ${colors.border}`,
      }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.05 }}
      onClick={handleClick}
      onMouseEnter={() => isEpicOrLegendary && setShowTooltip(true)}
      onMouseLeave={() => isEpicOrLegendary && setShowTooltip(false)}
    >
      {/* 内容层 */}
      <div className="absolute inset-0 flex items-center justify-center p-3 overflow-hidden rounded-lg">
        {/* 图标主体 */}
        {item.icon ? (
          <img
            src={item.icon}
            alt={item.name}
            className={`${getIconSize()} object-contain`}
            draggable={false}
          />
        ) : (
          <div className="text-3xl">🎁</div>
        )}
      </div>

      {/* 右上角：单位数量 */}
      {quantity && (
        <div className="absolute right-2 top-2 text-sm font-bold text-white">
          ×{quantity}
        </div>
      )}

      {/* 右下角：等级标识 */}
      {tier && (
        <div className="absolute right-2 bottom-2 text-sm font-bold text-white">
          Ⅲ
        </div>
      )}

      {/* 底部：抽数（史诗/传奇专属，显示光晕） */}
      {drawNumber && glowColor && (
        <div
          className="absolute left-1/2 bottom-2 -translate-x-1/2 text-xl md:text-2xl font-bold text-white pointer-events-none"
          style={{
            textShadow: `0 0 8px ${glowColor}, 0 0 16px ${glowColor}, 0 0 24px ${glowColor}`
          }}
        >
          {drawNumber}
        </div>
      )}

      {/* 提示框：概率和名称（传奇/史诗专属） */}
      {isEpicOrLegendary && showTooltip && (
        <>
          {/* 上方：概率 */}
          {probability && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full text-white text-xs font-bold whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] z-10">
              {probability}%
            </div>
          )}
          {/* 下方：物品名称 */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full text-white text-xs font-bold whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] z-10">
            {name}
          </div>
        </>
      )}
    </motion.div>
  );
};
