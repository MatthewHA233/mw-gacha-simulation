/**
 * 氪金里程碑的成就徽章（2026-10-15）：每个里程碑一枚，图案对应文案里的梗，外框按金额分档材质。
 *
 *   < ¥1,000          青铜    百元大钞、女仆咖啡厅、木吉他、帝王蟹、降噪耳机、迪士尼、648 船票、拍立得、演唱会
 *   ¥1,000 – 2,999    白银    健身年卡、1314、咬牙、一路发、实习大学生、Switch、快四个 648
 *   ¥3,000 – 14,000   翠绿    毕业、全景相机、主机、跨栏、十连 648、钱包倒计时、五位数之壁、顶配手机、旅行
 *   ¥16,499 – 90,000  黄金    旗舰显卡、双倍喜悦、回忆杀、复古机车、冰岛极光、立式钢琴、南极企鹅、自己的马、北海道雪季
 *   ¥100,000 – 180,000 紫晶   轿车开走、间隔年、猫、帆船、一年白干、世界杯、天文台
 *   ¥200,000 – 400,000 赤红   伪神、老款 911、小飞机、独立游戏、小店
 *   ¥500,000 – 900,000 炫彩   半神、房车、深渊之眼、录取信、吊床：全息渐变外框，颜色沿边框缓慢流转
 *   100 万             王      万氪之王独一档：金框 + 流转的炫彩内圈 + 深紫底和星点
 *   （万氪之王三档 20 万 / 50 万 / 100 万直接画顶栏同款王冠 MEMBER_CROWNS，成就和顶栏看着是同一顶）
 *
 * 纯 SVG（64×64 画布），平涂 + 深色描边；只有炫彩 / 王两档的外框用渐变。任何尺寸都清晰、不用传 CDN。
 */

import { useId } from 'react'

const TIERS = {
  bronze: { base: '#4a2f20', panel: '#7d5136', rim: '#e9ae7a', ink: '#ffeedd', accent: '#ff9f5a' },
  silver: { base: '#2f3a4a', panel: '#56667d', rim: '#dfe8f4', ink: '#f6faff', accent: '#8fd0ff' },
  jade: { base: '#0f3326', panel: '#1d5c43', rim: '#7ff0b8', ink: '#eafff4', accent: '#ffd166' },
  gold: { base: '#3a2a07', panel: '#634a10', rim: '#ffd86b', ink: '#fff6da', accent: '#ffc83d' },
  violet: { base: '#23183f', panel: '#4a3485', rim: '#d4c0ff', ink: '#f5efff', accent: '#ff86d6' },
  red: { base: '#3a0d14', panel: '#7d1d2c', rim: '#ff9b9b', ink: '#fff0ee', accent: '#ffcf4a' },
  // 炫彩 / 王：rim 是给卡片边框、倒计时线用的代表色，徽章外框实际画 holo 渐变
  prism: { base: '#1e1636', panel: '#35285c', rim: '#d9b8ff', ink: '#f7f2ff', accent: '#ff86d6',
    holo: ['#ff8fd8', '#b79bff', '#7fd8ff', '#8ff0c0', '#ffe08a'], panelStops: ['#41306e', '#263a66', '#43265a'] },
  king: { base: '#170d22', panel: '#2a1840', rim: '#ffd86b', ink: '#fff6da', accent: '#ffcf4a',
    holo: ['#ff8fd8', '#b79bff', '#7fd8ff', '#8ff0c0', '#ffe08a'], gold: ['#fff6d6', '#ffd86b', '#d9961f'] },
}

export function achievementTier(amount) {
  if (amount < 1000) return 'bronze'
  if (amount < 3000) return 'silver'
  if (amount < 16499) return 'jade'
  if (amount < 100000) return 'gold'
  if (amount < 200000) return 'violet'
  if (amount < 500000) return 'red'      // 20～40 万
  if (amount < 1000000) return 'prism'   // 50～90 万
  return 'king'                          // 100 万：万氪之王独一档
}

export function achievementRim(amount) {
  return TIERS[achievementTier(amount)].rim
}

// 阿基米德螺旋：从圆心转 turns 圈到半径 r（sx / sy 可压成椭圆）
function spiralPath(cx, cy, r, turns, sx = 1, sy = 1, phase = 0) {
  const total = turns * Math.PI * 2
  const points = []
  for (let t = 0; t <= total; t += 0.18) {
    const radius = (r * t) / total
    points.push(`${(cx + Math.cos(t + phase) * radius * sx).toFixed(2)} ${(cy + Math.sin(t + phase) * radius * sy).toFixed(2)}`)
  }
  return `M${points.join('L')}`
}

// 船票（648 / 2500 共用）
function Ticket({ c, label = '648', x = 0, y = 0, s = 1, r = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r} 32 33) translate(32 33) scale(${s}) translate(-32 -33)`}>
      <path
        d="M13 20H51a3 3 0 0 1 3 3V29a4 4 0 0 0 0 8V43a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V37a4 4 0 0 0 0-8V23a3 3 0 0 1 3-3Z"
        fill={c.ink} stroke={c.base} strokeWidth="2" strokeLinejoin="round"
      />
      <line x1="22" y1="23" x2="22" y2="43" stroke={c.base} strokeWidth="1.5" strokeDasharray="2 2" opacity="0.55" />
      <circle cx="16" cy="33" r="2.6" fill={c.accent} />
      <text x="38.5" y="37.5" textAnchor="middle" fontSize="12" fontWeight="800" fill={c.base} fontFamily="system-ui, sans-serif">{label}</text>
    </g>
  )
}

function Bricks({ c, x = 0, y = 0, opacity = 1 }) {
  const rows = [
    [[10, 16], [26, 16], [42, 12]],
    [[10, 8], [18, 16], [34, 16], [50, 4]],
    [[10, 16], [26, 16], [42, 12]],
    [[10, 8], [18, 16], [34, 16], [50, 4]],
  ]
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      {rows.map((row, i) => row.map(([bx, w]) => (
        <rect key={`${i}-${bx}`} x={bx} y={18 + i * 8} width={w} height={8} rx="1" fill={c.ink} stroke={c.base} strokeWidth="1.6" />
      )))}
    </g>
  )
}

// 万氪之王三档：直接用顶栏同款王冠（MEMBER_CROWNS），缩进徽章面板里
const memberCrownArt = (tier) => () => (
  <g transform="translate(32 33) scale(0.78) translate(-32 -30)">{MEMBER_CROWNS[tier]()}</g>
)

const ART = {
  // 全场最靓的仔：聚光灯下、躺在地上闪闪发光的百元大钞
  100: (c) => (
    <g>
      <path d="M24 6H40L54 50H10Z" fill="#fff6da" opacity="0.13" />
      <ellipse cx="32" cy="50" rx="23" ry="5" fill={c.base} opacity="0.55" />
      <g transform="rotate(-8 32 40)">
        <rect x="11" y="31" width="42" height="19" rx="2" fill="#ff5f5f" stroke={c.base} strokeWidth="2" />
        <rect x="14" y="34" width="36" height="13" rx="1" fill="none" stroke="#ffd2d2" strokeWidth="1" opacity="0.8" />
        <circle cx="22" cy="40.5" r="4.2" fill="#ffd2d2" stroke={c.base} strokeWidth="1" />
        <text x="46" y="45" textAnchor="end" fontSize="9" fontWeight="900" fill="#fff6da" fontFamily="system-ui, sans-serif">100</text>
      </g>
      {[[13, 24, 4], [49, 22, 5], [55, 38, 3]].map(([x, y, r]) => (
        <path key={x} d={`M${x} ${y - r}Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y}Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r}Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y}Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z`} fill="#fff6da" />
      ))}
    </g>
  ),
  // 帝王蟹自由：一只张牙舞爪的帝王蟹
  328: (c) => (
    <g stroke={c.base} strokeLinejoin="round">
      {[-1, 1].map((side) => (
        <g key={side} transform={side < 0 ? '' : 'translate(64 0) scale(-1 1)'}>
          <path d="M20 40L9 44L5 52M21 43L12 49L10 56M24 45L18 52L18 58" fill="none" stroke="#e8553c" strokeWidth="3" strokeLinecap="round" />
          <path d="M20 35L12 27L10 17" fill="none" stroke="#e8553c" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M10 18Q4 14 7 8Q12 6 14 11L12 14L16 13Q17 18 10 18Z" fill="#ff7a52" strokeWidth="1.6" />
          <path d="M26 24V17" stroke={c.ink} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="26" cy="16" r="2.4" fill={c.ink} strokeWidth="1.2" />
          <circle cx="26.5" cy="16" r="1" fill={c.base} stroke="none" />
        </g>
      ))}
      <path d="M17 36Q17 23 32 23Q47 23 47 36Q47 46 32 46Q17 46 17 36Z" fill="#ff7a52" strokeWidth="2" />
      <path d="M23 31q3 2 2 5M41 31q-3 2-2 5M32 28v4" fill="none" stroke="#c43c26" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="27" cy="38" r="1.4" fill="#ffd2c4" stroke="none" /><circle cx="37" cy="38" r="1.4" fill="#ffd2c4" stroke="none" />
    </g>
  ),
  // 没去成的迪士尼：粉蓝尖顶的城堡 + 两朵烟花（不画米奇等商标形象）
  500: (c) => (
    <g>
      {[[16, 12, '#ffd86b', 6], [48, 10, '#ff94dc', 5]].map(([x, y, color, r]) => (
        <g key={x}>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2
            return <line key={i} x1={x + Math.cos(a) * r * 0.45} y1={y + Math.sin(a) * r * 0.45} x2={x + Math.cos(a) * r} y2={y + Math.sin(a) * r}
              stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          })}
        </g>
      ))}
      <rect x="12" y="38" width="40" height="17" fill={c.ink} stroke={c.base} strokeWidth="2" />
      <rect x="15" y="30" width="8" height="25" fill={c.ink} stroke={c.base} strokeWidth="1.8" />
      <rect x="41" y="30" width="8" height="25" fill={c.ink} stroke={c.base} strokeWidth="1.8" />
      <rect x="26" y="22" width="12" height="33" fill={c.ink} stroke={c.base} strokeWidth="1.8" />
      <path d="M14 31L19 19L24 31Z" fill="#7fb8ff" stroke={c.base} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M40 31L45 19L50 31Z" fill="#7fb8ff" stroke={c.base} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M25 23L32 7L39 23Z" fill="#ff94dc" stroke={c.base} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M32 7V3l4 1.5-4 1.5" fill="#ffd86b" stroke={c.base} strokeWidth="1" strokeLinejoin="round" />
      <path d="M28 55V47a4 4 0 0 1 8 0V55Z" fill={c.base} />
      <rect x="30" y="28" width="4" height="6" rx="2" fill={c.base} />
      <rect x="17.5" y="35" width="3" height="4" rx="1.5" fill={c.base} />
      <rect x="43.5" y="35" width="3" height="4" rx="1.5" fill={c.base} />
    </g>
  ),
  // 欢迎回来，主人~：女仆咖啡厅的番茄酱爱心蛋包饭 + 荷叶边女仆头饰
  150: (c) => (
    <g>
      <ellipse cx="32" cy="45" rx="26" ry="9" fill={c.ink} stroke={c.base} strokeWidth="2" />
      <ellipse cx="32" cy="44" rx="20" ry="6.5" fill="none" stroke={c.panel} strokeWidth="1.2" opacity="0.5" />
      <path d="M12 42Q12 26 32 25Q52 26 52 42Q52 47 32 47Q12 47 12 42Z" fill="#ffd34d" stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 42c-5-3.6-8-6-8-9a4 4 0 0 1 8-1.4a4 4 0 0 1 8 1.4c0 3-3 5.4-8 9Z" fill="#e8343c" stroke={c.base} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M18 33q2-4 6-5" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      {/* 女仆头饰：白色荷叶边宽带 + 下沿一道黑边 + 两端黑色小蝴蝶结 */}
      <g transform="rotate(-6 32 15)">
        <path d="M15 19Q32 9 49 19" fill="none" stroke={c.base} strokeWidth="8" strokeLinecap="round" />
        <path d="M15 19Q32 9 49 19" fill="none" stroke="#ffffff" strokeWidth="5.6" strokeLinecap="round" />
        {Array.from({ length: 9 }, (_, i) => {
          const t = i / 8
          const x = 15 + 34 * t
          const y = (1 - t) * (1 - t) * 19 + 2 * (1 - t) * t * 9 + t * t * 19 - 3.2
          return <circle key={i} cx={x} cy={y} r="2.3" fill="#ffffff" stroke={c.base} strokeWidth="1" />
        })}
        <path d="M15 21.5Q32 11.5 49 21.5" fill="none" stroke="#2a2433" strokeWidth="1.6" />
        {[[13, 20], [51, 20]].map(([x, y]) => (
          <path key={x} d={`M${x} ${y}l-4-3v6Zm0 0l4-3v6Z`} fill="#2a2433" stroke={c.base} strokeWidth="0.8" strokeLinejoin="round" />
        ))}
      </g>
    </g>
  ),
  // 那把木吉他：斜放的原木色木吉他 + 飘着的音符
  250: (c) => (
    <g>
      <path d="M11 12v9a2.6 2.6 0 1 1-1.6-2.4V12l6-1.6v7.5a2.6 2.6 0 1 1-1.6-2.4V13Z" fill={c.ink} stroke={c.base} strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M53 34v6a2.4 2.4 0 1 1-1.6-2.2V34Z" fill={c.ink} stroke={c.base} strokeWidth="0.8" strokeLinejoin="round" />
      <g transform="rotate(38 31 34)">
        <rect x="28.6" y="4" width="4.8" height="25" rx="1" fill="#6b4320" stroke={c.base} strokeWidth="1.6" />
        <rect x="27" y="0" width="8" height="7" rx="1.6" fill="#4a2f17" stroke={c.base} strokeWidth="1.6" />
        <path d="M31 27C22 27 19 33 21.5 38C17 42 18.5 54 31 54C43.5 54 45 42 40.5 38C43 33 40 27 31 27Z" fill="#e8a45a" stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
        <circle cx="31" cy="38" r="4.4" fill={c.base} />
        <circle cx="31" cy="38" r="6" fill="none" stroke="#a8683a" strokeWidth="1.1" />
        <rect x="26" y="45.5" width="10" height="2.6" rx="1" fill="#4a2f17" />
        <path d="M29.2 6V46M30.4 6V46M31.6 6V46M32.8 6V46" stroke="#fff6da" strokeWidth="0.45" opacity="0.9" />
        <path d="M24 31q3-2 6-2" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
      </g>
    </g>
  ),
  // 一副降噪耳机：头戴式耳机，两侧被「切断」的声波
  400: (c) => (
    <g>
      {[-1, 1].map((side) => (
        <g key={side} transform={side < 0 ? '' : 'translate(64 0) scale(-1 1)'}>
          <path d="M7 30q-3 5 0 10M3 27q-5 8 0 16" fill="none" stroke={c.ink} strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
          <path d="M2 31L9 39" stroke="#ff6f8e" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
      <path d="M15 36V30Q15 13 32 13Q49 13 49 30V36" fill="none" stroke={c.base} strokeWidth="7" strokeLinecap="round" />
      <path d="M15 36V30Q15 13 32 13Q49 13 49 30V36" fill="none" stroke={c.ink} strokeWidth="4" strokeLinecap="round" />
      <rect x="10" y="31" width="12" height="20" rx="5" fill={c.accent} stroke={c.base} strokeWidth="2" />
      <rect x="42" y="31" width="12" height="20" rx="5" fill={c.accent} stroke={c.base} strokeWidth="2" />
      <rect x="18.5" y="33.5" width="4" height="15" rx="2" fill={c.ink} stroke={c.base} strokeWidth="1.2" />
      <rect x="41.5" y="33.5" width="4" height="15" rx="2" fill={c.ink} stroke={c.base} strokeWidth="1.2" />
      <path d="M13 36v6" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
    </g>
  ),
  // 一台拍立得：圆角机身、大镜头、闪光灯，顶上吐出一张相片
  800: (c) => (
    <g>
      <g transform="rotate(-6 40 14)">
        <rect x="29" y="4" width="20" height="18" rx="1.5" fill="#ffffff" stroke={c.base} strokeWidth="1.6" />
        <rect x="31.5" y="6.5" width="15" height="10" fill="#7fb8ff" />
        <path d="M31.5 14l5-4 4 3 3-2 3 3v2.5h-15Z" fill="#7bd88f" />
      </g>
      <rect x="9" y="17" width="46" height="38" rx="9" fill="#ffb7d5" stroke={c.base} strokeWidth="2.2" />
      <path d="M9 26H55" stroke={c.base} strokeWidth="1.6" opacity="0.35" />
      <circle cx="32" cy="38" r="12" fill={c.ink} stroke={c.base} strokeWidth="2" />
      <circle cx="32" cy="38" r="7.5" fill="#2a2433" stroke={c.base} strokeWidth="1.4" />
      <circle cx="29.5" cy="35.5" r="2.2" fill="#ffffff" opacity="0.75" />
      <rect x="13" y="20.5" width="9" height="5" rx="1.5" fill={c.ink} stroke={c.base} strokeWidth="1.2" />
      <circle cx="49" cy="23" r="2.4" fill="#2a2433" />
      <circle cx="49" cy="47" r="2.4" fill={c.ink} stroke={c.base} strokeWidth="1" />
    </g>
  ),
  // 期待他的演唱会：舞台追光下的立式话筒 + 一张票根
  880: (c) => (
    <g>
      <path d="M6 6L28 40H20Z" fill="#fff6da" opacity="0.16" />
      <path d="M58 6L36 40H44Z" fill="#fff6da" opacity="0.16" />
      <circle cx="6" cy="6" r="3" fill="#ffd86b" stroke={c.base} strokeWidth="1.2" />
      <circle cx="58" cy="6" r="3" fill="#ffd86b" stroke={c.base} strokeWidth="1.2" />
      <g transform="rotate(14 50 42)">
        <rect x="43" y="32" width="13" height="20" rx="1.8" fill={c.ink} stroke={c.base} strokeWidth="1.4" />
        <path d="M43 39h13" stroke={c.base} strokeWidth="1" strokeDasharray="1.8 1.4" />
        <path d="M46 44h7M46 47.5h4.5" stroke={c.panel} strokeWidth="1.4" strokeLinecap="round" />
      </g>
      <path d="M31 33V52M23 55h18M31 52l-6 3M31 52l6 3" stroke={c.ink} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M27 31h8l-1 4h-6Z" fill="#2a2433" stroke={c.base} strokeWidth="1.4" strokeLinejoin="round" />
      <ellipse cx="31" cy="22" rx="7" ry="9.5" fill="#c9d3e0" stroke={c.base} strokeWidth="2" />
      <path d="M25 19h12M24.5 23h13M25 27h12M28 13.5v17M31 12.5v19M34 13.5v17" stroke="#7b8797" strokeWidth="0.9" />
      <path d="M27 16a5 5 0 0 1 3-3" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
    </g>
  ),
  // 四位数俱乐部：健身房年卡 + 哑铃
  1000: (c) => (
    <g>
      <g transform="rotate(-10 34 26)">
        <rect x="18" y="10" width="36" height="23" rx="3.5" fill="#222a36" stroke={c.base} strokeWidth="2" />
        <rect x="18" y="10" width="36" height="6" fill={c.accent} />
        <text x="23" y="29" fontSize="7" fontWeight="900" fill={c.ink} fontFamily="system-ui, sans-serif" letterSpacing="0.5">GYM 365</text>
      </g>
      <g transform="rotate(-18 32 42)">
        <rect x="14" y="40" width="36" height="4" rx="2" fill={c.ink} stroke={c.base} strokeWidth="1.4" />
        <rect x="8" y="33" width="7" height="18" rx="2" fill={c.panel} stroke={c.ink} strokeWidth="1.8" />
        <rect x="14" y="35.5" width="4" height="13" rx="1.5" fill={c.ink} stroke={c.base} strokeWidth="1.2" />
        <rect x="49" y="33" width="7" height="18" rx="2" fill={c.panel} stroke={c.ink} strokeWidth="1.8" />
        <rect x="46" y="35.5" width="4" height="13" rx="1.5" fill={c.ink} stroke={c.base} strokeWidth="1.2" />
      </g>
    </g>
  ),
  // 一台 Switch 的离去：渐行渐远的掌机
  2200: (c) => (
    <g>
      <path d="M4 26h6M3 33h8M4 40h6" stroke={c.ink} strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <rect x="13" y="20" width="10" height="26" rx="5" fill="#45c1f2" stroke={c.base} strokeWidth="2" />
      <rect x="45" y="20" width="10" height="26" rx="5" fill="#ff6a6a" stroke={c.base} strokeWidth="2" />
      <rect x="21" y="20" width="26" height="26" rx="2" fill={c.base} stroke={c.base} strokeWidth="2" />
      <rect x="24" y="23" width="20" height="20" rx="1" fill={c.ink} />
      <path d="M26 25l6 0-6 6Z" fill="#ffffff" opacity="0.7" />
      <circle cx="18" cy="27" r="2" fill={c.base} />
      <circle cx="50" cy="38" r="2" fill={c.base} />
      <circle cx="50" cy="28" r="1.3" fill={c.base} />
    </g>
  ),
  // 一台全景相机：竖长条机身、顶部鱼眼镜头、小触屏、自拍杆，外加一圈 360° 环形箭头
  3500: (c) => (
    <g>
      <path d="M14 22A20 9 0 0 1 50 22" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" />
      <path d="M50 30A20 9 0 0 1 14 30" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <path d="M47 18l3.4 4.6-5.6.6Z" fill={c.accent} />
      <rect x="31" y="44" width="2.6" height="16" rx="1.2" fill={c.panel} stroke={c.ink} strokeWidth="1" />
      <rect x="24" y="8" width="16" height="38" rx="5.5" fill="#2a2a30" stroke={c.ink} strokeWidth="2" />
      <circle cx="32" cy="17" r="6.2" fill="#3c4a5c" stroke={c.ink} strokeWidth="1.6" />
      <circle cx="32" cy="17" r="3.4" fill="#0f1218" />
      <path d="M29.6 14.8a3.2 3.2 0 0 1 2.4-1.2" fill="none" stroke="#9fe6ff" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="27" y="26.5" width="10" height="9" rx="1.5" fill="#7fb8ff" stroke={c.ink} strokeWidth="1" />
      <circle cx="32" cy="40.5" r="2" fill="#e8343c" />
    </g>
  ),
  // 经典一步：648 船票
  648: (c) => <Ticket c={c} />,
  // 一生一世：爱心 + 戒指
  1314: (c) => (
    <g>
      <path
        d="M30 47C16 38 11 30.5 11 24C11 18 15.5 14 21 14C25 14 28 16.5 30 20C32 16.5 35 14 39 14C44.5 14 49 18 49 24C49 30.5 44 38 30 47Z"
        fill="#ff6f8e" stroke={c.base} strokeWidth="2" strokeLinejoin="round"
      />
      <path d="M17 23a5 5 0 0 1 5-4" fill="none" stroke={c.ink} strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
      <circle cx="47" cy="44" r="6.5" fill="none" stroke={c.base} strokeWidth="5" />
      <circle cx="47" cy="44" r="6.5" fill="none" stroke={c.ink} strokeWidth="2.6" />
      <path d="M44 35.5h6l-3 3.6Z" fill={c.ink} stroke={c.base} strokeWidth="1.4" strokeLinejoin="round" />
    </g>
  ),
  // 咬咬牙：咬紧牙关 + 一滴汗
  1500: (c) => (
    <g>
      <circle cx="31" cy="34" r="18" fill={c.ink} stroke={c.base} strokeWidth="2" />
      <path d="M20 27l6 2.2M42 27l-6 2.2" stroke={c.base} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M21 23.5l5 1.5M41 23.5l-5 1.5" stroke={c.base} strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      <rect x="20" y="35" width="22" height="9" rx="2.5" fill="#ffffff" stroke={c.base} strokeWidth="2" />
      <path d="M20 39.5h22M25.5 35v9M31 35v9M36.5 35v9" stroke={c.base} strokeWidth="1.4" />
      <path d="M50 13q5 7 0 9.5q-5-2.5 0-9.5Z" fill={c.accent} stroke={c.base} strokeWidth="1.4" strokeLinejoin="round" />
    </g>
  ),
  // 一路发：长了翅膀飞走的钞票
  1680: (c) => (
    <g>
      <path d="M8 52l7-5M11 45l5-3.5M6 46l4-3" stroke={c.ink} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M26 27q-7-11-16-11q2 7 9 11Z" fill={c.ink} stroke={c.base} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M40 27q7-11 16-11q-2 7-9 11Z" fill={c.ink} stroke={c.base} strokeWidth="1.8" strokeLinejoin="round" />
      <g transform="rotate(-12 33 36)">
        <rect x="17" y="27" width="32" height="19" rx="2" fill={c.accent} stroke={c.base} strokeWidth="2" />
        <circle cx="33" cy="36.5" r="4.5" fill="none" stroke={c.base} strokeWidth="1.6" />
        <path d="M21 31h4M41 42h4" stroke={c.base} strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </g>
  ),
  // 任劳任怨的廉价劳动力：刚毕业的大学生实习生（学士帽、黑眼圈、汗珠、实习工牌）
  2000: (c) => (
    <g>
      <path d="M26 44L32 50L38 44" fill="none" stroke="#3c8dff" strokeWidth="2" strokeLinejoin="round" />
      <rect x="26" y="49" width="12" height="9" rx="1.5" fill={c.ink} stroke={c.base} strokeWidth="1.6" />
      <text x="32" y="56" textAnchor="middle" fontSize="5.5" fontWeight="900" fill={c.base} fontFamily="system-ui, sans-serif">实习</text>
      <circle cx="32" cy="33" r="12.5" fill="#f0c49a" stroke={c.base} strokeWidth="2" />
      <path d="M25.5 32h4.5M34 32h4.5" stroke={c.base} strokeWidth="2" strokeLinecap="round" />
      <path d="M25.5 35q2.2 1.6 4.5 0M34 35q2.2 1.6 4.5 0" fill="none" stroke="#8a6a8a" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M28.5 40q3.5-2 7 0" fill="none" stroke={c.base} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M43 27q2.8 3.8 0 5.4q-2.8-1.6 0-5.4Z" fill={c.accent} stroke={c.base} strokeWidth="0.8" />
      <path d="M21 24V27Q32 31 43 27V24" fill="#2a3240" stroke={c.base} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M32 11L52 19L32 27L12 19Z" fill="#2a3240" stroke={c.ink} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M32 19L47 22V31" fill="none" stroke="#ffd86b" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="47" cy="32.5" r="1.8" fill="#ffd86b" />
    </g>
  ),
  // 快四个 648：叠起来的船票（2500 ÷ 648 ≈ 3.86）
  2500: (c) => (
    <g>
      <Ticket c={c} label="648" x={-4} y={-9} s={0.72} r={-10} />
      <Ticket c={c} label="648" x={2} y={4} s={0.72} r={4} />
      <text x="52" y="54" textAnchor="end" fontSize="11" fontWeight="900" fill={c.accent} stroke={c.base} strokeWidth="3" paintOrder="stroke" fontFamily="system-ui, sans-serif">≈×4</text>
    </g>
  ),
  // 满池达成：学士帽（毕业）
  3000: (c) => (
    <g>
      <path d="M20 31V40Q32 47 44 40V31L32 36.5Z" fill={c.panel} stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 16L55 26L32 36.5L9 26Z" fill={c.ink} stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 26L49 29V41" fill="none" stroke={c.accent} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M46.5 41h5l-1 6h-3Z" fill={c.accent} stroke={c.base} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="32" cy="26" r="2" fill={c.accent} stroke={c.base} strokeWidth="1.2" />
    </g>
  ),
  // 主机全家桶：一只游戏手柄（接 ¥2000 的 Switch），带离去的速度线
  4000: (c) => (
    <g>
      <path d="M4 25h6M3 32h8M4 39h6" stroke={c.ink} strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <path d="M21 21H43C50 21 55 27 56 36C57 45 52 49 48 46L42 40H22L16 46C12 49 7 45 8 36C9 27 14 21 21 21Z"
        fill={c.ink} stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
      <path d="M19 28v8M15 32h8" stroke={c.base} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="44" cy="28.5" r="2.2" fill={c.accent} stroke={c.base} strokeWidth="1.2" />
      <circle cx="49" cy="33" r="2.2" fill="#8fd0ff" stroke={c.base} strokeWidth="1.2" />
      <circle cx="39" cy="33" r="2.2" fill="#ff8a8a" stroke={c.base} strokeWidth="1.2" />
      <circle cx="44" cy="37.5" r="2.2" fill="#9ef0b0" stroke={c.base} strokeWidth="1.2" />
      <circle cx="27" cy="38" r="3" fill={c.panel} stroke={c.base} strokeWidth="1.4" />
      <circle cx="35" cy="38" r="3" fill={c.panel} stroke={c.base} strokeWidth="1.4" />
    </g>
  ),
  // 跨越常规：越过栏架的弧线
  5000: (c) => (
    <g>
      <rect x="17" y="37" width="3.2" height="15" fill={c.ink} stroke={c.base} strokeWidth="1.3" />
      <rect x="44" y="37" width="3.2" height="15" fill={c.ink} stroke={c.base} strokeWidth="1.3" />
      <rect x="14" y="34" width="36" height="5" rx="1" fill={c.ink} stroke={c.base} strokeWidth="1.8" />
      <path d="M17 34h6M29 34h6M41 34h6" stroke={c.base} strokeWidth="5" opacity="0.25" />
      <path d="M8 46Q30 2 53 38" fill="none" stroke={c.accent} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M45.5 36.5L53.5 39L54 30.5" fill="none" stroke={c.accent} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  // 十连 648：一沓十张的船票
  6480: (c) => (
    <g>
      {[0, 1, 2].map((i) => (
        <Ticket key={i} c={c} label="648" x={-6 + i * 3} y={-8 + i * 5} s={0.68} r={-8 + i * 4} />
      ))}
      <text x="54" y="55" textAnchor="end" fontSize="12" fontWeight="900" fill={c.accent} stroke={c.base} strokeWidth="3" paintOrder="stroke" fontFamily="system-ui, sans-serif">×10</text>
    </g>
  ),
  // 接近万元：钱包 + 沙漏倒计时
  8000: (c) => (
    <g>
      <rect x="9" y="23" width="36" height="25" rx="4" fill={c.accent} stroke={c.base} strokeWidth="2" />
      <path d="M9 29H45" stroke={c.base} strokeWidth="1.8" opacity="0.5" />
      <rect x="36" y="31" width="12" height="9" rx="2.5" fill={c.ink} stroke={c.base} strokeWidth="2" />
      <circle cx="41" cy="35.5" r="1.6" fill={c.base} />
      <path d="M43 10H55M43 30H55" stroke={c.base} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M44.5 10.5H53.5L49 20L53.5 29.5H44.5L49 20Z" fill={c.ink} stroke={c.base} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M46.5 27.5h5L49 23.5Z" fill={c.accent} />
      <path d="M47 13h4l-2 3.5Z" fill={c.accent} />
    </g>
  ),
  // 五位数之壁：一堵砖墙
  10000: (c) => <Bricks c={c} y={0} />,
  // 口袋里的顶配：一台新手机（屏幕上是卡池），旁边一台旧手机
  12000: (c) => (
    <g>
      <rect x="9" y="22" width="15" height="27" rx="3" fill={c.panel} stroke={c.ink} strokeWidth="1.8" opacity="0.8" />
      <path d="M13 30l7 7M20 30l-7 7" stroke={c.ink} strokeWidth="1.4" opacity="0.5" />
      <rect x="25" y="9" width="24" height="44" rx="5" fill={c.ink} stroke={c.base} strokeWidth="2" />
      <rect x="28" y="14" width="18" height="34" rx="2" fill={c.base} />
      <rect x="33" y="11" width="8" height="2" rx="1" fill={c.base} />
      {[0, 1, 2].map((i) => [0, 1].map((j) => (
        <rect key={`${i}${j}`} x={30 + j * 7.5} y={17 + i * 9.5} width="6" height="7.5" rx="1" fill={(i + j) % 2 ? c.accent : c.panel} />
      )))}
    </g>
  ),
  // 说走就走的旅行：行李箱 + 起飞的飞机
  14000: (c) => (
    <g>
      <path d="M33 22l12-6c3-1.5 7 0 5 2.5l-10 6 2 9-3 1.5-4.5-7-6.5 3.5.5 4-2.5 1-1.5-5.5-5-2.5 2-1.5 4 1.5Z"
        fill={c.ink} stroke={c.base} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M44 13q6-1 9 2" fill="none" stroke={c.ink} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 2.4" opacity="0.7" />
      <path d="M17 31v-4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4" fill="none" stroke={c.ink} strokeWidth="2.4" />
      <rect x="11" y="31" width="22" height="20" rx="3" fill={c.accent} stroke={c.base} strokeWidth="2" />
      <path d="M17 31v20M27 31v20" stroke={c.base} strokeWidth="1.6" opacity="0.45" />
      <circle cx="15" cy="53" r="1.8" fill={c.base} /><circle cx="29" cy="53" r="1.8" fill={c.base} />
      <rect x="35" y="44" width="10" height="7" rx="1.5" fill={c.ink} stroke={c.base} strokeWidth="1.4" transform="rotate(-8 40 47.5)" />
    </g>
  ),
  // 一张旗舰显卡：三风扇的旗舰卡
  16499: (c) => (
    <g>
      <rect x="6" y="20" width="48" height="24" rx="3" fill={c.ink} stroke={c.base} strokeWidth="2" />
      <rect x="54" y="18" width="3.5" height="28" rx="1" fill={c.ink} stroke={c.base} strokeWidth="1.4" />
      <path d="M6 24H54" stroke={c.accent} strokeWidth="2" />
      {[16.5, 30, 43.5].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="33" r="6.6" fill={c.base} />
          <path d={`M${cx} 33l0-5.4a5.4 5.4 0 0 1 3.9 1.6Zm0 0l4.7 2.7a5.4 5.4 0 0 1-1.9 3.5Zm0 0l-4.7 2.7a5.4 5.4 0 0 1-1.9-3.5Z`} fill={c.accent} />
          <circle cx={cx} cy="33" r="1.7" fill={c.ink} />
        </g>
      ))}
      <rect x="13" y="44" width="28" height="4.5" rx="1" fill={c.accent} stroke={c.base} strokeWidth="1.4" />
      <path d="M16 44v4.5M20 44v4.5M24 44v4.5M28 44v4.5M32 44v4.5M36 44v4.5" stroke={c.base} strokeWidth="1" opacity="0.6" />
    </g>
  ),
  // 双倍喜悦：两堵墙叠在一起
  20000: (c) => (
    <g>
      <g transform="translate(7 -7) scale(0.86)"><Bricks c={c} opacity={0.6} /></g>
      <g transform="translate(-2 6) scale(0.86)"><Bricks c={c} /></g>
      <text x="54" y="20" textAnchor="end" fontSize="12" fontWeight="900" fill={c.accent} stroke={c.base} strokeWidth="3" paintOrder="stroke" fontFamily="system-ui, sans-serif">×2</text>
    </g>
  ),
  // 回忆杀：小时候五块钱的棒棒糖
  30000: (c) => (
    <g>
      <line x1="34" y1="36" x2="34" y2="55" stroke={c.ink} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="34" cy="25" r="14" fill={c.accent} stroke={c.base} strokeWidth="2" />
      <path d={spiralPath(34, 25, 11.5, 2.6)} fill="none" stroke={c.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="46" r="7.5" fill={c.ink} stroke={c.base} strokeWidth="2" />
      <text x="16" y="50" textAnchor="middle" fontSize="10" fontWeight="900" fill={c.base} fontFamily="system-ui, sans-serif">5</text>
    </g>
  ),
  // 一台复古机车：侧面的复古摩托，油箱、圆大灯，身后两道风
  40000: (c) => (
    <g>
      <path d="M3 33h6M2 39h5" stroke={c.ink} strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <circle cx="16" cy="44" r="7.5" fill="none" stroke={c.ink} strokeWidth="3" />
      <circle cx="48" cy="44" r="7.5" fill="none" stroke={c.ink} strokeWidth="3" />
      <circle cx="16" cy="44" r="2" fill={c.ink} />
      <circle cx="48" cy="44" r="2" fill={c.ink} />
      <path d="M16 44L25 33H38L48 44" fill="none" stroke={c.ink} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M44 22L48 44" stroke={c.ink} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M24 39H37" stroke={c.accent} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 31Q17 27.5 25 29.5L24 33.5H13Z" fill={c.base} stroke={c.ink} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M25 30Q27 24.5 34 24.5Q39.5 24.5 40.5 29L38.5 33.5H26.5Z" fill={c.accent} stroke={c.base} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M28 28.5Q30.5 26.5 34 26.8" fill="none" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
      <path d="M41 21.5h6" stroke={c.ink} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="49" cy="28" r="3.4" fill={c.ink} stroke={c.base} strokeWidth="1.4" />
    </g>
  ),
  // 冰岛的极光：夜空两道极光带，雪地上一间亮着暖灯的玻璃屋
  50000: (c) => (
    <g>
      <path d="M6 24Q18 10 30 20T58 13" fill="none" stroke="#7ff0b8" strokeWidth="3.6" strokeLinecap="round" opacity="0.9" />
      <path d="M6 31Q20 19 32 27T58 21" fill="none" stroke="#8fd0ff" strokeWidth="2.4" strokeLinecap="round" opacity="0.75" />
      <circle cx="14" cy="11" r="1" fill={c.ink} /><circle cx="46" cy="30" r="0.9" fill={c.ink} /><circle cx="52" cy="9" r="1" fill={c.ink} />
      <path d="M6 51Q32 44 58 51V58.5H6Z" fill={c.ink} />
      <path d="M20 50.5a12 12 0 0 1 24 0Z" fill="#8fd0ff" fillOpacity="0.35" stroke={c.ink} strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 38.5V50.5M22.5 45h19M25 41.5q7 2.5 14 0" fill="none" stroke={c.ink} strokeWidth="1" opacity="0.75" />
      <circle cx="32" cy="47.5" r="2" fill={c.accent} />
    </g>
  ),
  // 一架立式钢琴：琴身、谱架上的乐谱、黑白键，旁边飘一个音符
  60000: (c) => (
    <g>
      <rect x="11" y="14" width="40" height="27" rx="2" fill={c.base} stroke={c.ink} strokeWidth="2" />
      <rect x="23" y="17.5" width="16" height="10" rx="1" fill={c.ink} stroke={c.base} strokeWidth="1" />
      <path d="M26 20.5h10M26 23.5h10" stroke={c.base} strokeWidth="0.7" opacity="0.7" />
      <circle cx="29" cy="23.5" r="1.1" fill={c.base} /><circle cx="33.5" cy="20.5" r="1.1" fill={c.base} />
      <rect x="9" y="31" width="44" height="9" rx="1" fill="#ffffff" stroke={c.base} strokeWidth="1.6" />
      {[12.5, 17, 25.5, 30, 34.5, 43, 47.5].map((x) => <rect key={x} x={x} y="31" width="2.6" height="5" fill={c.base} />)}
      <path d="M14 41V52M48 41V52M11 52h6M45 52h6" stroke={c.ink} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M55 9v8.5" stroke={c.accent} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M55 9l4 1.5" stroke={c.accent} strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="53.3" cy="18" rx="2.2" ry="1.7" fill={c.accent} />
    </g>
  ),
  // 去南极看企鹅：冰山前的一只企鹅
  70000: (c) => (
    <g>
      <path d="M33 47L41.5 20L47.5 29L57 47Z" fill="#e8f6ff" stroke={c.base} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M41.5 20L44 34L40 47" fill="none" stroke="#8fd0ff" strokeWidth="1.4" opacity="0.8" />
      <path d="M7 47L12.5 37L18 47Z" fill="#e8f6ff" opacity="0.75" />
      <path d="M4 47.5H60" stroke="#8fd0ff" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 53q3-2 6 0t6 0M40 53q3-2 6 0t6 0" fill="none" stroke="#8fd0ff" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <path d="M16.5 35q-4.5 6-1.5 10" fill="none" stroke="#1d1b2a" strokeWidth="3.2" strokeLinecap="round" />
      <ellipse cx="24" cy="36.5" rx="8" ry="12" fill="#1d1b2a" stroke={c.ink} strokeWidth="1.6" />
      <ellipse cx="25.5" cy="39" rx="5" ry="8.5" fill="#ffffff" />
      <circle cx="27" cy="29.5" r="1.4" fill="#ffffff" /><circle cx="27.4" cy="29.6" r="0.7" fill="#1d1b2a" />
      <path d="M30 31l4.5 1.2-4.5 1.3Z" fill={c.accent} stroke={c.base} strokeWidth="0.6" strokeLinejoin="round" />
      <path d="M20 48.5h4M26 48.5h4" stroke={c.accent} strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  // 一匹自己的马：马头侧影、飘起来的鬃毛和笼头，下面一只马蹄铁
  80000: (c) => (
    <g>
      <path d="M21 52V41Q16.5 34 18.5 25.5Q21 15 31 10.5L33 5.5L36.5 10.5Q45.5 12.5 49.5 21.5L53.5 31Q54.5 35.5 50.5 36.5L43.5 35Q39.5 36 38 40.5V52Z"
        fill={c.ink} stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
      <path d="M31 11Q24 15 22.5 24.5Q21.5 33 25 40.5" fill="none" stroke={c.accent} strokeWidth="4" strokeLinecap="round" />
      <path d="M28 14Q22 20 21.5 27" fill="none" stroke={c.base} strokeWidth="1" opacity="0.5" />
      <path d="M37.5 15.5Q40.5 23.5 45 31M45 31Q49 29.5 53.2 31.5" fill="none" stroke={c.accent} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="45" cy="31" r="1.3" fill={c.accent} />
      <circle cx="41.5" cy="21.5" r="1.6" fill={c.base} />
      <circle cx="50.5" cy="32.5" r="1" fill={c.base} />
      <path d="M44.5 53a4.5 4.5 0 1 1 9 0" fill="none" stroke={c.accent} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M45.4 50.6h.01M52.6 50.6h.01M49 47.6h.01" stroke={c.base} strokeWidth="1.2" strokeLinecap="round" />
    </g>
  ),
  // 北海道的一整个雪季：雪山上两道滑雪轨迹，天上飘雪花
  90000: (c) => (
    <g>
      <path d="M4 54L25 17L35 31L42 23L60 54Z" fill="#ffffff" stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
      <path d="M25 17L29 33L22 54H4Z" fill="#dce9f7" />
      <path d="M4 54L25 17L35 31L42 23L60 54Z" fill="none" stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
      <path d="M27 24Q22 31 31 37T27 52" fill="none" stroke="#8fd0ff" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M30 24Q25 31 34 37T30 52" fill="none" stroke="#8fd0ff" strokeWidth="1.3" strokeLinecap="round" />
      {[[12, 13, 3], [50, 11, 3.5], [55, 25, 2.5]].map(([x, y, r]) => (
        <path key={x} d={`M${x} ${y - r}v${r * 2}M${x - r} ${y}h${r * 2}M${x - r * 0.7} ${y - r * 0.7}l${r * 1.4} ${r * 1.4}M${x + r * 0.7} ${y - r * 0.7}l${-r * 1.4} ${r * 1.4}`}
          stroke={c.ink} strokeWidth="1.2" strokeLinecap="round" />
      ))}
    </g>
  ),
  // 十万！为什么？！：一辆家用轿车开走了
  100000: (c) => (
    <g>
      <path d="M3 31h6M2 37h8M3 43h5" stroke={c.ink} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M12 41Q13 33 21 32L27 25H41L48 32Q55 33 56 41V45H12Z" fill={c.accent} stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
      <path d="M28.5 27.5H39.5L44 32H24.5Z" fill={c.ink} stroke={c.base} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="34" y1="27.5" x2="34" y2="32" stroke={c.base} strokeWidth="1.5" />
      <circle cx="22" cy="45" r="5.5" fill={c.base} stroke={c.ink} strokeWidth="2.2" />
      <circle cx="46" cy="45" r="5.5" fill={c.base} stroke={c.ink} strokeWidth="2.2" />
      <text x="56" y="20" textAnchor="end" fontSize="14" fontWeight="900" fill={c.ink} stroke={c.base} strokeWidth="3" paintOrder="stroke" fontFamily="system-ui, sans-serif">?!</text>
    </g>
  ),
  // 一个间隔年：塞得鼓鼓的背包，一条虚线路线通向远处的定位针
  110000: (c) => (
    <g>
      <path d="M38 41Q50 38 47 25" fill="none" stroke={c.ink} strokeWidth="1.5" strokeDasharray="2.5 2.5" strokeLinecap="round" opacity="0.75" />
      <path d="M48 23.5c-4.5-5-6.5-8-6.5-11a6.5 6.5 0 0 1 13 0c0 3-2 6-6.5 11Z" fill="#ffd86b" stroke={c.base} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="48" cy="12.5" r="2.2" fill={c.base} />
      <path d="M21 23q5-7 10 0" fill="none" stroke={c.ink} strokeWidth="2.2" strokeLinecap="round" />
      <rect x="13" y="23" width="26" height="31" rx="6" fill={c.accent} stroke={c.base} strokeWidth="2" />
      <path d="M13 31Q13 23 26 23Q39 23 39 31V33H13Z" fill={c.ink} stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
      <rect x="24.5" y="31" width="3" height="4.5" rx="0.6" fill={c.base} />
      <rect x="18.5" y="40" width="15" height="10" rx="2" fill={c.panel} stroke={c.base} strokeWidth="1.6" />
      <path d="M22 43.5h8" stroke={c.ink} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    </g>
  ),
  // 一只猫的一辈子：坐着眯眼的猫，尾巴卷起来，脚边一个被打翻的杯子
  120000: (c) => (
    <g>
      <path d="M43 50Q55 50 52 38" fill="none" stroke={c.base} strokeWidth="5.4" strokeLinecap="round" />
      <path d="M43 50Q55 50 52 38" fill="none" stroke={c.ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M21 52Q16 41 22 34L21 21L28 27Q32.5 25.5 37 27L44 21L43 34Q49 41 44 52Z" fill={c.ink} stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
      <path d="M23 24.5L25.5 28L23.3 28.6Z" fill={c.accent} />
      <path d="M42 24.5L39.5 28L41.7 28.6Z" fill={c.accent} />
      <path d="M26.5 34q2-2 4 0M34.5 34q2-2 4 0" fill="none" stroke={c.base} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M31.3 37h2.4l-1.2 1.4Z" fill={c.accent} />
      <path d="M32.5 38.4v1.4M32.5 39.8q-1.5 1.2-3 0M32.5 39.8q1.5 1.2 3 0" fill="none" stroke={c.base} strokeWidth="1" strokeLinecap="round" />
      <path d="M22 37l-6-1M22 39.5l-6 1M43 37l6-1M43 39.5l6 1" stroke={c.base} strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
      <g transform="rotate(-70 12 50)">
        <path d="M7 45h10l-1.2 9h-7.6Z" fill="#ffd86b" stroke={c.base} strokeWidth="1.4" strokeLinejoin="round" />
      </g>
      <ellipse cx="10" cy="55" rx="5.5" ry="1.6" fill="#8fd0ff" opacity="0.8" />
    </g>
  ),
  // 一条小帆船：两面帆、小三角旗，船底下几道浪
  130000: (c) => (
    <g>
      <path d="M32 9.5V44" stroke={c.ink} strokeWidth="2" strokeLinecap="round" />
      <path d="M32 9.5l6 2.4-6 2.4Z" fill={c.accent} />
      <path d="M33.5 14L51 41H33.5Z" fill={c.ink} stroke={c.base} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M30.5 17L15 41H30.5Z" fill={c.accent} stroke={c.base} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M11 44H55L48.5 51.5H17.5Z" fill={c.base} stroke={c.ink} strokeWidth="2" strokeLinejoin="round" />
      <path d="M6 55q4-3 8 0t8 0 8 0 8 0 8 0 8 0" fill="none" stroke="#8fd0ff" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  ),
  // 一年白干：公文包 + 背后一页写着 365 的日历
  150000: (c) => (
    <g>
      <rect x="32" y="7" width="23" height="20" rx="2.5" fill={c.ink} stroke={c.base} strokeWidth="1.8" />
      <rect x="32" y="7" width="23" height="6" rx="2.5" fill={c.accent} stroke={c.base} strokeWidth="1.8" />
      <path d="M37 5v5M50 5v5" stroke={c.base} strokeWidth="2" strokeLinecap="round" />
      <text x="43.5" y="22.5" textAnchor="middle" fontSize="8.5" fontWeight="900" fill={c.base} fontFamily="system-ui, sans-serif">365</text>
      <path d="M21 26v-3.5a2.5 2.5 0 0 1 2.5-2.5h7a2.5 2.5 0 0 1 2.5 2.5V26" fill="none" stroke={c.ink} strokeWidth="2.6" />
      <rect x="9" y="26" width="36" height="24" rx="3" fill={c.panel} stroke={c.ink} strokeWidth="2.2" />
      <path d="M9 35h36" stroke={c.ink} strokeWidth="1.8" opacity="0.7" />
      <rect x="23.5" y="32" width="7" height="6" rx="1.2" fill={c.accent} stroke={c.base} strokeWidth="1.4" />
    </g>
  ),
  // 一整届世界杯：飞进球网的足球
  160000: (c) => (
    <g>
      <path d="M30 16.5h26M30 23h26M30 29.5h26M36.5 10v26M43 10v26M49.5 10v26" stroke={c.ink} strokeWidth="0.8" opacity="0.4" />
      <path d="M30 36V10H56" fill="none" stroke={c.ink} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M5 33h6M3 39h7M5 45h6" stroke={c.ink} strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <circle cx="25" cy="39" r="12" fill="#ffffff" stroke={c.base} strokeWidth="2" />
      <path d="M25 34.4L29.37 37.58L27.7 42.72H22.3L20.63 37.58Z" fill={c.base} />
      <path d="M25 34.4V30M29.37 37.58L33.56 36.22M27.7 42.72L30.29 46.28M22.3 42.72L19.71 46.28M20.63 37.58L16.44 36.22" stroke={c.base} strokeWidth="1.4" strokeLinecap="round" />
    </g>
  ),
  // 一座自己的天文台：圆顶小屋，望远镜从天窗伸出去对着土星
  180000: (c) => (
    <g>
      <circle cx="47" cy="14" r="5" fill="#ffd86b" stroke={c.base} strokeWidth="1.4" />
      <ellipse cx="47" cy="14" rx="9" ry="2.6" transform="rotate(-20 47 14)" fill="none" stroke={c.ink} strokeWidth="1.4" />
      <circle cx="13" cy="13" r="1" fill={c.ink} /><circle cx="22" cy="9" r="0.8" fill={c.ink} /><circle cx="56" cy="30" r="0.9" fill={c.ink} />
      <path d="M33.5 31.5L44 21.5L47.5 25L37 35Z" fill={c.accent} stroke={c.base} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M14 41a17 15 0 0 1 34 0Z" fill={c.ink} stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
      <path d="M29 26.4Q31 26 33 26.4V41H29Z" fill={c.panel} />
      <rect x="14" y="41" width="34" height="12" fill={c.ink} stroke={c.base} strokeWidth="2" />
      <rect x="27" y="45" width="8" height="8" rx="1" fill={c.panel} stroke={c.base} strokeWidth="1.2" />
    </g>
  ),
  // 万氪之王 · 伪神：顶栏同款，歪斜开裂的粉色王冠
  200000: memberCrownArt(200000),
  // 一台老款 911：侧面的经典溜背轿跑，圆灯
  250000: (c) => (
    <g>
      <path d="M2 31h5M1 37h4" stroke={c.ink} strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <path d="M7 43V39Q8 35.5 13 34.5Q21 26 31 25.5Q39 25.5 45 33L55 35.5Q58 36.5 58 40V43Q58 45 56 45H9Q7 45 7 43Z" fill={c.accent} stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 34Q23.5 28.5 31 28.2Q37.5 28.2 42 33.5Z" fill={c.panel} stroke={c.base} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M31.5 28.2V33.8" stroke={c.base} strokeWidth="1.4" />
      <path d="M21 38.5H52" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      <circle cx="55.3" cy="38" r="1.7" fill="#ffd86b" stroke={c.base} strokeWidth="0.8" />
      <circle cx="17" cy="45" r="5.4" fill={c.base} stroke={c.ink} strokeWidth="2" />
      <circle cx="48" cy="45" r="5.4" fill={c.base} stroke={c.ink} strokeWidth="2" />
      <circle cx="17" cy="45" r="1.8" fill={c.ink} /><circle cx="48" cy="45" r="1.8" fill={c.ink} />
      <path d="M4 53H60" stroke={c.ink} strokeWidth="1.4" strokeDasharray="5 4" opacity="0.4" />
    </g>
  ),
  // 私人飞行执照：小螺旋桨飞机从云层里爬升出来
  300000: (c) => (
    <g>
      <path d="M5 21h7M3 27h6M6 33h5" stroke={c.ink} strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <path d="M11 54a5.5 5.5 0 0 1 0-11a8 8 0 0 1 15.5-3a6.5 6.5 0 0 1 11.5 4.5a5 5 0 0 1 0 9.5Z" fill={c.ink} stroke={c.base} strokeWidth="1.8" strokeLinejoin="round" />
      <g transform="rotate(-18 34 26)">
        <path d="M16 23L12 15H17L22 22Z" fill={c.accent} stroke={c.base} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M14 27Q15 22 22 22H44Q50 22 52 26Q50 30 44 30H22Q15 30 14 27Z" fill={c.ink} stroke={c.base} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M22 26.5H40" stroke={c.accent} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M38 22.5Q40 18.5 44 19L46.5 22.5Z" fill={c.panel} stroke={c.base} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M29 28L23 38.5H29L37 28Z" fill={c.accent} stroke={c.base} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M53.5 19V33" stroke={c.base} strokeWidth="2" strokeLinecap="round" />
        <circle cx="52.5" cy="26" r="1.7" fill={c.base} />
      </g>
      <path d="M49 49a3.5 3.5 0 0 1 4-3.5a5 5 0 0 1 4 4.5a3 3 0 0 1-1 5.5H50a3 3 0 0 1-1-6.5Z" fill={c.ink} opacity="0.5" />
    </g>
  ),
  // 做一款自己的游戏：屏幕里的代码，前面一只手柄
  350000: (c) => (
    <g>
      <rect x="9" y="9" width="46" height="31" rx="3" fill={c.base} stroke={c.ink} strokeWidth="2" />
      <text x="17" y="24" fontSize="10" fontWeight="800" fill={c.accent} fontFamily="ui-monospace, monospace">&lt;/&gt;</text>
      <path d="M15 29h12M15 33h17" stroke={c.ink} strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
      {[[42, 15], [45, 15], [39, 18], [42, 18], [45, 18], [48, 18], [42, 21], [45, 21], [44, 24]].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x - 0.5} y={y} width="3" height="3" fill="#ffd86b" />
      ))}
      <path d="M28 40v4M36 40v4M24 44.5h16" stroke={c.ink} strokeWidth="2" strokeLinecap="round" />
      <path d="M21 47.5q-1.5-5.5 4.5-6h14q6 .5 4.5 6l-1.6 5q-1 3-4 1l-2.4-2h-7l-2.4 2q-3 2-4-1Z" fill={c.accent} stroke={c.base} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M27 45.5v4M25 47.5h4" stroke={c.base} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="37.5" cy="46.5" r="1.1" fill={c.base} /><circle cx="40" cy="48.5" r="1.1" fill={c.base} />
    </g>
  ),
  // 开一家自己的小店：条纹遮阳棚的小铺，橱窗里一杯咖啡，门上挂着营业牌
  400000: (c) => (
    <g>
      <rect x="13" y="21" width="38" height="31" rx="1.5" fill={c.ink} stroke={c.base} strokeWidth="2" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <rect x={9 + i * 7.67} y="12" width="7.67" height="9" fill={i % 2 ? c.ink : c.accent} />
          <path d={`M${9 + i * 7.67} 21a3.83 3.83 0 0 0 7.67 0Z`} fill={i % 2 ? c.ink : c.accent} stroke={c.base} strokeWidth="1.4" strokeLinejoin="round" />
        </g>
      ))}
      <rect x="9" y="12" width="46" height="9" fill="none" stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
      <rect x="17" y="30" width="15" height="13" rx="1" fill={c.panel} stroke={c.base} strokeWidth="1.6" />
      <path d="M21 34.5h7v3.2a3.5 3.5 0 0 1-7 0Z" fill={c.ink} stroke={c.base} strokeWidth="1" />
      <path d="M28 35.5h1.2a1.6 1.6 0 0 1 0 3.2H28" fill="none" stroke={c.ink} strokeWidth="1" />
      <path d="M23 32.5q-1-1 0-2M26 32.5q-1-1 0-2" fill="none" stroke={c.ink} strokeWidth="0.9" strokeLinecap="round" opacity="0.8" />
      <rect x="36" y="29" width="11" height="23" rx="1" fill={c.panel} stroke={c.base} strokeWidth="1.6" />
      <circle cx="44.5" cy="43" r="1" fill={c.ink} />
      <path d="M39 30.5l2.5 2.5 2.5-2.5" fill="none" stroke={c.ink} strokeWidth="0.8" />
      <rect x="37.5" y="33" width="8" height="4.5" rx="0.8" fill="#ffd86b" stroke={c.base} strokeWidth="0.9" />
    </g>
  ),
  // 万氪之王 · 半神：顶栏同款，左半金色实心、右半虚线轮廓
  500000: memberCrownArt(500000),
  // 一台自己的房车：远处的雪山，车身一道彩条
  600000: (c) => (
    <g>
      <path d="M4 40L17 23L25 32L35 17L50 40Z" fill={c.rim} opacity="0.3" />
      <path d="M35 17L39 23L36.5 21.8L35 23.5L33.3 21.8L31 23Z" fill="#ffffff" opacity="0.85" />
      <path d="M17 23L20.6 27L18.3 26.2L17 27.4L15.8 26.2L13.9 27Z" fill="#ffffff" opacity="0.75" />
      <path d="M9 30a3 3 0 0 1 3-3H45V47H9Z" fill={c.ink} stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
      <path d="M45 31H50.5L56 38.5V47H45Z" fill={c.ink} stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
      <rect x="9" y="39.5" width="47" height="2.6" fill={c.accent} />
      <rect x="13" y="31" width="9" height="6" rx="1" fill={c.panel} stroke={c.base} strokeWidth="1.4" />
      <rect x="25" y="31" width="7" height="6" rx="1" fill={c.panel} stroke={c.base} strokeWidth="1.4" />
      <rect x="36" y="30.5" width="6" height="15" rx="1" fill="none" stroke={c.base} strokeWidth="1.4" />
      <path d="M47 33.5H50L53.5 38H47Z" fill={c.panel} stroke={c.base} strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="19" cy="48" r="4.6" fill={c.base} stroke={c.ink} strokeWidth="2" />
      <circle cx="48" cy="48" r="4.6" fill={c.base} stroke={c.ink} strokeWidth="2" />
      <path d="M53 9v6M50 12h6" stroke="#ffd86b" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  ),
  // 凝视深渊：深渊漩涡里睁开的一只眼
  700000: (c) => (
    <g>
      <circle cx="32" cy="33" r="21" fill={c.base} />
      <circle cx="32" cy="33" r="21" fill="none" stroke={c.accent} strokeWidth="1.4" opacity="0.5" />
      <circle cx="32" cy="33" r="15.5" fill="none" stroke={c.ink} strokeWidth="1.2" opacity="0.35" strokeDasharray="4 3" />
      <path d="M12 33Q32 15 52 33Q32 51 12 33Z" fill={c.ink} stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="32" cy="33" r="8" fill={c.accent} stroke={c.base} strokeWidth="1.8" />
      <circle cx="32" cy="33" r="3.6" fill={c.base} />
      <circle cx="29.5" cy="30.5" r="1.5" fill="#ffffff" />
      <path d="M14 22l-3-3M50 22l3-3M32 13v-4" stroke={c.accent} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </g>
  ),
  // 海外录取通知书：信封里抽出半截录取信，粉色火漆印，一架纸飞机
  800000: (c) => (
    <g>
      <rect x="10" y="24" width="44" height="27" rx="2" fill={c.rim} stroke={c.base} strokeWidth="2" />
      <rect x="15" y="11" width="28" height="22" rx="1.5" fill="#ffffff" stroke={c.base} strokeWidth="1.6" />
      <path d="M19.5 16.5h19M19.5 20.5h14M19.5 24.5h17" stroke={c.panel} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 26V49a2 2 0 0 0 2 2H52a2 2 0 0 0 2-2V26L32 40Z" fill={c.ink} stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
      <path d="M11 49.5L26 37M53 49.5L38 37" stroke={c.base} strokeWidth="1.4" opacity="0.45" />
      <circle cx="32" cy="40" r="5" fill={c.accent} stroke={c.base} strokeWidth="1.6" />
      <path d="M32 37.2l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3Z" fill="#ffffff" />
      <path d="M45 14L58 7L52.5 19.5L49.5 16Z" fill={c.ink} stroke={c.base} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M49.5 16L58 7" stroke={c.base} strokeWidth="1" />
    </g>
  ),
  // 躺平基金：太阳底下两根柱子间的吊床，飘着 zZ
  900000: (c) => (
    <g>
      <circle cx="17" cy="17" r="5.5" fill="#ffd86b" stroke={c.base} strokeWidth="1.6" />
      <path d="M17 7.5v2M17 24.5v2M7.5 17h2M24.5 17h2M10.3 10.3l1.4 1.4M22.3 22.3l1.4 1.4M10.3 23.7l1.4-1.4M22.3 11.7l1.4-1.4" stroke="#ffd86b" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 26V52M52 26V52" stroke={c.ink} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M12 30Q32 52 52 30Q32 44 12 30Z" fill={c.accent} stroke={c.base} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M18 35.5Q32 46 46 35.5" fill="none" stroke={c.base} strokeWidth="0.9" strokeDasharray="2 2" opacity="0.6" />
      <text x="36" y="25" fontSize="7" fontWeight="800" fill={c.ink} fontFamily="system-ui, sans-serif">z</text>
      <text x="41" y="19" fontSize="10" fontWeight="800" fill={c.ink} fontFamily="system-ui, sans-serif">Z</text>
      <path d="M7 53H57" stroke={c.base} strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  // 万氪之王：顶栏同款，长短交错光芒里的金冠
  1000000: memberCrownArt(1000000),
}

// 炫彩外框的渐变：首尾同色、整条渐变绕中心慢慢转，颜色就沿着边框流动
function HoloGradient({ id, colors, dur = '6s' }) {
  const stops = [...colors, colors[0]]
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      {stops.map((color, i) => <stop key={i} offset={i / (stops.length - 1)} stopColor={color} />)}
      <animateTransform attributeName="gradientTransform" type="rotate" from="0 0.5 0.5" to="360 0.5 0.5" dur={dur} repeatCount="indefinite" />
    </linearGradient>
  )
}

// 外框 + 面板：普通档平涂；炫彩档全息描边 + 偏色面板；王档金框 + 炫彩内圈 + 深紫径向底 + 星点
function Frame({ tier, c, uid }) {
  if (tier === 'prism') {
    return (
      <>
        <defs>
          <HoloGradient id={`${uid}-holo`} colors={c.holo} />
          <linearGradient id={`${uid}-panel`} x1="0" y1="0" x2="1" y2="1">
            {c.panelStops.map((color, i) => <stop key={i} offset={i / (c.panelStops.length - 1)} stopColor={color} />)}
          </linearGradient>
        </defs>
        <rect x="1.5" y="1.5" width="61" height="61" rx="11" fill={c.base} stroke={`url(#${uid}-holo)`} strokeWidth="2.6" />
        <rect x="5.5" y="5.5" width="53" height="53" rx="8" fill={`url(#${uid}-panel)`} />
      </>
    )
  }
  if (tier === 'king') {
    return (
      <>
        <defs>
          <HoloGradient id={`${uid}-holo`} colors={c.holo} dur="4s" />
          <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="1">
            {c.gold.map((color, i) => <stop key={i} offset={i / (c.gold.length - 1)} stopColor={color} />)}
          </linearGradient>
          <radialGradient id={`${uid}-panel`} cx="0.5" cy="0.48" r="0.62">
            <stop offset="0" stopColor="#5b2f86" />
            <stop offset="1" stopColor={c.panel} />
          </radialGradient>
        </defs>
        <rect x="1.5" y="1.5" width="61" height="61" rx="11" fill={c.base} stroke={`url(#${uid}-gold)`} strokeWidth="2.8" />
        <rect x="4.6" y="4.6" width="54.8" height="54.8" rx="8.6" fill="none" stroke={`url(#${uid}-holo)`} strokeWidth="1.4" />
        <rect x="6.5" y="6.5" width="51" height="51" rx="7" fill={`url(#${uid}-panel)`} />
        {[[11, 12, 0.8], [53, 11, 0.7], [10, 52, 0.7], [54, 51, 0.8], [47, 56, 0.5]].map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#fff6da" opacity="0.8" />
        ))}
      </>
    )
  }
  return (
    <>
      <rect x="1.5" y="1.5" width="61" height="61" rx="11" fill={c.base} stroke={c.rim} strokeWidth="2" />
      <rect x="5.5" y="5.5" width="53" height="53" rx="8" fill={c.panel} />
    </>
  )
}

/**
 * @param {{ amount: number, size?: number, className?: string }} props
 */
export function AchievementIcon({ amount, size = 64, className = '' }) {
  const tier = achievementTier(amount)
  const c = TIERS[tier]
  const uid = `ach${useId().replace(/:/g, '')}`
  const art = ART[amount]
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <Frame tier={tier} c={c} uid={uid} />
      {/* 左上一道平涂的斜向反光，让徽章有点金属片的感觉 */}
      <path d="M5.5 15Q5.5 5.5 15 5.5H44L5.5 44Z" fill="#ffffff" opacity="0.07" />
      {art ? art(c) : (
        <text x="32" y="38" textAnchor="middle" fontSize="13" fontWeight="900" fill={c.ink} fontFamily="system-ui, sans-serif">
          ¥{amount >= 10000 ? `${amount / 10000}万` : amount}
        </text>
      )}
    </svg>
  )
}

/**
 * 顶栏会员王冠（彩蛋，档位见 src/utils/crownTier.js）。不加底框（顶栏其余都是无框线条图标，号主嫌带框的突兀），
 * 四档全靠王冠本身区分（同一个造型 CrownShape，左亮右暗两色平涂）：
 *   0        会员      端正的橙金王冠
 *   200000   伪神      歪斜开裂的粉色王冠，带青色重影和往下掉的碎片
 *   500000   半神      左半金色实心、右半只剩虚线轮廓，中间一道光缝
 *   1000000  万氪之王  长短交错的光芒里的金冠（顶栏里还有沿轮廓呼吸的金色辉光，见 .crown-king）
 */
// 顶栏王冠的统一造型：五个尖、两道弧形凹口、三颗宝珠；左亮右暗两色平涂出金属转折面；冠身菱形宝石 + 冠带三颗宝石
const CROWN_LEFT = 'M14 44L11 19Q17 29 23 30.5L32 10V44Z'
const CROWN_RIGHT = 'M32 10L41 30.5Q47 29 53 19L50 44H32Z'
const CROWN_OUTLINE = 'M14 44L11 19Q17 29 23 30.5L32 10L41 30.5Q47 29 53 19L50 44Z'

function CrownShape({ light, dark, band, gem, gem2 = gem, stroke, ghostRight = false }) {
  return (
    <g strokeLinejoin="round">
      <path d={CROWN_LEFT} fill={light} />
      {ghostRight
        ? <path d="M32 10L41 30.5Q47 29 53 19L50 44H32" fill="rgba(185,168,230,0.10)" stroke="#c9bbf0" strokeWidth="1.8" strokeDasharray="3 2.4" />
        : <path d={CROWN_RIGHT} fill={dark} />}
      <path d={ghostRight ? 'M14 44L11 19Q17 29 23 30.5L32 10V44Z' : CROWN_OUTLINE} fill="none" stroke={stroke} strokeWidth="2.2" />
      <path d="M16.5 40L14.5 25.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
      {!ghostRight && <path d="M32 26.5l4.2 5.5-4.2 5.5-4.2-5.5Z" fill={gem} stroke={stroke} strokeWidth="1.4" />}
      {ghostRight && <path d="M32 26.5v11l-4.2-5.5Z" fill={gem} stroke={stroke} strokeWidth="1.4" />}
      <rect x="12" y="43" width={ghostRight ? 20 : 40} height="8" rx="2" fill={band} stroke={stroke} strokeWidth="2" />
      {ghostRight && <rect x="32" y="43" width="20" height="8" rx="2" fill="none" stroke="#c9bbf0" strokeWidth="1.6" strokeDasharray="3 2.4" />}
      <circle cx="20" cy="47" r="2" fill={gem2} />
      {!ghostRight && <circle cx="32" cy="47" r="2.2" fill={gem} />}
      {!ghostRight && <circle cx="44" cy="47" r="2" fill={gem2} />}
      <circle cx="11" cy="18" r="2.8" fill={band} stroke={stroke} strokeWidth="1.5" />
      <circle cx="32" cy="9" r="3" fill={band} stroke={stroke} strokeWidth="1.5" />
      <circle cx="53" cy="18" r="2.8" fill={ghostRight ? 'none' : band} stroke={ghostRight ? '#c9bbf0' : stroke} strokeWidth="1.5" strokeDasharray={ghostRight ? '2 1.6' : undefined} />
    </g>
  )
}

function Sparkle({ x, y, r, color }) {
  return <path d={`M${x} ${y - r}Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y}Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r}Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y}Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z`} fill={color} />
}

// 顶栏旁边都是无框的线条图标和圆角胶囊，所以这里不加底框，只画王冠本身
const MEMBER_CROWNS = {
  // 会员：端正的橙金王冠
  0: () => <CrownShape light="#ffb766" dark="#ee8a2f" band="#ffe8cc" gem="#e6394f" gem2="#4fb6ff" stroke="#4a2a10" />,
  // 伪神：歪斜、开裂的粉色王冠，青色重影，掉下两片碎片
  // 绕冠带中心转，再整体挪一点：冠带最低的角落在和其它三档同一条底线上、冠身左右居中
  // （以前绕画布中心转，整顶冠偏到右下，并排时看着没对齐）
  200000: () => (
    <g transform="translate(3 -3.5)">
      <g transform="rotate(-11 32 47)">
        <path d={CROWN_OUTLINE} fill="none" stroke="#4fe3ff" strokeWidth="1.4" strokeLinejoin="round" opacity="0.45" transform="translate(-2.4 1.2)" />
        <CrownShape light="#ff94dc" dark="#d95cb4" band="#f3e8ff" gem="#4fe3ff" stroke="#2a1530" />
        <path d="M33.5 12L29.5 24L35.5 30.5L30.5 43" fill="none" stroke="#2a1530" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      </g>
      <path d="M47 53l4.8 1.4-3 4Z" fill="#ff94dc" stroke="#2a1530" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M54.5 46.5l3.2 2.3-3.4 1.8Z" fill="#d95cb4" stroke="#2a1530" strokeWidth="1.1" strokeLinejoin="round" />
    </g>
  ),
  // 半神：左半金色实心，右半只剩虚线轮廓；中间一道光缝
  500000: () => (
    <g>
      <CrownShape light="#ffe27a" dark="#f0b429" band="#fff6d8" gem="#ff5fa2" stroke="#3a2706" ghostRight />
      <path d="M32 6V56" stroke="#fff6d8" strokeWidth="1" opacity="0.5" />
      <Sparkle x={8} y={33} r={4} color="#fff6d8" />
      <Sparkle x={19} y={7} r={3} color="#fff6d8" />
    </g>
  ),
  // 万氪之王：金冠 + 长短交错的光芒 + 星点
  1000000: () => (
    <g>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2 - Math.PI / 2
        const outer = i % 2 ? 27 : 31
        return <line key={i} x1={32 + Math.cos(a) * 23} y1={30 + Math.sin(a) * 23} x2={32 + Math.cos(a) * outer} y2={30 + Math.sin(a) * outer}
          stroke="#ffe08a" strokeWidth={i % 2 ? 1.8 : 2.6} strokeLinecap="round" />
      })}
      <CrownShape light="#ffe27a" dark="#f0b429" band="#fff6d8" gem="#ff5fa2" gem2="#4fd8ff" stroke="#3a2706" />
      <Sparkle x={57} y={8} r={4} color="#fff6d8" />
      <Sparkle x={7} y={54} r={3} color="#fff6d8" />
    </g>
  ),
}

export function MemberCrownIcon({ tier = 0, size = 24, className = '' }) {
  const draw = MEMBER_CROWNS[tier] || MEMBER_CROWNS[0]
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true" overflow="visible">
      {draw()}
    </svg>
  )
}
