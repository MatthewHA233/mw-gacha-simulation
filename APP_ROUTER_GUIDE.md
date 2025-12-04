# Next.js App Router 完整指南

## 🎯 为什么使用 App Router

Next.js 14 推荐使用 **App Router**（`app/` 目录），这是最新的路由系统。

### App Router vs Pages Router

| 特性 | Pages Router (旧) | App Router (新) ✅ |
|-----|------------------|-------------------|
| 目录 | `pages/` | `app/` |
| 路由文件 | `pages/index.jsx` | `app/page.jsx` |
| 布局 | `_app.jsx` | `layout.jsx` |
| API 路由 | `pages/api/xxx.js` | `app/api/xxx/route.js` |
| 服务端组件 | ❌ | ✅ 默认 |
| 流式渲染 | ❌ | ✅ |
| 性能 | 较慢 | 更快 |
| 官方推荐 | 已过时 | ✅ 最新 |

---

## 📁 项目结构

```
项目根目录/
├── app/                                    # App Router 目录
│   ├── layout.jsx                          # 根布局（全局）
│   ├── page.jsx                            # 首页 (/)
│   │
│   ├── gacha/[type]/[activityId]/         # 抽卡页面
│   │   └── page.jsx                        # /gacha/chip/ag97
│   │
│   ├── test/
│   │   ├── lootbox-animation/
│   │   │   └── page.jsx                    # /test/lootbox-animation
│   │   └── milestone-toast/
│   │       └── page.jsx                    # /test/milestone-toast
│   │
│   ├── horizn/
│   │   ├── page.jsx                        # /horizn
│   │   ├── admin/
│   │   │   └── page.jsx                    # /horizn/admin
│   │   └── [yearMonth]/
│   │       └── page.jsx                    # /horizn/2025-01
│   │
│   └── api/                                # API 路由
│       └── payment/
│           ├── create/
│           │   └── route.js                # POST /api/payment/create
│           ├── notify/
│           │   └── route.js                # POST /api/payment/notify
│           └── query/
│               └── route.js                # GET /api/payment/query
│
├── src/                                     # 源代码（组件、hooks、utils）
├── lib/                                     # 库文件（支付工具等）
├── public/                                  # 静态资源
└── next.config.mjs                          # Next.js 配置
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`：

```bash
# 支付配置
PAYMENT_APP_ID=你的应用ID
PAYMENT_APP_SECRET=你的应用密钥
NEXT_PUBLIC_PAYMENT_NOTIFY_URL=https://mw.lingflow.cn/api/payment/notify

# CDN 配置
NEXT_PUBLIC_CDN_BASE_URL=
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`

---

## 📝 路由规则

### 1. 基础路由

| 文件路径 | URL | 说明 |
|---------|-----|------|
| `app/page.jsx` | `/` | 首页 |
| `app/about/page.jsx` | `/about` | 关于页面 |
| `app/test/page.jsx` | `/test` | 测试页面 |

### 2. 动态路由

| 文件路径 | URL 示例 | 获取参数 |
|---------|---------|---------|
| `app/gacha/[type]/[activityId]/page.jsx` | `/gacha/chip/ag97` | `params.type`, `params.activityId` |
| `app/horizn/[yearMonth]/page.jsx` | `/horizn/2025-01` | `params.yearMonth` |

**示例代码**：

```javascript
// app/gacha/[type]/[activityId]/page.jsx
'use client'

export default function GachaPage({ params }) {
  const { type, activityId } = params  // 从 params 获取

  return <div>Type: {type}, Activity: {activityId}</div>
}
```

### 3. API 路由

| 文件路径 | HTTP 方法 | URL |
|---------|----------|-----|
| `app/api/payment/create/route.js` | `POST` | `/api/payment/create` |
| `app/api/payment/notify/route.js` | `POST` | `/api/payment/notify` |
| `app/api/payment/query/route.js` | `GET` | `/api/payment/query` |

**示例代码**：

```javascript
// app/api/payment/create/route.js
import { NextResponse } from 'next/server'

export async function POST(request) {
  const data = await request.json()

  return NextResponse.json({
    success: true,
    data: { ... }
  })
}
```

---

## 🔧 核心概念

### 1. 服务端组件 vs 客户端组件

**默认情况下，App Router 的所有组件都是服务端组件**。

#### 服务端组件（Server Component）

```javascript
// app/page.jsx
// 无需任何标记，默认就是服务端组件

export default function Home() {
  // 可以直接访问数据库、读取文件系统
  return <div>首页</div>
}
```

**特点**：
- ✅ 可以直接访问后端资源（数据库、文件系统）
- ✅ 减少客户端 JavaScript 体积
- ❌ 不能使用 `useState`、`useEffect` 等 React Hooks
- ❌ 不能使用浏览器 API（`window`、`localStorage`）

#### 客户端组件（Client Component）

```javascript
// app/gacha/[type]/[activityId]/page.jsx
'use client'  // 👈 添加这个指令

import { useState } from 'react'

export default function GachaPage({ params }) {
  const [count, setCount] = useState(0)  // ✅ 可以使用 Hooks

  return <div>Count: {count}</div>
}
```

**特点**：
- ✅ 可以使用所有 React Hooks
- ✅ 可以使用浏览器 API
- ✅ 可以监听事件（onClick、onChange）
- ❌ 不能直接访问后端资源

**何时使用 `'use client'`**：

| 场景 | 是否需要 |
|-----|---------|
| 使用 `useState`、`useEffect` | ✅ 需要 |
| 使用 `localStorage`、`window` | ✅ 需要 |
| 监听事件（onClick、onChange） | ✅ 需要 |
| 使用第三方客户端库（如 react-hot-toast） | ✅ 需要 |
| 仅展示静态内容 | ❌ 不需要 |
| 直接从数据库读取数据 | ❌ 不需要 |

---

### 2. 布局（Layout）

**根布局**（`app/layout.jsx`）应用于所有页面：

```javascript
// app/layout.jsx
export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <header>全局导航栏</header>
        {children}  {/* 子页面内容 */}
        <footer>全局页脚</footer>
      </body>
    </html>
  )
}
```

**嵌套布局**：

```javascript
// app/gacha/layout.jsx
export default function GachaLayout({ children }) {
  return (
    <div>
      <aside>抽卡侧边栏</aside>
      <main>{children}</main>
    </div>
  )
}
```

---

### 3. 元数据（Metadata）

```javascript
// app/page.jsx
export const metadata = {
  title: '现代战舰抽奖模拟器',
  description: '现代战舰游戏抽卡模拟器',
}

export default function Home() {
  return <div>首页</div>
}
```

动态元数据：

```javascript
// app/gacha/[type]/[activityId]/page.jsx
export async function generateMetadata({ params }) {
  return {
    title: `${params.type} - ${params.activityId}`,
  }
}
```

---

## 🔌 API 路由详解

### 基础用法

```javascript
// app/api/hello/route.js
import { NextResponse } from 'next/server'

// GET 请求
export async function GET(request) {
  return NextResponse.json({ message: 'Hello' })
}

// POST 请求
export async function POST(request) {
  const data = await request.json()
  return NextResponse.json({ received: data })
}
```

### 获取请求参数

**查询参数（Query Params）**：

```javascript
// GET /api/payment/query?out_trade_no=MW123
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const out_trade_no = searchParams.get('out_trade_no')

  return NextResponse.json({ out_trade_no })
}
```

**请求体（Request Body）**：

```javascript
// POST /api/payment/create
export async function POST(request) {
  const { amount, description } = await request.json()

  return NextResponse.json({ amount, description })
}
```

**动态路由参数**：

```javascript
// app/api/users/[id]/route.js
// GET /api/users/123
export async function GET(request, { params }) {
  const { id } = params

  return NextResponse.json({ userId: id })
}
```

### 返回响应

**JSON 响应**：

```javascript
return NextResponse.json({ success: true })
```

**纯文本响应**：

```javascript
return new Response('success', { status: 200 })
```

**自定义状态码**：

```javascript
return NextResponse.json(
  { error: 'Not found' },
  { status: 404 }
)
```

---

## 🎨 与现有代码集成

### 1. 页面组件需要标记 `'use client'`

因为大部分抽卡页面使用了 `useState`、`useEffect`：

```javascript
// app/gacha/[type]/[activityId]/page.jsx
'use client'  // 👈 必须添加

import { GachaPage } from '@/pages/GachaPage'

export default function GachaPageRoute({ params }) {
  return <GachaPage type={params.type} activityId={params.activityId} />
}
```

### 2. Hooks 文件需要标记 `'use client'`

```javascript
// src/hooks/useSound.js
'use client'

export function useSound() {
  // ...
}
```

### 3. 使用 `localStorage` 的工具需要判断环境

```javascript
// src/utils/gameStateStorage.js
export function saveGameState(key, data) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data))
  }
}
```

---

## 🚢 部署

### 部署到 Vercel

```bash
# 1. 推送代码
git add .
git commit -m "feat: 迁移到 Next.js App Router"
git push

# 2. 在 Vercel 导入项目
# - 框架：Next.js（自动识别）
# - 构建命令：npm run build（自动）
# - 输出目录：.next（自动）

# 3. 配置环境变量
# PAYMENT_APP_ID=...
# PAYMENT_APP_SECRET=...
# NEXT_PUBLIC_PAYMENT_NOTIFY_URL=https://mw.lingflow.cn/api/payment/notify
```

---

## 📚 路由对比速查表

### React Router → Next.js App Router

| React Router | Next.js App Router | 说明 |
|-------------|-------------------|------|
| `<Route path="/" />` | `app/page.jsx` | 首页 |
| `<Route path="/about" />` | `app/about/page.jsx` | 静态路由 |
| `<Route path="/user/:id" />` | `app/user/[id]/page.jsx` | 动态路由 |
| `useParams()` | `params` (通过 props) | 获取路由参数 |
| `<Link to="/xxx">` | `<Link href="/xxx">` | 跳转链接 |
| `navigate('/xxx')` | `router.push('/xxx')` | 编程式跳转 |
| `<Outlet />` | `{children}` (在 layout.jsx) | 嵌套路由 |

---

## ❓ 常见问题

### 1. `'use client'` 应该加在哪里？

**规则**：只在**需要**客户端功能的文件顶部添加。

- ✅ 使用 Hooks 的组件
- ✅ 使用浏览器 API 的工具
- ❌ 纯展示组件（如布局）

### 2. API 路由文件必须命名为 `route.js`

```
✅ app/api/payment/create/route.js
❌ app/api/payment/create.js
❌ app/api/payment/create/index.js
```

### 3. 页面文件必须命名为 `page.jsx`

```
✅ app/gacha/[type]/[activityId]/page.jsx
❌ app/gacha/[type]/[activityId]/index.jsx
❌ app/gacha/[type]/[activityId].jsx
```

### 4. 如何获取动态路由参数？

```javascript
// ✅ 正确
export default function Page({ params }) {
  const { id } = params
}

// ❌ 错误
export default function Page() {
  const { id } = useParams()  // App Router 中不存在 useParams
}
```

---

## 🎓 学习资源

- **官方文档**：https://nextjs.org/docs/app
- **App Router 教程**：https://nextjs.org/learn
- **示例项目**：https://github.com/vercel/next.js/tree/canary/examples

---

## 🎉 总结

✅ App Router 是 Next.js 的未来
✅ 支持服务端组件，性能更好
✅ API 路由直接集成，无需单独后端
✅ 支付系统完美运行

现在运行 `npm run dev` 开始体验吧！🚀
