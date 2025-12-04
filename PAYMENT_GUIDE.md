# 支付系统接入指南

## 目录结构

```
项目根目录/
├── lib/payment/
│   ├── signUtil.js          # 签名算法工具
│   └── orderStore.js        # 订单存储（内存版，可升级为数据库）
├── pages/api/payment/
│   ├── create.js            # 发起支付接口
│   ├── notify.js            # 支付回调接口（核心！）
│   └── query.js             # 查询订单接口
├── src/hooks/
│   └── usePayment.js        # 支付 Hook
├── src/components/Payment/
│   └── PaymentModal.jsx     # 支付弹窗组件
└── .env.local               # 环境变量配置
```

---

## 快速开始

### 1. 安装依赖

```bash
# 安装 Next.js 项目依赖
npm install next react react-dom
```

### 2. 配置环境变量

创建 `.env.local` 文件（根目录）：

```bash
# 支付配置
PAYMENT_APP_ID=你的应用ID
PAYMENT_APP_SECRET=你的应用密钥

# 回调地址（生产环境）
NEXT_PUBLIC_PAYMENT_NOTIFY_URL=https://mw.lingflow.cn/api/payment/notify

# CDN 配置（可选）
NEXT_PUBLIC_CDN_BASE_URL=
```

**获取 APP_ID 和 APP_SECRET**：
- 登录支付平台后台：https://open.h5zhifu.com
- 在「设置」页面查看应用 ID
- 生成应用密钥（仅显示一次，请妥善保管）

### 3. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`

---

## API 路由说明

### 1. 发起支付

**接口地址**：`POST /api/payment/create`

**请求体**：
```json
{
  "amount": 100,                    // 金额（分），必填
  "description": "购买筹码",         // 商品描述，必填
  "pay_type": "alipay",             // 支付类型：alipay | wechat，必填
  "attach": "{\"userId\":\"123\"}"  // 自定义数据（可选）
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "out_trade_no": "MW1703123456789ABC",
    "trade_no": "201907098484845164151",
    "jump_url": "http://jump_url.com/jump_url",
    "expire_time": "2025-01-23 04:13:12"
  }
}
```

**前端调用**：
```javascript
const response = await fetch('/api/payment/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    description: '购买筹码',
    pay_type: 'alipay'
  })
})
const result = await response.json()

// 跳转到支付页面
window.location.href = result.data.jump_url
```

---

### 2. 支付回调（核心！）

**接口地址**：`POST /api/payment/notify`

**回调地址配置**：`https://mw.lingflow.cn/api/payment/notify`

**支付平台回调参数**：
```json
{
  "trade_no": "201907098484845164151",
  "out_trade_no": "MW1703123456789ABC",
  "amount": 100,
  "status": "success",
  "pay_time": "2025-01-23 04:13:12",
  "attach": "{\"userId\":\"123\"}",
  "sign": "ABCD1234..."
}
```

**处理流程**：
1. 验证签名（防伪造）
2. 查询订单
3. 检查订单状态（防重复处理）
4. 验证金额
5. 执行业务逻辑（发放货币/解锁会员等）
6. 返回 `"success"`

**重要提示**：
- **必须验证签名**，否则可能被伪造请求
- **必须返回 `"success"`**，否则支付平台会重复发送通知
- **必须防止重复处理**，检查订单状态

**自定义业务逻辑**：

编辑 `pages/api/payment/notify.js` 的 `handlePaymentSuccess` 函数：

```javascript
async function handlePaymentSuccess(order, attach) {
  if (attach) {
    const customData = JSON.parse(attach)
    const { userId, itemType, itemCount } = customData

    // 🎯 在这里实现你的业务逻辑
    // 例如：给用户账户添加筹码
    await addUserCurrency(userId, itemType, itemCount)
  }
}
```

---

### 3. 查询订单状态

**接口地址**：`GET /api/payment/query?out_trade_no=订单号`

**响应示例**：
```json
{
  "success": true,
  "data": {
    "out_trade_no": "MW1703123456789ABC",
    "trade_no": "201907098484845164151",
    "status": "paid",
    "amount": 100,
    "description": "购买筹码",
    "pay_type": "alipay",
    "pay_time": "2025-01-23 04:13:12",
    "createdAt": "2025-01-23T04:10:00.000Z",
    "updatedAt": "2025-01-23T04:13:12.000Z"
  }
}
```

**订单状态**：
- `pending` - 待支付
- `paid` - 已支付
- `failed` - 支付失败
- `expired` - 已过期

**前端轮询查询**：
```javascript
const interval = setInterval(async () => {
  const response = await fetch(`/api/payment/query?out_trade_no=${orderNo}`)
  const result = await response.json()

  if (result.data.status === 'paid') {
    clearInterval(interval)
    alert('支付成功！')
  }
}, 2000) // 每 2 秒查询一次
```

---

## 前端集成

### 使用 Hook 方式

```javascript
import { usePayment } from '@/hooks/usePayment'

function MyComponent() {
  const { createPayment, pollPaymentStatus } = usePayment()

  const handlePay = async () => {
    // 1. 发起支付
    const result = await createPayment({
      amount: 100,
      description: '购买筹码',
      pay_type: 'alipay'
    })

    // 2. 跳转到支付页面
    window.location.href = result.jump_url

    // 3. 开始轮询查询支付状态
    pollPaymentStatus(
      result.out_trade_no,
      (order) => console.log('支付成功', order),
      (order) => console.log('支付失败', order)
    )
  }

  return <button onClick={handlePay}>立即支付</button>
}
```

### 使用组件方式

```javascript
import { useState } from 'react'
import { PaymentModal } from '@/components/Payment/PaymentModal'

function MyComponent() {
  const [showPayment, setShowPayment] = useState(false)

  return (
    <>
      <button onClick={() => setShowPayment(true)}>
        充值
      </button>

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

## 部署到 Vercel

### 1. 推送代码到 GitHub

```bash
git add .
git commit -m "feat: 添加支付系统"
git push
```

### 2. 在 Vercel 导入项目

1. 访问 https://vercel.com
2. 点击「Import Project」
3. 选择你的 GitHub 仓库

### 3. 配置环境变量

在 Vercel 项目设置中添加环境变量：

```
PAYMENT_APP_ID=你的应用ID
PAYMENT_APP_SECRET=你的应用密钥
NEXT_PUBLIC_PAYMENT_NOTIFY_URL=https://mw.lingflow.cn/api/payment/notify
```

### 4. 部署

点击「Deploy」，等待部署完成。

### 5. 配置回调地址

在支付平台后台配置回调地址：
```
https://mw.lingflow.cn/api/payment/notify
```

---

## 测试流程

### 1. 本地测试

使用内网穿透工具（如 ngrok）将本地服务暴露到公网：

```bash
ngrok http 3000
# 会生成临时域名：https://abc123.ngrok.io
```

临时配置回调地址：
```
NEXT_PUBLIC_PAYMENT_NOTIFY_URL=https://abc123.ngrok.io/api/payment/notify
```

### 2. 测试支付流程

1. 点击「充值」按钮
2. 选择支付方式和金额
3. 跳转到支付页面
4. 完成支付（使用沙箱账号）
5. 等待回调通知
6. 检查订单状态变为 `paid`

### 3. 查看日志

**Vercel 日志**：
- 访问 Vercel Dashboard
- 进入项目页面
- 点击「Functions」标签
- 查看 API 路由日志

**本地日志**：
- 查看终端输出
- 所有关键步骤都有 `console.log` 输出

---

## 常见问题

### 1. 回调地址无法访问

**问题**：支付平台提示「回调地址无效」

**解决**：
- 确保回调地址是公网可访问的
- 使用 HTTPS（部分支付平台要求）
- 本地开发使用内网穿透工具

### 2. 签名验证失败

**问题**：支付回调时签名验证失败

**解决**：
- 检查 `PAYMENT_APP_SECRET` 是否正确
- 确认签名算法实现正确（参考开发文档）
- 查看日志中的「待签名字符串」

### 3. 订单重复处理

**问题**：同一笔订单被处理多次

**解决**：
- 在 `notify.js` 中检查订单状态
- 如果已经是 `paid`，直接返回 `"success"`

### 4. 支付后状态未更新

**问题**：用户支付成功，但系统没有发放货币

**解决**：
- 检查回调接口是否正常（查看 Vercel 日志）
- 确认回调地址配置正确
- 检查 `handlePaymentSuccess` 函数是否执行

---

## 生产环境优化

### 1. 使用数据库存储订单

当前订单存储在内存中（重启后丢失），生产环境建议使用：

**MongoDB**：
```javascript
// lib/payment/orderStore.js
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)
const db = client.db('gacha')
const orders = db.collection('orders')

export async function createOrder(orderData) {
  await orders.insertOne(orderData)
}
```

**Vercel KV (Redis)**：
```javascript
import { kv } from '@vercel/kv'

export async function createOrder(orderData) {
  await kv.set(`order:${orderData.out_trade_no}`, orderData)
}
```

### 2. 添加支付日志

记录所有支付操作，便于排查问题：

```javascript
// lib/payment/logger.js
export function logPayment(action, data) {
  console.log(`[支付日志] ${action}`, {
    timestamp: new Date().toISOString(),
    ...data
  })

  // 写入文件或数据库
}
```

### 3. 添加监控告警

使用 Sentry 或其他监控服务，实时监控支付异常：

```javascript
import * as Sentry from '@sentry/nextjs'

try {
  // 支付逻辑
} catch (error) {
  Sentry.captureException(error)
}
```

---

## 安全建议

1. **永远不要跳过签名验证**
2. **回调接口不要返回敏感信息**
3. **使用 HTTPS**
4. **定期更换 APP_SECRET**
5. **限制回调接口的请求频率（防 DDoS）**

---

## 联系支持

- 支付平台官网：https://open.h5zhifu.com
- 技术文档：https://open.h5zhifu.com/docs
- 客服支持：查看后台联系方式

---

## 附录：签名算法说明

签名算法（参考 `lib/payment/signUtil.js`）：

1. **过滤参数**：去除 `sign` 字段和空值
2. **按字母排序**：对剩余参数按 key 排序
3. **拼接字符串**：`key1=value1&key2=value2`
4. **追加密钥**：`拼接结果&key=APP_SECRET`
5. **MD5 加密**：对最终字符串进行 MD5 加密
6. **转大写**：将结果转为大写

示例：
```javascript
// 原始参数
{
  app_id: 123456,
  amount: 100,
  pay_type: 'alipay'
}

// 排序拼接
"amount=100&app_id=123456&pay_type=alipay"

// 追加密钥
"amount=100&app_id=123456&pay_type=alipay&key=YOUR_SECRET"

// MD5 加密并转大写
"ABCD1234EFGH5678..."
```
