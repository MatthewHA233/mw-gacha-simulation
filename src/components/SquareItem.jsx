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
  disableHover = false, // 禁用 hover 放大效果
}) => {
  const { rarity = 'common', limit = 0, obtained = 0, tier, type, name, probability } = item;
  const colors = RARITY_COLORS[rarity];

  // 光晕颜色
  const glowColor = rarity === 'legendary' ? '#a280d2' : rarity === 'epic' ? '#e0932e' : null;

  // 右下角三角形颜色（史诗/传说专属）
  const triangleColor = rarity === 'legendary' ? '#a280d2' : rarity === 'epic' ? '#e0932e' : null;

  // 提示框状态（只对传说/史诗生效）
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef(null);
  const isEpicOrLegendary = rarity === 'epic' || rarity === 'legendary';

  // 从名称中提取单位数量
  const getQuantity = () => {
    // 安全检查：如果 name 不存在，返回 null
    if (!name) return null;

    // 特殊处理：美金直接去掉" 美金"后缀，显示数字部分
    if (name.endsWith('美金')) {
      return name.replace(/\s美金$/, '');
    }

    // 普通情况：提取开头的数字
    const match = name.match(/^(\d+)\s/);
    return match ? parseInt(match[1]) : null;
  };

  const quantity = getQuantity();

  // 判断是否已抽完
  const isSoldOut = limit > 0 && obtained >= limit;

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
    if (type === '涂装' || type === '旗帜' || type === '头像') return 'max-w-[65%] max-h-[65%]';
    if (type === '资源' || type === '道具') return 'max-w-[70%] max-h-[70%]';
    return 'w-full h-full'; // 战舰、武器、鱼雷、导弹、称号等其他类型
  };

  // 等比例缩放计算（基准 size=120）
  const scale = size / 120;
  const borderWidth = Math.max(1, Math.round(2 * scale)); // 边框粗细
  const padding = Math.max(2, Math.round(4 * scale)); // 内边距
  const cornerOffset = Math.max(1, Math.round(3 * scale)); // 角落偏移（更紧贴）
  const bottomOffset = Math.max(0, Math.round(1 * scale)); // 底部偏移（刻意缩小）
  const quantityFontSize = Math.max(10, Math.round(14 * scale)); // 数量字体
  const drawNumberFontSize = Math.max(14, Math.round(24 * scale)); // 抽数字体
  const tooltipFontSize = Math.max(8, Math.round(12 * scale)); // 提示框字体

  return (
    <motion.div
      className="relative select-none cursor-pointer"
      style={{
        width: size,
        height: size,
        backgroundColor: colors.bg,
        border: `${borderWidth}px solid ${colors.border}`,
      }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={disableHover ? {} : { scale: 1.05 }}
      onClick={handleClick}
      onMouseEnter={() => isEpicOrLegendary && setShowTooltip(true)}
      onMouseLeave={() => isEpicOrLegendary && setShowTooltip(false)}
    >
      {/* 内容层 */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ padding: `${padding}px` }}
      >
        {/* 图标主体 */}
        {item.icon ? (
          <img
            src={item.icon}
            alt={item.name}
            className={`${getIconSize()} object-contain`}
            draggable={false}
          />
        ) : (
          <div style={{ fontSize: `${Math.round(30 * scale)}px` }}>🎁</div>
        )}
      </div>

      {/* 变暗遮罩（抽完时） */}
      {isSoldOut && (
        <>
          <div
            className="absolute inset-0 bg-black/70 z-20"
          />

          {/* 绿色成功勾选图标 */}
          <div className="absolute inset-0 flex items-center justify-center z-30">
            <motion.svg
              viewBox="0 0 50 50"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.1
              }}
              style={{ width: size * 0.45, height: size * 0.45 }}
            >
              {/* 外发光圆环 */}
              <circle
                cx="25"
                cy="25"
                r="23"
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                className="drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
              />

              {/* 主圆环边框 */}
              <motion.circle
                cx="25"
                cy="25"
                r="23"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              />

              {/* 勾选图标 */}
              <motion.path
                d="M15 25 L22 32 L35 18"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.25 }}
              />
            </motion.svg>
          </div>
        </>
      )}

      {/* 左上角：限量进度 */}
      {limit > 0 && (
        <div
          className="absolute font-bold text-white z-10"
          style={{
            left: `${cornerOffset}px`,
            top: `${cornerOffset}px`,
            fontSize: `${quantityFontSize}px`,
          }}
        >
          {Math.max(limit - obtained, 0)}/{limit}
        </div>
      )}

      {/* 右上角：单位数量 */}
      {quantity && (
        <div
          className="absolute font-bold text-white"
          style={{
            right: `${cornerOffset}px`,
            top: `${cornerOffset}px`,
            fontSize: `${quantityFontSize}px`,
          }}
        >
          ×{quantity}
        </div>
      )}

      {/* 右下角三角形装饰（史诗/传说专属） */}
      {triangleColor && (
        <div
          className="absolute right-0 bottom-0 z-0"
          style={{
            width: `${Math.round(35 * scale)}px`,
            height: `${Math.round(35 * scale)}px`,
            background: `linear-gradient(135deg, ${triangleColor}40 0%, ${triangleColor} 30%, ${triangleColor} 100%)`,
            clipPath: 'polygon(100% 0%, 100% 100%, 0% 100%)',
          }}
        />
      )}

      {/* 右下角：等级标识 */}
      {tier && (
        <div
          className="absolute font-bold text-white z-10"
          style={{
            right: `${cornerOffset}px`,
            bottom: `${bottomOffset}px`,
            fontSize: `${quantityFontSize}px`,
          }}
        >
          Ⅲ
        </div>
      )}

      {/* 底部：抽数（史诗/传说专属，显示光晕） */}
      {drawNumber && glowColor && (
        <div
          className="absolute left-1/2 -translate-x-1/2 font-bold text-white pointer-events-none z-10"
          style={{
            bottom: `${bottomOffset}px`,
            fontSize: `${drawNumberFontSize}px`,
            textShadow: `0 0 ${4 * scale}px ${glowColor}, 0 0 ${8 * scale}px ${glowColor}, 0 0 ${12 * scale}px ${glowColor}`
          }}
        >
          {drawNumber}
        </div>
      )}

      {/* 提示框：类型+概率和名称（传说/史诗专属） */}
      {isEpicOrLegendary && showTooltip && (
        <>
          {/* 上方：类型 + 概率 */}
          {probability && (
            <div
              className="absolute left-1/2 -translate-x-1/2 bottom-full text-white font-bold whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] z-10"
              style={{ fontSize: `${tooltipFontSize}px` }}
            >
              {type} {probability}%
            </div>
          )}
          {/* 下方：物品名称 */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full text-white font-bold whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] z-10"
            style={{ fontSize: `${tooltipFontSize}px` }}
          >
            {name}
          </div>
        </>
      )}
    </motion.div>
  );
};
