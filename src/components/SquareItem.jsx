import { motion } from 'framer-motion';

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
}) => {
  const { rarity = 'common', limit = 0, obtained = 0, tier, type, name } = item;
  const colors = RARITY_COLORS[rarity];

  // 从名称中提取单位数量（如"4 艺术硬币"中的4）
  const getQuantity = () => {
    const match = name.match(/^(\d+)\s/);
    return match ? parseInt(match[1]) : null;
  };

  const quantity = getQuantity();

  // 根据类型调整图标大小
  const getIconSize = () => {
    if (type === '舰船') return 'max-w-[90%] max-h-[90%]';
    if (type === '皮肤') return 'max-w-[50%] max-h-[50%]';
    return 'max-w-[70%] max-h-[70%]';
  };

  return (
    <motion.div
      className="relative select-none cursor-pointer rounded-lg overflow-hidden"
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
      onClick={onClick}
    >
      {/* 内容层 */}
      <div className="absolute inset-0 flex items-center justify-center p-3">
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
    </motion.div>
  );
};
