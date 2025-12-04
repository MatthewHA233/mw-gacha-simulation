# 现代战舰抽奖模拟器 - Next.js 版本

## 🎉 迁移完成！

本项目已从 Vite + React Router 成功迁移到 Next.js，并集成了完整的支付系统。

---

## ✨ 新增功能

### 1. 支付系统
- ✅ 支付宝/微信支付接入
- ✅ 安全的签名验证机制
- ✅ 异步回调处理（回调地址：`https://mw.lingflow.cn/api/payment/notify`）
- ✅ 订单状态查询
- ✅ 前端支付组件（PaymentModal）

### 2. API 路由
- ✅ `/api/payment/create` - 发起支付
- ✅ `/api/payment/notify` - 支付回调（核心！）
- ✅ `/api/payment/query` - 查询订单状态

### 3. 性能优化
- ✅ 服务端渲染（SSR）
- ✅ 自动代码分割
- ✅ 图片优化

---

## 📦 项目结构

```
项目根目录/
├── pages/                          # Next.js 页面
│   ├── _app.jsx                    # 全局入口
│   ├── _document.jsx               # HTML 文档
│   ├── index.jsx                   # 首页
│   ├── gacha/[type]/[activityId].jsx  # 抽卡页面
│   └── api/payment/                # API 路由
│       ├── create.js               # 发起支付
│       ├── notify.js               # 支付回调
│       └── query.js                # 查询订单
├── lib/payment/                    # 支付工具
│   ├── signUtil.js                 # 签名算法
│   └── orderStore.js               # 订单存储
├── src/                            # 源代码（与 Vite 版本兼容）
│   ├── components/                 # 组件
│   ├── hooks/                      # Hooks
│   ├── pages/                      # 页面逻辑
│   ├── services/                   # 服务
│   └── utils/                      # 工具
├── public/                         # 静态资源
├── next.config.mjs                 # Next.js 配置
├── .env.local.example              # 环境变量示例
├── PAYMENT_GUIDE.md                # 支付系统文档
├── MIGRATION_GUIDE.md              # 迁移指南
└── README_NEXTJS.md                # 本文档
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
# 方案 1：直接使用新配置
mv next-package.json package.json
npm install

# 方案 2：保留旧配置，手动安装
npm install next react react-dom
```

### 2. 配置环境变量

复制 `.env.local.example` 并重命名为 `.env.local`：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`，填入你的配置：

```bash
# 支付配置
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

## 📚 文档导航

| 文档 | 说明 |
|-----|------|
| **PAYMENT_GUIDE.md** | 支付系统完整文档（API 接口、前端集成、安全建议） |
| **MIGRATION_GUIDE.md** | 从 Vite 迁移到 Next.js 的详细步骤 |
| **CLAUDE.md** | 项目架构文档（原有） |

---

## 🔧 核心代码示例

### 前端调用支付

```javascript
import { usePayment } from '@/hooks/usePayment'

function MyComponent() {
  const { createPayment, pollPaymentStatus } = usePayment()

  const handlePay = async () => {
    // 1. 发起支付
    const result = await createPayment({
      amount: 100,              // 1 元（100 分）
      description: '购买筹码',
      pay_type: 'alipay'        // 或 'wechat'
    })

    // 2. 跳转到支付页面
    window.location.href = result.jump_url

    // 3. 轮询查询支付状态
    pollPaymentStatus(
      result.out_trade_no,
      (order) => console.log('支付成功', order),
      (order) => console.log('支付失败', order)
    )
  }

  return <button onClick={handlePay}>立即支付</button>
}
```

### 使用支付弹窗组件

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
        onSuccess={(order) => {
          alert('支付成功！')
          // 刷新用户余额等
        }}
      />
    </>
  )
}
```

---

## 🛡️ 安全说明

### 签名验证

所有支付回调都经过严格的签名验证，防止伪造请求：

```javascript
// pages/api/payment/notify.js
import { verifySign } from '../../../lib/payment/signUtil'

// 验证签名
if (!verifySign(callbackData, APP_SECRET)) {
  console.error('签名验证失败')
  return res.status(400).send('Invalid signature')
}
```

### 重复处理保护

防止同一订单被多次处理：

```javascript
// 检查订单状态
if (order.status === 'paid') {
  console.log('订单已处理')
  return res.status(200).send('success')
}
```

### 环境变量保护

敏感信息存储在环境变量中，不会提交到 Git：

```bash
# .gitignore
.env.local
```

---

## 🌐 部署到 Vercel

### 1. 推送代码

```bash
git add .
git commit -m "feat: 迁移到 Next.js 并添加支付系统"
git push
```

### 2. 导入项目

1. 访问 https://vercel.com
2. 点击「Import Project」
3. 选择你的 GitHub 仓库
4. 框架选择：**Next.js**

### 3. 配置环境变量

在 Vercel 项目设置中添加：

```
PAYMENT_APP_ID=你的应用ID
PAYMENT_APP_SECRET=你的应用密钥
NEXT_PUBLIC_PAYMENT_NOTIFY_URL=https://mw.lingflow.cn/api/payment/notify
NEXT_PUBLIC_CDN_BASE_URL=你的CDN地址（可选）
```

### 4. 部署

点击「Deploy」，等待部署完成。

### 5. 配置域名

1. 在 Vercel 添加自定义域名：`mw.lingflow.cn`
2. 配置 DNS（按 Vercel 提示操作）
3. 等待 SSL 证书自动配置

### 6. 配置支付回调地址

在支付平台后台配置：

```
https://mw.lingflow.cn/api/payment/notify
```

---

## 🧪 测试流程

### 本地测试（使用内网穿透）

```bash
# 1. 安装 ngrok
# Windows: 下载 https://ngrok.com/download

# 2. 启动本地服务器
npm run dev

# 3. 启动内网穿透
ngrok http 3000

# 4. 临时配置回调地址
# 将 ngrok 生成的地址（如 https://abc123.ngrok.io）配置到环境变量
NEXT_PUBLIC_PAYMENT_NOTIFY_URL=https://abc123.ngrok.io/api/payment/notify
```

### 生产环境测试

1. 部署到 Vercel
2. 配置正式回调地址
3. 使用沙箱账号测试支付流程
4. 查看 Vercel Functions 日志

---

## 📊 功能对比

| 功能 | Vite 版本 | Next.js 版本 |
|-----|----------|-------------|
| 抽卡功能 | ✅ | ✅ |
| 路由系统 | React Router | Next.js 文件路由 |
| API 接口 | ❌ 需要单独后端 | ✅ API Routes |
| 支付系统 | ❌ | ✅ |
| SSR | ❌ | ✅ |
| 部署 | Vercel（仅前端） | Vercel（前端+后端） |
| 回调地址 | ❌ 需要单独服务器 | ✅ 同域名 |

---

## ❓ 常见问题

### 1. 为什么要迁移到 Next.js？

**答**：主要是为了支持 API 路由，实现支付回调。Vite 是纯前端框架，无法处理服务端逻辑。

### 2. 原有功能会受影响吗？

**答**：不会。所有原有功能（抽卡、历史记录、音效等）都已完整保留，95% 的代码无需改动。

### 3. 可以回滚到 Vite 版本吗？

**答**：可以。原有 Vite 配置已备份为 `vite-package.json.bak`，参考 `MIGRATION_GUIDE.md` 中的回滚方案。

### 4. 订单数据存储在哪里？

**答**：当前存储在内存中（重启后丢失），仅用于开发测试。生产环境建议使用数据库（MongoDB/PostgreSQL）或 Vercel KV (Redis)。

### 5. 如何查看支付回调日志？

**答**：
- **本地**：查看终端输出
- **Vercel**：进入项目 → Functions → 选择 `/api/payment/notify`

---

## 🎯 后续优化建议

### 1. 数据库集成

使用 MongoDB 或 Vercel KV 存储订单数据：

```javascript
// lib/payment/orderStore.js
import { kv } from '@vercel/kv'

export async function createOrder(orderData) {
  await kv.set(`order:${orderData.out_trade_no}`, orderData)
}
```

### 2. 用户系统

实现用户注册/登录，关联订单：

```javascript
// 发起支付时携带用户 ID
const result = await createPayment({
  amount: 100,
  description: '购买筹码',
  pay_type: 'alipay',
  attach: JSON.stringify({ userId: currentUser.id })
})
```

### 3. 监控告警

集成 Sentry 监控支付异常：

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### 4. 支付记录页面

创建用户支付记录页面：

```javascript
// pages/payment/history.jsx
export default function PaymentHistory() {
  // 查询用户所有订单
  // 显示支付记录列表
}
```

---

## 📞 技术支持

- **项目文档**：查看 `PAYMENT_GUIDE.md` 和 `MIGRATION_GUIDE.md`
- **Next.js 官方文档**：https://nextjs.org/docs
- **支付平台文档**：https://open.h5zhifu.com/docs
- **GitHub Issues**：提交问题到项目仓库

---

## 📄 许可证

MIT License

---

## 🙏 致谢

感谢所有参与项目开发的贡献者！

---

**祝你开发愉快！🎮**
