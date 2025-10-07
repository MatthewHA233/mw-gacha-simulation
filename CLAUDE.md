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

### 单个活动配置 (例: 2024-10-shadow-trade.json)

```json
{
  "id": "2024-10-shadow-trade",
  "type": "chip",
  "metadata": {
    "name": "暗影交易",
    "nameEn": "Deal with the Shadow",
    "period": "2025年10月 月初",
    "description": "暗影交易活动描述"
  },

  "assets": {
    "basePath": "/assets/chip/2024-10-shadow-trade",
    "background": "background.png",
    "widget": "widget.png",
    "currencyIcon": "currency.png"
  },

  "currency": {
    "name": "筹码",
    "initialAmount": 40,
    "singleDrawCost": 1,
    "multiDrawCost": 10,
    "multiDrawCount": 10
  },

  "guarantee": {
    "epic": 10,
    "legendary": 50
  },

  "items": [
    {
      "id": "item_001",
      "name": "幻影迷彩",
      "nameEn": "Phantom Camo",
      "rarity": "legendary",
      "image": "items/item_001.png",
      "probability": 0.0005,
      "category": "迷彩"
    },
    {
      "id": "item_002",
      "name": "高级零件",
      "rarity": "epic",
      "image": "items/item_002.png",
      "probability": 0.02,
      "category": "零件"
    },
    {
      "id": "item_003",
      "name": "普通材料",
      "rarity": "rare",
      "image": "items/item_003.png",
      "probability": 0.15,
      "category": "材料"
    }
  ],

  "shop": {
    "packages": [
      {
        "id": "pkg_001",
        "coins": 22,
        "price": 25,
        "image": "shop/package_001.png",
        "discount": "-10%"
      },
      {
        "id": "pkg_002",
        "coins": 60,
        "price": 60,
        "image": "shop/package_002.png",
        "discount": "-15%"
      }
    ]
  },

  "audio": {
    "draw": "draw.wav",
    "reward": "Reward_Daily_02_UI.Reward_Daily_02_UI.wav",
    "fail": "UpgradeFailed_01_UI.UpgradeFailed_01_UI.wav"
  }
}
```

---

## 项目目录结构

```
项目根目录
├── public/                                 # 静态资源（可与 CDN 同步）
│   ├── assets/...
│   └── gacha-configs/...
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
│   │   └── GachaPage.jsx                   # 抽卡页面容器
│   │
│   ├── hooks/
│   │   ├── useActivityList.js
│   │   ├── useGachaData.js
│   │   └── useSound.js
│   │
│   ├── services/
│   │   ├── cdnService.js                   # CDN 数据加载
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
   - Sidebar 加载 `index.json` 获取所有活动列表

2. **用户选择活动**
   - 点击侧边栏某个活动
   - 路由跳转到 `/gacha/chip/2024-10-shadow-trade`

3. **加载活动配置**
   - GachaPage 根据路由参数加载对应 JSON 配置
   - cdnService.js 从 CDN 获取配置文件

4. **动态渲染界面**
   - 根据配置动态构建图片 URL（CDN_BASE_URL + assets.basePath + image）
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
    <Route path="/" element={<Navigate to="/gacha/chip/2024-10-shadow-trade" />} />
    <Route path="/gacha/:type/:activityId" element={<GachaPage />} />
  </Routes>
</BrowserRouter>
```

示例路由：
- `/gacha/chip/2024-10-shadow-trade` - 筹码类：暗影交易
- `/gacha/chip/2024-09-xxx` - 筹码类：历史活动
- `/gacha/cargo/2024-11-xxx` - 机密货物类
- `/gacha/flagship/2024-12-xxx` - 旗舰宝箱类

---

## 图片 URL 构建规则

```javascript
// 示例：构建物品图片 URL
const CDN_BASE_URL = 'https://your-cdn.com'
const config = await loadConfig('2024-10-shadow-trade.json')

// 背景图
const backgroundUrl = `${CDN_BASE_URL}${config.assets.basePath}/${config.assets.background}`
// 结果: https://your-cdn.com/assets/chip/2024-10-shadow-trade/background.png

// 物品图片
const itemUrl = `${CDN_BASE_URL}${config.assets.basePath}/${item.image}`
// 结果: https://your-cdn.com/assets/chip/2024-10-shadow-trade/items/item_001.png

// 商店图片
const shopUrl = `${CDN_BASE_URL}${config.assets.basePath}/${pkg.image}`
// 结果: https://your-cdn.com/assets/chip/2024-10-shadow-trade/shop/package_001.png
```

---

## 开发指南

### 添加新活动

1. 在 CDN 上传活动配置 JSON 和资源文件
2. 在 `index.json` 添加活动索引
3. 无需修改代码，直接通过侧边栏访问新活动

### 添加新抽卡类型

1. 在 `src/components/` 创建新组件文件夹（如 `CargoGacha/`）
2. 在 `GachaPage.jsx` 添加类型判断，渲染对应组件
3. 在 CDN 创建对应类型的配置文件夹

### 组件复用原则

- 三种抽卡类型共享底层逻辑（services/gachaService.js）
- 各自实现独特的 UI 展示
- 通过配置文件控制差异（概率、保底机制等）

---

## 技术栈

- **框架**: React 18
- **路由**: React Router v6
- **动画**: Framer Motion
- **样式**: Tailwind CSS
- **部署**: Vercel
- **CDN**: 阿里云 OSS

---

## 注意事项

1. **赞助功能风险**：由于 QQ/微信可能拦截含支付二维码的网站，建议：
   - 改为跳转到爱发电等第三方平台
   - 避免使用"打赏"、"支付"等敏感词
   - 添加明显的"游戏模拟工具"说明

2. **CDN 缓存**：更新配置后注意刷新 CDN 缓存

3. **历史数据兼容**：保持 JSON 配置格式向后兼容

---

## 当前进度

- ✅ 项目架构设计完成
- ⏳ 待实施：组件拆分、CDN 数据加载、路由系统
