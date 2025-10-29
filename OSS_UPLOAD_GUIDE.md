# OSS 上传路径规则

## 📍 上传路径格式

```
{OSS_PATH_PREFIX}/horizn/{游戏月编号}/{文件名}.csv
```

### 示例

```
mw-gacha-simulation/horizn/202510/weekly_202510.csv
mw-gacha-simulation/horizn/202510/season_202510.csv
mw-gacha-simulation/horizn/202510/index.json
```

---

## 📂 路径组成

| 部分 | 说明 | 示例 |
|------|------|------|
| `OSS_PATH_PREFIX` | 项目路径前缀（.env配置） | `mw-gacha-simulation` |
| `horizn` | 固定子目录名 | `horizn` |
| `{游戏月编号}` | 格式：YYYYMM（游戏月，非自然月） | `202510` |
| `{文件名}` | CSV/JSON文件原名 | `weekly_202510.csv` |

---

## 🎮 游戏月说明

**游戏月的定义**：
- 游戏日从每天早上 **8:00** 开始
- 游戏月以游戏日的年月（YYYYMM）作为编号
- 即使跨自然月，只要游戏日属于同一个YYYYMM，就属于同一个游戏月

**示例**：
- 2025-11-01 07:30 → 游戏日 20251031 → 属于游戏月 202510
- 2025-11-01 08:00 → 游戏日 20251101 → 属于游戏月 202511

---

## 📄 上传文件类型

| 文件类型 | 文件名格式 | 示例 | 说明 |
|---------|-----------|------|------|
| 周活跃度 | `weekly_{游戏月}.csv` | `weekly_202510.csv` | 按游戏月组织的周活跃度时间序列 |
| 赛季活跃度 | `season_{游戏月}.csv` | `season_202510.csv` | 按游戏月组织的赛季活跃度时间序列 |
| 索引文件 | `index.json` | `index.json` | 记录所有游戏月的起止日期 |

---

## ⏰ 自动上传时机

### 白天模式（8:00-1:00）
- **间隔**：10分钟（每隔一次循环）
- **触发**：第1,3,5,7,9...次工作流循环

### 夜间模式（1:00-8:00）
- **间隔**：1小时（每隔12次循环）
- **触发**：第1,13,25,37...次工作流循环

---

## 🌐 访问URL

### 自定义域名（推荐）
```
https://assets.lingflow.cn/mw-gacha-simulation/horizn/202510/weekly_202510.csv
https://assets.lingflow.cn/mw-gacha-simulation/horizn/202510/season_202510.csv
https://assets.lingflow.cn/mw-gacha-simulation/horizn/index.json
```

### OSS 原生域名
```
https://lingflow.oss-cn-heyuan.aliyuncs.com/mw-gacha-simulation/horizn/202510/weekly_202510.csv
https://lingflow.oss-cn-heyuan.aliyuncs.com/mw-gacha-simulation/horizn/202510/season_202510.csv
https://lingflow.oss-cn-heyuan.aliyuncs.com/mw-gacha-simulation/horizn/index.json
```

---

## 🔧 手动上传命令

```bash
# 交互式上传（需要确认）
python data/UploadTimeSeriesOSS.py

# 自动上传由 FullPipeline.py 自动调用
# 无需手动执行
```

---

## 📊 流量预估

| 时段 | 上传频率 | 每天次数 | 日流量 | 月流量 |
|------|---------|---------|--------|--------|
| 白天（17h） | 10分钟 | ~102次 | 31 MB | ~0.9 GB |
| 夜间（7h） | 1小时 | ~7次 | 2 MB | ~0.06 GB |
| **合计** | - | **~109次** | **~33 MB** | **~1 GB** |

---

## ⚙️ 配置文件

### .env 配置
```bash
OSS_ACCESS_KEY_ID=你的AccessKey
OSS_ACCESS_KEY_SECRET=你的Secret
OSS_BUCKET_NAME=lingflow
OSS_ENDPOINT=oss-cn-heyuan.aliyuncs.com
OSS_PATH_PREFIX=mw-gacha-simulation
OSS_CUSTOM_DOMAIN=https://assets.lingflow.cn
```

### FullPipeline.py 配置
```python
OSS_DAYTIME_INTERVAL = 2      # 白天：每1+2倍数次循环（10分钟）
OSS_NIGHTTIME_INTERVAL = 12   # 夜间：每1+12倍数次循环（1小时）
OSS_NIGHTTIME_START = 1       # 夜间开始：1点
OSS_NIGHTTIME_END = 8         # 夜间结束：8点
```
