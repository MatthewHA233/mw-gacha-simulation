# gacha-configs 数据目录说明（Claude 编辑指南）

本目录包含所有抽奖活动的 JSON 配置数据。

---

## 目录结构

```
gacha-configs/
├── index.json        # 活动总索引（侧边栏），活动按时间从新到旧排列
├── site-info.json    # 网站信息
├── version-history.json
├── chip/             # 筹码类
├── cargo/            # 机密货物类 + 无人机补给类
└── flagship/         # 旗舰宝箱类
```

---

## 日常编辑工作流（用户发图片时的操作步骤）

用户会发三种截图：

### 第1种：游戏主页活动列表截图

**任务**：识别出新活动，在 index.json 最顶部新增条目。

**如何猜 ID**：
1. 打开本地解包图片目录：
   `D:\Users\Administrator\AppData\Local\ModernWarships\MW资源\MW解包有益资源\contentseparated_assets_ui_eventhub\`
2. 里面的文件命名规律是 `event_{activityId}_widget.png`（机密货物类/筹码类/无人机补给类）
3. 过滤掉已在 index.json 中存在的 ID，剩下的就是新活动候选
4. 逐个读取图片，与截图中的活动预览图对比，确认匹配
5. 旗舰宝箱类的预览图在另一目录（`contentseparated_assets_activities/`），文件名为 `lootbox_activity_{activityId}_widget.png`

**确认 ID 后**，在 index.json 开头插入：
```json
{
  "id": "xx103",
  "gacha_type": "机密货物类",
  "name": "活动中文名",
  "nameEn": "Activity English Name",
  "formattedDate": "2026年4月"
}
```

### 第2种：抽奖物品概率界面截图

（待补充）

### 第3种：（待补充）

---

## 各类活动 JSON 格式

### 筹码类 (chip/)

```json
{
  "id": "ag102",
  "gacha_type": "筹码类",
  "metadata": { "name": "活动名", "formattedDate": "2026年3月", "nameEn": "..." },
  "items": [ ...物品数组，概率之和 = 100... ]
}
```

### 机密货物类 / 无人机补给类 (cargo/)

```json
{
  "id": "be102",
  "gacha_type": "机密货物类",
  "metadata": { "name": "...", "formattedDate": "...", "nameEn": "..." },
  "cargos": [
    { "type": "gameplay", "metadata": { "name": "货运无人机" }, "items": [...] },
    { "type": "rm",       "metadata": { "name": "机密货物" },   "items": [...] }
  ]
}
```

### 旗舰宝箱类 (flagship/)

```json
{
  "id": "la101",
  "gacha_type": "旗舰宝箱类",
  "metadata": { "name": "...", "formattedDate": "...", "nameEn": "..." },
  "lootboxes": [
    { "type": "container", "items": [...] },
    { "type": "flagship",  "items": [...] }
  ]
}
```

---

## 物品字段

```json
{
  "id": "VittorioVeneto",
  "name": "[意]维托里奥·维内托(C 550)",
  "nameEn": "IT Vittorio Veneto (C 550)",
  "type": "战舰",
  "rarity": "epic",
  "probability": 0.1,
  "limit": 1,
  "image": "https://..."   // 可选，特殊物品才填
}
```

- `limit: 0` = 无限量
- 每个奖池内所有 `probability` 之和 = 100

---

## 装饰类物品的识别与 ID 查找

截图中三种容易混淆的装饰类物品，必须通过**视觉外观**区分，不能只靠名字猜：

| 类型 | 视觉特征 | 文件位置 | ID 规律 |
|------|---------|---------|--------|
| **贴花** | 卡通/动漫风格插图贴纸（角色、机甲、图案等），透明背景 | `contentseparated_assets_decals/` | `decal_events{期数}{rarity}{序号}` 例：`decal_events102epic3` |
| **头像** | 写实/半写实人物肖像，方形带背景 | `avataricons/AvatarPortrait_*.png` | `AvatarPortrait_{名称}` 例：`AvatarPortrait_Jinjoo` |
| **涂装** | 船体皮肤，画在船壳上的艺术图案，内容多样：几何图案（如 Camo_la102Epic 的绿色刻面三叶草）、插画场景（如 Camo_Clover 的三叶草+马蹄铁）、机甲/角色artwork（如 Camo_LegendaryMecha 的机甲头像）；方形预览图，背景通常为深色 | `camouflages/Camo_*.png` | `Camo_{名称}` 例：`Camo_Clover` |

### 贴花 ID 查找流程

1. 确认是贴花后，根据活动期数定位文件：`decal_events{N}*`（N = 活动编号，如 la102 → events102）
2. 稀有度**直接写在文件名里**：`rare` / `epic` / `legendary` / `uncommon`
3. 逐个读取图片与截图对比，序号（1/2/3）无法从名字判断，必须看图确认
4. 注意：贴花的 rarity 从文件名读取，`uncommon` 对应游戏内显示为 `rare`（稀有）

### 头像 ID 查找流程

1. 在 `avataricons/` 目录找 `AvatarPortrait_` 开头的文件
2. 活动专属头像通常带活动标识，如 `AvatarPortrait_la101Male`、`AvatarPortrait_be102EPPEpic`
3. 读取图片与截图对比确认

### 涂装 ID 查找流程

1. 在 `camouflages/` 目录找 `Camo_` 开头的文件
2. 可先在 CSV（`裝飾品/涂装.csv`）中搜索中文名，获取 ID
3. 新涂装可能不在 CSV 中，需去 `camouflages/` 目录翻图确认

---

## OCR 识别注意事项

截图中的中文字符 OCR 时容易出错（如"霄"被读成"膏"）。搜索 CSV 时：
- **用单字检索**，不要用完整词组。例如搜"霄"而非"赤霄"
- 确认结果后再填入 JSON

---

## ID 查找方法

ID 来自爬取数据 CSV 的 `id` 列，大小写完全一致。CSV 在：
`D:\Users\Administrator\AppData\Local\ModernWarships\MW资源\MW数据站爬虫\爬取数据\`

```
├── 战舰.csv
├── 武器/ → 导弹.csv、主炮.csv、火箭炮.csv、自卫炮.csv、防空设备.csv、鱼雷发射器.csv...
├── 航空器/ → 攻击机.csv、直升机.csv、轰炸机.csv...
└── 裝飾品/ → 涂装.csv、头像.csv、旗帜.csv、头衔.csv
```

**稀有度映射**（CSV → JSON）：传说→`legendary`，史诗→`epic`，稀有→`rare`，普通→`common`

**贴花**：ID 来自解包图片文件名，规律：`decal_events{期数}rare{N}`

---

## 常用固定 ID

| ID | 名称 |
|----|------|
| `currency_gachacoins` | 筹码（筹码类专用） |
| `currency_premium_lootboxkey` | 旗舰钥匙 |
| `currency_common_lootboxkey` | 普通钥匙 |
| `bigevent_currency_gacha_rm` | 授权密钥（机密货物类） |
| `bigevent_currency_gacha_gameplay` | 无人机电池（机密货物类） |
| `Drone_Fob` | 遥控器（无人机补给类） |
| `Authorization_Key` | 开锁器（无人机补给类旧式） |
| `Hard` | 黄金 |
| `Artstorm` | 艺术硬币 |
| `Soft` | 美金 |
| `Upgrades` | 升级芯片 |
| `Token` | 代币 |
| `PremiumRepairKit` | 高级修理包 |
| `PremiumMissileDecoy` | 高级导弹诱饵 |
| `MissileDecoy` | 导弹诱饵 |
| `EngineBoost` | 引擎过载 |
| `TankSmokeBombs` | 烟幕 |
| `ElectronicWarfare` | 电子对抗 |
| `PremiumTorpedoDecoy` | 高级鱼雷诱饵 |
| `RepairKit` | 修理包 |
