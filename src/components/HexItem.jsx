'use client'

import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

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
  const { rarity = 'common', limit = 0, obtained = 0, tier, type, name, probability } = item;
  const colors = RARITY_COLORS[rarity];

  // 超稀有判定（概率 < 0.01%）
  const isUltraRare = probability != null && probability < 0.01;

  // 提示框状态（所有物品都支持）
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef(null);

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

    if (onClick) {
      onClick(e);
    }
  };

  // 根据类型调整图标大小
  const getIconSize = () => {
    if (type === '战舰') return 'max-w-[90%] max-h-[90%]'; // 战舰放大
    if (type === '涂装' || type === '旗帜' || type === '头像') return 'max-w-[50%] max-h-[50%]'; // 涂装、旗帜、头像缩小
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
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
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
        {/* 超稀有旋转彩虹描边 */}
        {isUltraRare && !isSoldOut && (
          <>
            <defs>
              <linearGradient id={`ultra-rare-grad-${index}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="120" y2="120">
                <stop offset="0%">
                  <animate attributeName="stop-color" values="#ff2d2d;#ff7f00;#ffd700;#00e68a;#00bfff;#a855f7;#ff2d2d" dur="3s" repeatCount="indefinite" />
                </stop>
                <stop offset="33%">
                  <animate attributeName="stop-color" values="#ffd700;#00e68a;#00bfff;#a855f7;#ff2d2d;#ff7f00;#ffd700" dur="3s" repeatCount="indefinite" />
                </stop>
                <stop offset="67%">
                  <animate attributeName="stop-color" values="#00bfff;#a855f7;#ff2d2d;#ff7f00;#ffd700;#00e68a;#00bfff" dur="3s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%">
                  <animate attributeName="stop-color" values="#a855f7;#ff2d2d;#ff7f00;#ffd700;#00e68a;#00bfff;#a855f7" dur="3s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
            </defs>
            <polygon
              points={hexPoints}
              fill="none"
              stroke={`url(#ultra-rare-grad-${index})`}
              strokeWidth="3"
              style={{ filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.6))' }}
            />
          </>
        )}
      </svg>

      {/* 变暗遮罩（抽完时） */}
      {isSoldOut && (
        <>
          <svg width={size} height={size} viewBox="0 0 120 120" className="absolute inset-0">
            <polygon
              points={hexPoints}
              fill="rgba(0, 0, 0, 0.7)"
            />
          </svg>

          {/* 绿色成功勾选图标 */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
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

      {/* 提示框：类型+概率和名称（所有物品） */}
      {showTooltip && (
        <>
          {/* 上方：类型 + 概率 */}
          {probability && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-[-6px] text-white text-xs font-bold whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {type} {probability}%
            </div>
          )}
          {/* 下方：物品名称 */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-[-6px] text-white text-xs font-bold whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {name}
          </div>
        </>
      )}
    </motion.div>
  );
};
