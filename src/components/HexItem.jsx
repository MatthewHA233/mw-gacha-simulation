import { motion } from 'framer-motion';

// 原版游戏颜色
const RARITY_COLORS = {
  common: {
    border: '#4b5563',    // 灰色（降低亮度）
    bg: 'rgba(30, 41, 59, 0.3)'  // 灰色毛玻璃（降低透明度）
  },
  rare: {
    border: '#2563eb',    // 蓝色（降低亮度）
    bg: 'rgba(30, 58, 138, 0.3)'  // 蓝色毛玻璃（降低透明度）
  },
  epic: {
    border: '#b8761f',    // 橙色（降低亮度）
    bg: 'rgba(224, 147, 46, 0.08)'  // 橙色毛玻璃（进一步降低透明度）
  },
  legendary: {
    border: '#7c5ca8',    // 紫色（降低亮度）
    bg: 'rgba(162, 128, 210, 0.08)'  // 紫色毛玻璃（进一步降低透明度）
  }
};

export const HexItem = ({
  item,
  size = 120,
  index = 0,
  onClick,
  isHighlighted = false,
}) => {
  const { rarity = 'common', limit = 0, obtained = 0, tier, type, name } = item;
  const colors = RARITY_COLORS[rarity];

  // 计算六边形的SVG路径点（平顶六边形）
  const hexPoints = "30,10 90,10 115,60 90,110 30,110 5,60";

  // 从名称中提取单位数量（如"4 艺术硬币"中的4）
  const getQuantity = () => {
    const match = name.match(/^(\d+)\s/);
    return match ? parseInt(match[1]) : null;
  };

  const quantity = getQuantity();

  // 判断是否已抽完
  const isSoldOut = limit > 0 && obtained >= limit;

  // 根据类型调整图标大小
  const getIconSize = () => {
    if (type === '舰船') return 'max-w-[90%] max-h-[90%]'; // 舰船放大
    if (type === '皮肤') return 'max-w-[50%] max-h-[50%]'; // 皮肤缩小
    return 'max-w-[70%] max-h-[70%]'; // 默认
  };

  return (
    <motion.div
      className="relative select-none cursor-pointer"
      style={{ width: size, height: size }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{
        opacity: 1,
        scale: isHighlighted ? 1.15 : 1
      }}
      transition={{
        delay: index * 0.05,
        scale: { duration: 0.2 }
      }}
      whileHover={{ scale: isSoldOut ? 1 : 1.05 }}
      onClick={onClick}
    >
      {/* SVG六边形 */}
      <svg width={size} height={size} viewBox="0 0 120 120" className="absolute inset-0">
        {/* 高亮发光效果 */}
        {isHighlighted && (
          <polygon
            points={hexPoints}
            fill="none"
            stroke="#ffd700"
            strokeWidth="6"
            className="drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]"
          />
        )}
        {/* 六边形背景（毛玻璃效果） */}
        <polygon
          points={hexPoints}
          fill={colors.bg}
          className="backdrop-blur-md"
        />
        {/* 六边形边框 */}
        <polygon
          points={hexPoints}
          fill="none"
          stroke={isHighlighted ? '#ffd700' : colors.border}
          strokeWidth={isHighlighted ? "4" : "2"}
        />
      </svg>

      {/* 变暗遮罩（抽完时） */}
      {isSoldOut && (
        <svg width={size} height={size} viewBox="0 0 120 120" className="absolute inset-0">
          <polygon
            points={hexPoints}
            fill="rgba(0, 0, 0, 0.7)"
          />
        </svg>
      )}

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

      {/* 上边左侧：限量进度（紧贴上边） */}
      {limit > 0 && (
        <div className="absolute left-[25%] top-[8%] text-sm font-bold text-white">
          {Math.max(limit - obtained, 0)}/{limit}
        </div>
      )}

      {/* 上边右侧：单位数量（紧贴上边） */}
      {quantity && (
        <div className="absolute right-[25%] top-[8%] text-sm font-bold text-white">
          ×{quantity}
        </div>
      )}

      {/* 下边中间：已获得数量（紧贴下边） */}
      {obtained > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[8%] text-xs font-bold text-green-400">
          {obtained}
        </div>
      )}

      {/* 下边右侧：等级标识（紧贴下边） */}
      {tier && (
        <div className="absolute right-[25%] bottom-[8%] text-sm font-bold text-white">
          Ⅲ
        </div>
      )}
    </motion.div>
  );
};
