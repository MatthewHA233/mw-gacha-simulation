# OSS 上传路径规则

## 📍 上传路径格式

```
{OSS_PATH_PREFIX}/horizn/{年月时间戳}/{文件名}.csv
```

### 示例

```
mw-gacha-simulation/horizn/202510/weekly_20251027~20251102.csv
mw-gacha-simulation/horizn/202510/season_2025_10.csv
```

---

## 📂 路径组成

| 部分 | 说明 | 示例 |
|------|------|------|
| `OSS_PATH_PREFIX` | 项目路径前缀（.env配置） | `mw-gacha-simulation` |
| `horizn` | 固定子目录名 | `horizn` |
| `{年月时间戳}` | 格式：YYYYMM（当前年月） | `202510` |
| `{文件名}` | CSV文件原名 | `weekly_20251027~20251102.csv` |

---

## 📄 上传文件类型

| 文件类型 | 文件名格式 | 示例 |
|---------|-----------|------|
| 周活跃度 | `weekly_{开始日期}~{结束日期}.csv` | `weekly_20251027~20251102.csv` |
| 月赛季活跃度 | `season_{年份}_{月份}.csv` | `season_2025_10.csv` |

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
https://assets.lingflow.cn/mw-gacha-simulation/horizn/202510/weekly_20251027~20251102.csv
```

### OSS 原生域名
```
https://lingflow.oss-cn-heyuan.aliyuncs.com/mw-gacha-simulation/horizn/202510/weekly_20251027~20251102.csv
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
