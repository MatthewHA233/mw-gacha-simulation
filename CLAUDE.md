# 现代战舰抽奖模拟器 - 项目架构文档

## 项目概述

这是一个现代战舰游戏的抽奖模拟器项目，支持三种抽卡类型：
- **筹码类抽卡** (Chip Gacha)
- **机密货物类抽卡** (Cargo Gacha)
- **旗舰宝箱类抽卡** (Flagship Gacha)

所有数据和静态资源存储在阿里云 CDN，通过动态加载配置文件实现多活动支持。

---

## 核心设计原则

1. **数据驱动**：所有活动配置、物品数据都从 CDN JSON 配置加载
2. **组件化**：三种抽卡类型各自独立组件，共享底层逻辑
3. **动态路由**：支持多个抽卡活动，通过路由切换
4. **历史数据支持**：侧边栏可加载历史活动，使用相同组件渲染

---

## CDN 文件组织结构

所有静态资源与配置在运行时会优先从 `CDN_BASE_URL/`（由环境变量 `VITE_CDN_BASE_URL` 提供）读取；当该值为空时，会自动回退到项目的 `public/` 目录，目录形态保持一致。下图展示了 CDN 根目录的实际组织方式：

```
CDN_BASE_URL/
├── gacha-configs/                                   # 活动配置 JSON
│   ├── index.json                                   # 活动索引（Sidebar 用）
│   ├── chip/                                        # 筹码类活动配置
│   │   └── {activityId}.json                        # 例如 ag97.json
│   ├── cargo/                                       # 预留：机密货物类活动
│   └── flagship/                                    # 预留：旗舰宝箱类活动
│
└── assets/                                          # 抽卡所需的全部素材
    ├── contentseparated_assets_activities/          # 按活动 ID 区分的界面元素
    │   ├── activity_gacha_{activityId}_background.png  # 抽卡背景
    │   └── activity_gacha_{activityId}_widget.png      # 活动卡片 & 抽卡结果面板
    ├── contentseparated_assets_offers/              # 商店/弹窗相关资源
    │   ├── eventgachaoffer_{activityId}_limited_background.png     # 商店弹窗背景
    │   └── eventgachaoffer_{activityId}_{packageIndex}_thumbnail.png # 商店套餐缩略图（packageIndex = packageId + 1）
    ├── contentseparated_assets_content/             # 通用素材归档
    │   └── textures/sprites/
    │       ├── currency/currency_gachacoins_{activityId}.png       # 活动专属货币
    │       ├── units_ships/{itemId}.png                           # 舰船立绘（稀有奖励）
    │       ├── weapons/{itemId}.png                               # 武器/导弹/模块
    │       └── camouflages/{itemId}.png                           # 涂装/皮肤
    └── audio/                                     
        ├── draw.wav                                 # 抽卡音效
        ├── Reward_Daily_02_UI.wav                   # 奖励提示音
        └── UpgradeFailed_01_UI.wav                  # 未中奖反馈音

### 与 `public/` 目录的映射关系

- 本地开发或 `VITE_CDN_BASE_URL` 留空时，Vite 会直接从 `public/` 下读取同名文件，例如 `public/gacha-configs/index.json`、`public/assets/...`。
- `public/` 中可以额外放置仅供本地调试的素材，例如 `public/常驻奖励物品/`、`public/示例/` 等，它们不会上传至 CDN。

### 数据文件中的外链资源

部分配置字段直接给出第三方绝对 URL（如活动预览图），这些资源既不位于 CDN，也不会被复制到 `public/`，示例如下：

- `https://mwstats.info/images/gacha-preview/gacha_c_*.jpg?v=xxxx`
- `https://mwstats.info/images/gacha-preview/activity_c_*.jpg?v=xxxx`

---

## JSON 配置格式

### index.json (活动索引)

```json
{
  "activities": [
    {
      "id": "ag97",
      "gacha_type": "筹码类",
      "name": "暗影交易",
      "nameEn": "Deal with the Shadow",
      "formattedDate": "2025年10月"
    },
    {
      "id": "pf25",
      "gacha_type": "筹码类",
      "name": "招财进宝",
      "formattedDate": "2025年2月",
      "nameEn": "Pursuit of Fortune",
      "image": "https://mwstats.info/images/gacha-preview/gacha_c_pf25.jpg?v=6993bfbd"
    }
  ]
}
```

### 单个活动配置 (例: chip/lm25.json)

```json
{
  "id": "lm25",
  "gacha_type": "筹码类",
  "metadata": {
    "name": "漩涡之主",
    "currency_gachacoins_image": "https://mwstats.info/images/sprites-2024-transparent/currency_gachacoins_lm25.webp?v=bf7e26c1",
    "nameEn": "Lords of the Maelstrom",
    "formattedDate": "2025年7月"
  },
  "items": [
    {
      "name": "[意]维托里奥·维内托(C 550)",
      "probability": 0.1,
      "limit": 1,
      "id": "VittorioVeneto",
      "type": "战舰",
      "rarity": "epic",
      "nameEn": "IT Vittorio Veneto (C 550)"
    },
    {
      "name": "10 艺术硬币",
      "probability": 8.0,
      "limit": 0,
      "id": "Artstorm",
      "type": "资源",
      "rarity": "common"
    },
    {
      "name": "PAK DA M",
      "probability": 0.51,
      "limit": 2,
      "id": "PAKDAM",
      "type": "轰炸机",
      "rarity": "epic",
      "nameEn": "PAK DA M"
    },
    {
      "name": "6 高级修理包",
      "probability": 11.5,
      "limit": 0,
      "id": "PremiumRepairKit",
      "type": "道具",
      "rarity": "common"
    },
    {
      "name": "[韩]幽灵指挥官",
      "probability": 0.12,
      "limit": 1,
      "id": "GhostCommander",
      "type": "战舰",
      "rarity": "epic",
      "nameEn": "ROKS Ghost Commander"
    },
    {
      "name": "15 黄金",
      "probability": 33.0,
      "limit": 0,
      "id": "Hard",
      "type": "资源",
      "rarity": "common"
    },
    {
      "name": "帕特农神庙",
      "probability": 1.53,
      "limit": 0,
      "id": "Camo_Parthenon",
      "type": "涂装",
      "rarity": "legendary",
      "nameEn": "Parthenon"
    },
    {
      "name": "62型鱼雷(533mm)",
      "probability": 0.24,
      "limit": 0,
      "id": "Torped62",
      "type": "鱼雷",
      "rarity": "legendary",
      "nameEn": "Torped 62 (533 mm)"
    },
    {
      "name": "RIM-162D",
      "probability": 0.5,
      "limit": 1,
      "id": "RIM162D",
      "type": "防空设备",
      "rarity": "epic",
      "nameEn": "RIM-162D"
    },
    {
      "name": "2 烟幕",
      "probability": 15.0,
      "limit": 0,
      "id": "TankSmokeBombs",
      "type": "道具",
      "rarity": "common"
    },
    {
      "name": "[俄]巴尔蒂尼 A-2000-7",
      "probability": 0.16,
      "limit": 1,
      "id": "BartiniA2000",
      "type": "战舰",
      "rarity": "epic",
      "nameEn": "RF Bartini A-2000-7"
    },
    {
      "name": "4 艺术硬币",
      "probability": 25.0,
      "limit": 0,
      "id": "Artstorm",
      "type": "资源",
      "rarity": "common"
    },
    {
      "name": "Mark 55/12 (305 mm)",
      "probability": 0.35,
      "limit": 2,
      "id": "Mark5512",
      "type": "主炮",
      "rarity": "epic",
      "nameEn": "Mark 55/12 (305 mm)"
    },
    {
      "name": "筹码",
      "probability": 4.0,
      "limit": 0,
      "id": "currency",
      "type": "资源",
      "rarity": "common"
    }
  ]
}
```

---

## 项目目录结构

```
项目根目录
├── public/                                 # 静态资源（可与 CDN 同步）
│   ├── assets/...                          # CDN 资源镜像
│   ├── gacha-configs/...                   # 活动配置 JSON
│   ├── lootbox/                            # 宝箱动画资源
│   │   ├── lootboxtickets.spriteatlas/     # 宝箱图片集
│   │   ├── 开箱.png                        # 开箱盖图层
│   │   ├── 开箱时烟雾.png                  # 开箱烟雾特效
│   │   ├── 烟雾.png                        # 烟雾释放特效
│   │   └── la96_premium/                   # 音效文件
│   └── 常驻奖励物品/                        # 常驻奖励图片
│
├── src/
│   ├── App.jsx                             # 路由与全局布局
│   ├── main.jsx                            # React 入口
│   ├── App.css / index.css                 # 全局样式
│   ├── components/
│   │   ├── ChipGacha/                      # 筹码类抽卡界面组件
│   │   │   ├── ChipGacha.jsx               # 主容器组件
│   │   │   ├── GachaDisplay.jsx            # 抽卡展示区
│   │   │   ├── HistoryModal.jsx            # 历史记录弹窗
│   │   │   ├── InfoModal.jsx               # 规则说明弹窗
│   │   │   ├── ResultModal.jsx             # 抽卡结果弹窗
│   │   │   ├── ShopModal.jsx               # 商店弹窗
│   │   │   └── SponsorModal.jsx            # 赞助弹窗
│   │   │
│   │   ├── Layout/                         # 布局相关组件
│   │   │   ├── Header.jsx                  # 顶部标题栏
│   │   │   ├── Sidebar.jsx                 # 活动列表侧边栏
│   │   │   └── Sidebar.css                 # 侧边栏样式
│   │   │
│   │   ├── ui/                             # 通用 UI 组件
│   │   │   ├── ConfirmModal.jsx
│   │   │   ├── ResetModal.jsx
│   │   │   ├── background-beams.jsx        # 背景特效
│   │   │   ├── hexagon-grid.jsx            # 六边形网格组件
│   │   │   ├── hexagon.css                 # 六边形样式
│   │   │   └── text-generate-effect.jsx    # 文本动画效果
│   │   │
│   │   ├── HexGrid.jsx / HexItem.jsx       # 六边形展示组件
│   │   └── SquareItem.jsx                  # 方形展示组件
│   │
│   ├── pages/
│   │   ├── GachaPage.jsx                   # 抽卡页面容器
│   │   └── LootboxAnimationDemo.jsx        # 宝箱开启动画测试页面
│   │
│   ├── hooks/
│   │   ├── useActivityList.js              # 活动列表加载
│   │   ├── useGachaData.js                 # 抽卡数据管理
│   │   └── useSound.js                     # 音效播放
│   │
│   ├── services/
│   │   ├── cdnService.js                   # CDN 数据加载与URL构建
│   │   └── gachaService.js                 # 抽卡逻辑与概率
│   │
│   ├── utils/
│   │   ├── constants.js                    # 常量配置
│   │   ├── gameStateStorage.js             # 本地存档工具
│   │   └── rarityHelpers.js                # 稀有度辅助方法
│   │
│   ├── data/
│   │   └── defaultItems.js                 # 默认物品配置
│   │
│   └── lib/
│       └── utils.js                        # 通用工具函数
│
├── index.html
├── package.json / vite.config.js / tailwind.config.js ...
└── CLAUDE.md 等文档
```

---

## 数据流程

1. **应用启动**
   - App.jsx 初始化路由
   - Sidebar 加载 `/gacha-configs/index.json` 获取所有活动列表

2. **用户选择活动**
   - 点击侧边栏某个活动
   - 路由跳转到 `/gacha/chip/{activityId}`（例如：`/gacha/chip/ag97`）

3. **加载活动配置**
   - GachaPage 根据路由参数加载对应 JSON 配置
   - cdnService.js 从本地 public 加载配置文件：`/gacha-configs/{type}/{activityId}.json`

4. **动态渲染界面**
   - 通过 cdnService.js 的辅助函数构建图片 URL：
     - `buildWidgetUrl()` - 活动卡片图
     - `buildBackgroundUrl()` - 抽卡背景
     - `buildItemImageUrl()` - 物品图片
     - `buildCurrencyIconUrl()` - 货币图标
   - 使用配置中的概率、保底、物品数据等

5. **抽卡交互**
   - gachaService.js 处理抽卡逻辑（概率计算、保底）
   - 播放对应音效
   - 显示抽卡结果

---

## 路由设计

```javascript
// App.jsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Navigate to="/gacha/chip/ag97" replace />} />
    <Route path="/test" element={<Navigate to="/test/lootbox-animation" replace />} />
    <Route path="/test/lootbox-animation" element={<LootboxAnimationDemo />} />
    <Route path="/gacha/:type/:activityId" element={<GachaPage />} />
    <Route path="*" element={<Navigate to="/gacha/chip/ag97" replace />} />
  </Routes>
</BrowserRouter>
```

**路由说明：**
- `/` - 默认重定向到最新活动（暗影交易 ag97）
- `/gacha/:type/:activityId` - 抽卡页面主路由
  - `:type` - 抽卡类型：`chip` / `cargo` / `flagship`
  - `:activityId` - 活动ID（短格式，如：`ag97`, `lm25`, `pf25`）
- `/test/lootbox-animation` - 宝箱开启动画测试页面

**示例路由：**
- `/gacha/chip/ag97` - 筹码类：暗影交易
- `/gacha/chip/lm25` - 筹码类：漩涡之主
- `/gacha/chip/pf25` - 筹码类：招财进宝
- `/gacha/cargo/xxx` - 机密货物类（未来扩展）
- `/gacha/flagship/xxx` - 旗舰宝箱类（未来扩展）

---

## 图片 URL 构建规则

项目使用 `src/services/cdnService.js` 提供的辅助函数来构建图片 URL。所有资源优先从配置文件读取，若不存在则使用 `CDN_BASE_URL` 动态生成。

### 核心辅助函数

```javascript
import { buildWidgetUrl, buildBackgroundUrl, buildItemImageUrl, buildCurrencyIconUrl } from '@/services/cdnService'

// 1. 活动卡片图（Widget）
const widgetUrl = buildWidgetUrl(activityConfig)
// 优先级：config.metadata.image > config.image > 动态生成
// 结果示例: https://cdn.com/assets/contentseparated_assets_activities/activity_gacha_ag97_widget.png

// 2. 抽卡背景图
const backgroundUrl = buildBackgroundUrl(activityConfig)
// 优先级：config.metadata.image > config.image > 动态生成
// 结果示例: https://cdn.com/assets/contentseparated_assets_activities/activity_gacha_ag97_background.png

// 3. 物品图片（根据稀有度和类型自动路由）
const itemUrl = buildItemImageUrl(item, activityConfig)
// - 货币(currency): /assets/.../currency/currency_gachacoins_{activityId}.png
// - 战舰(epic/legendary): /assets/.../units_ships/{itemId}.png
// - 涂装(epic/legendary): /assets/.../camouflages/{itemId}.png
// - 武器类(epic/legendary): /assets/.../weapons/{itemId}.png
// - 普通物品(common): /常驻奖励物品/{itemId}.png

// 4. 货币图标
const currencyUrl = buildCurrencyIconUrl(activityConfig)
// 优先级：config.metadata.currency_gachacoins_image > config.currency_gachacoins_image > 动态生成
```

### 其他辅助函数

```javascript
import { buildInfoBackgroundUrl, buildResultBackgroundUrl, buildShopPackageUrl } from '@/services/cdnService'

// 信息弹窗背景
buildInfoBackgroundUrl(activityId)
// /assets/contentseparated_assets_offers/eventgachaoffer_{activityId}_limited_background.png

// 结果弹窗背景
buildResultBackgroundUrl(activityId)
// /assets/contentseparated_assets_activities/activity_gacha_{activityId}_widget.png

// 商店套餐缩略图
buildShopPackageUrl(activityId, packageId)
// /assets/contentseparated_assets_offers/eventgachaoffer_{activityId}_{packageId+1}_thumbnail.png
```

### CDN_BASE_URL 配置

```javascript
// src/utils/constants.js
export const CDN_BASE_URL = import.meta.env.VITE_CDN_BASE_URL || ''

// 开发环境：VITE_CDN_BASE_URL = '' → 使用 public/ 目录
// 生产环境：VITE_CDN_BASE_URL = 'https://your-cdn.com' → 使用 CDN
```

---

## 开发指南

### 添加新活动

1. 准备活动配置 JSON 文件和资源文件
2. 将配置文件放到 `public/gacha-configs/{type}/{activityId}.json`
3. 在 `public/gacha-configs/index.json` 添加活动索引
4. 上传资源到 CDN 或放到 `public/assets/` 对应目录
5. 无需修改代码，直接通过侧边栏访问新活动

**活动ID命名规范：**
- 使用短格式：`ag97`（暗影交易）、`lm25`（漩涡之主）
- 避免使用日期格式（已废弃）

### 添加新抽卡类型

1. 在 `src/components/` 创建新组件文件夹（如 `CargoGacha/` 或 `FlagshipGacha/`）
2. 在 `src/pages/GachaPage.jsx` 添加类型判断，渲染对应组件
3. 在 `public/gacha-configs/` 创建对应类型的配置文件夹
4. 在 `src/services/cdnService.js` 的 `GACHA_TYPE_MAP` 添加类型映射

### 添加测试/演示页面

1. 在 `src/pages/` 创建新页面组件（参考 `LootboxAnimationDemo.jsx`）
2. 在 `src/App.jsx` 添加路由：
   ```javascript
   <Route path="/test/your-demo" element={<YourDemo />} />
   ```
3. 访问 `/test/your-demo` 查看效果

### 组件复用原则

- 三种抽卡类型共享底层逻辑（`services/gachaService.js`）
- 各自实现独特的 UI 展示
- 通过配置文件控制差异（概率、保底机制等）
- 所有图片URL构建统一使用 `cdnService.js` 辅助函数

---

## 技术栈

- **框架**: React 18
- **路由**: React Router v6
- **动画**: Framer Motion
- **样式**: Tailwind CSS
- **部署**: Vercel
- **CDN**: 阿里云 OSS