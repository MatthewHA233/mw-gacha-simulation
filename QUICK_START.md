# 🚀 快速开始指南

## 项目已迁移到 Next.js 14 (App Router)

本项目现已使用 **Next.js 14 App Router** 架构，并集成了完整的支付系统。

---

## 📦 安装与运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
# 复制示例文件
cp .env.local.example .env.local

# 编辑 .env.local，填入你的配置
```

`.env.local` 内容：

```bash
# 支付配置（必填）
PAYMENT_APP_ID=你的应用ID
PAYMENT_APP_SECRET=你的应用密钥

# 回调地址（生产环境）
NEXT_PUBLIC_PAYMENT_NOTIFY_URL=https://mw.lingflow.cn/api/payment/notify

# CDN 配置（可选）
NEXT_PUBLIC_CDN_BASE_URL=
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`

### 4. 构建生产版本

```bash
npm run build
npm start
```

---

## 📁 项目结构

```
app/                           # Next.js App Router 目录
├── layout.jsx                 # 根布局
├── page.jsx                   # 首页
├── gacha/[type]/[activityId]/ # 抽卡页面
├── horizn/                    # Horizn 数据页面
├── test/                      # 测试页面
└── api/payment/               # 支付 API
    ├── create/route.js        # 发起支付
    ├── notify/route.js        # 支付回调（核心！）
    └── query/route.js         # 查询订单

src/                           # 源代码
├── components/                # 组件
├── hooks/                     # Hooks
├── pages/                     # 页面逻辑
├── services/                  # 服务
└── utils/                     # 工具

lib/payment/                   # 支付工具
├── signUtil.js                # 签名算法
└── orderStore.js              # 订单存储

public/                        # 静态资源
```

---

## 📚 文档导航

| 文档 | 说明 |
|-----|------|
| **APP_ROUTER_GUIDE.md** | App Router 完整指南（必读！） |
| **PAYMENT_GUIDE.md** | 支付系统完整文档 |
| **MIGRATION_GUIDE.md** | 迁移指南（了解变更） |
| **CLAUDE.md** | 项目架构文档 |

---

## 🎯 核心功能

### 1. 抽卡系统
- ✅ 筹码类抽卡
- ✅ 旗舰宝箱类抽卡
- ✅ 机密货物类抽卡
- ✅ 历史记录
- ✅ 音效系统

### 2. 支付系统（新增！）
- ✅ 支付宝/微信支付
- ✅ 支付回调处理
- ✅ 订单状态查询
- ✅ 前端支付组件

### 3. 数据展示
- ✅ Horizn 数据可视化
- ✅ 动态图表

---

## 🔧 常用命令

```bash
# 开发模式（Next.js）
npm run dev

# 生产构建
npm run build
npm start

# 代码检查
npm run lint

# 如需回滚到 Vite（备用）
npm run dev:vite
npm run build:vite
```

---

## 🌐 路由说明

| URL | 页面 |
|-----|------|
| `/` | 首页（自动重定向到最新活动） |
| `/gacha/chip/ag97` | 筹码类抽卡 - 暗影交易 |
| `/gacha/flagship/la96` | 旗舰宝箱类抽卡 |
| `/horizn` | Horizn 数据首页 |
| `/horizn/2025-01` | Horizn 2025年1月数据 |
| `/test/lootbox-animation` | 宝箱动画测试 |
| `/test/milestone-toast` | 里程碑 Toast 测试 |

**API 路由**：
- `POST /api/payment/create` - 发起支付
- `POST /api/payment/notify` - 支付回调
- `GET /api/payment/query` - 查询订单

---

## 🔐 环境变量说明

### 必填项

| 变量名 | 说明 | 示例 |
|-------|------|------|
| `PAYMENT_APP_ID` | 支付平台应用 ID | `123456` |
| `PAYMENT_APP_SECRET` | 支付平台密钥 | `abc123...` |
| `NEXT_PUBLIC_PAYMENT_NOTIFY_URL` | 支付回调地址 | `https://mw.lingflow.cn/api/payment/notify` |

### 可选项

| 变量名 | 说明 | 默认值 |
|-------|------|-------|
| `NEXT_PUBLIC_CDN_BASE_URL` | CDN 基础地址 | `''` (使用 public 目录) |

**注意**：
- `NEXT_PUBLIC_` 前缀的变量会暴露给客户端
- 敏感信息（如 `PAYMENT_APP_SECRET`）不要使用 `NEXT_PUBLIC_` 前缀

---

## 💳 支付系统快速测试

### 方式 1：使用组件

```javascript
import { useState } from 'react'
import { PaymentModal } from '@/components/Payment/PaymentModal'

function MyComponent() {
  const [showPayment, setShowPayment] = useState(false)

  return (
    <>
      <button onClick={() => setShowPayment(true)}>充值</button>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={(order) => alert('支付成功')}
      />
    </>
  )
}
```

### 方式 2：使用 Hook

```javascript
import { usePayment } from '@/hooks/usePayment'

function MyComponent() {
  const { createPayment, pollPaymentStatus } = usePayment()

  const handlePay = async () => {
    const result = await createPayment({
      amount: 100,              // 1 元（100 分）
      description: '购买筹码',
      pay_type: 'alipay'
    })

    window.location.href = result.jump_url  // 跳转到支付页面

    // 轮询查询支付状态
    pollPaymentStatus(
      result.out_trade_no,
      (order) => console.log('支付成功', order),
      (order) => console.log('支付失败', order)
    )
  }

  return <button onClick={handlePay}>立即支付</button>
}
```

---

## 🚢 部署到 Vercel

### 1. 推送代码

```bash
git add .
git commit -m "feat: 迁移到 Next.js App Router"
git push
```

### 2. 导入项目

1. 访问 https://vercel.com
2. 点击「Import Project」
3. 选择你的 GitHub 仓库
4. 框架自动识别为 **Next.js**

### 3. 配置环境变量

在 Vercel 项目设置中添加：

```
PAYMENT_APP_ID=你的应用ID
PAYMENT_APP_SECRET=你的应用密钥
NEXT_PUBLIC_PAYMENT_NOTIFY_URL=https://mw.lingflow.cn/api/payment/notify
```

### 4. 部署

点击「Deploy」，等待部署完成。

### 5. 配置域名

1. 在 Vercel 添加自定义域名：`mw.lingflow.cn`
2. 按照提示配置 DNS
3. 等待 SSL 证书自动配置

### 6. 配置支付回调地址

在支付平台后台配置回调地址：

```
https://mw.lingflow.cn/api/payment/notify
```

---

## 🐛 常见问题

### 1. 启动报错 `Module not found`

**原因**：依赖未安装

**解决**：
```bash
rm -rf node_modules package-lock.json
npm install
```

### 2. 支付回调无法访问

**原因**：本地开发时，支付平台无法访问 `localhost`

**解决**：
```bash
# 使用内网穿透工具
npx ngrok http 3000

# 临时配置回调地址为 ngrok 生成的地址
# 例如：https://abc123.ngrok.io/api/payment/notify
```

### 3. 页面报错 `'use client' is required`

**原因**：组件使用了客户端 API（如 `useState`），但未标记为客户端组件

**解决**：在文件顶部添加 `'use client'`
```javascript
'use client'

import { useState } from 'react'

export default function MyComponent() {
  // ...
}
```

### 4. API 路由 404

**原因**：文件命名错误

**解决**：API 路由文件必须命名为 `route.js`
```
✅ app/api/payment/create/route.js
❌ app/api/payment/create.js
```

---

## 📞 获取帮助

- **App Router 指南**：查看 `APP_ROUTER_GUIDE.md`
- **支付系统文档**：查看 `PAYMENT_GUIDE.md`
- **Next.js 官方文档**：https://nextjs.org/docs
- **支付平台文档**：https://open.h5zhifu.com/docs

---

## ✅ 验证清单

部署前请确认：

- [ ] 依赖已安装 (`npm install`)
- [ ] 环境变量已配置 (`.env.local`)
- [ ] 本地开发正常 (`npm run dev`)
- [ ] 构建成功 (`npm run build`)
- [ ] 支付回调地址已配置（支付平台后台）
- [ ] Vercel 环境变量已设置
- [ ] 域名已配置并生效

---

**祝你开发愉快！🎮**

有问题随时查看文档或提 Issue。
