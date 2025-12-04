# Next.js 迁移指南

## 迁移概述

本项目从 Vite + React Router 迁移到 Next.js，主要目的是：
1. 支持 API 路由（实现支付回调）
2. 提升性能（SSR + 自动优化）
3. 简化部署流程

---

## 快速开始

### 1. 重命名配置文件

```bash
# 重命名 package.json
mv package.json vite-package.json.bak
mv next-package.json package.json

# 重命名配置文件
mv tailwind.config.js tailwind.config.vite.js.bak
mv tailwind.config.next.js tailwind.config.js

mv postcss.config.js postcss.config.vite.js.bak
mv postcss.config.next.js postcss.config.js
```

### 2. 安装依赖

```bash
npm install
```

### 3. 创建 `pages/_app.jsx`

Next.js 的全局入口文件：

```javascript
// pages/_app.jsx
import { Analytics } from '@vercel/analytics/react'
import { MilestoneToastProvider } from '@/components/ui/MilestoneToastProvider'
import '@/App.css'
import '@/index.css'

export default function App({ Component, pageProps }) {
  return (
    <MilestoneToastProvider maxToasts={3} position="top-right">
      <div className="w-full h-screen overflow-hidden bg-black">
        <Analytics />
        <Component {...pageProps} />
      </div>
    </MilestoneToastProvider>
  )
}
```

### 4. 创建 `pages/_document.jsx`

自定义 HTML 文档：

```javascript
// pages/_document.jsx
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="zh-CN">
      <Head>
        <meta charSet="utf-8" />
        <link rel="icon" type="image/png" href="/MW.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
```

### 5. 创建首页

```javascript
// pages/index.jsx
import { HomeRedirect } from '@/components/HomeRedirect'

export default function Home() {
  return <HomeRedirect />
}
```

### 6. 创建抽卡页面

```javascript
// pages/gacha/[type]/[activityId].jsx
import { useRouter } from 'next/router'
import { GachaPage } from '@/pages/GachaPage'

export default function GachaPageRoute() {
  const router = useRouter()
  const { type, activityId } = router.query

  // 等待路由参数加载
  if (!type || !activityId) {
    return <div>Loading...</div>
  }

  return <GachaPage type={type} activityId={activityId} />
}
```

### 7. 修改 `GachaPage.jsx`

从路由参数改为 props：

```javascript
// src/pages/GachaPage.jsx
export function GachaPage({ type, activityId }) {
  // 移除 useParams
  // const { type, activityId } = useParams()

  // 其他代码保持不变
  // ...
}
```

### 8. 修改客户端专属代码

所有使用 `window`、`localStorage`、`document` 的组件需要添加 `'use client'`：

```javascript
// src/hooks/useSound.js
'use client'

import { useRef, useEffect } from 'react'

export function useSound() {
  // ... 原有代码
}
```

```javascript
// src/utils/gameStateStorage.js
'use client'

export function saveGameState(key, data) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data))
  }
}
```

### 9. 修改环境变量

```javascript
// src/utils/constants.js
// 修改前
export const CDN_BASE_URL = import.meta.env.VITE_CDN_BASE_URL || ''

// 修改后
export const CDN_BASE_URL = process.env.NEXT_PUBLIC_CDN_BASE_URL || ''
```

### 10. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`

---

## 路由对比

### React Router → Next.js

| React Router | Next.js | 说明 |
|-------------|---------|------|
| `<Route path="/" />` | `pages/index.jsx` | 首页 |
| `<Route path="/gacha/:type/:activityId" />` | `pages/gacha/[type]/[activityId].jsx` | 动态路由 |
| `<Route path="/test/lootbox-animation" />` | `pages/test/lootbox-animation.jsx` | 静态路由 |
| `useParams()` | `useRouter().query` | 获取路由参数 |
| `<Link to="/xxx">` | `<Link href="/xxx">` | 跳转链接 |
| `navigate('/xxx')` | `router.push('/xxx')` | 编程式跳转 |

---

## 需要修改的文件清单

### 1. 组件中的跳转

```javascript
// 修改前（React Router）
import { Link } from 'react-router-dom'
<Link to="/gacha/chip/ag97">跳转</Link>

// 修改后（Next.js）
import Link from 'next/link'
<Link href="/gacha/chip/ag97">跳转</Link>
```

### 2. 客户端专属 Hook

在所有使用以下 API 的文件顶部添加 `'use client'`：

- `window`
- `document`
- `localStorage`
- `sessionStorage`
- `navigator`
- 音频播放（`new Audio()`）
- 事件监听（`addEventListener`）

示例文件：
- `src/hooks/useSound.js`
- `src/hooks/useActivityList.js`
- `src/hooks/useGachaData.js`
- `src/utils/gameStateStorage.js`
- 所有包含 `useState`、`useEffect` 的组件

### 3. 环境变量

全局搜索替换：

```bash
# 查找
import.meta.env.VITE_

# 替换为
process.env.NEXT_PUBLIC_
```

---

## 部署清单

### 1. 本地测试

```bash
npm run build
npm start
```

### 2. 配置 Vercel

```bash
# vercel.json（可选）
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

### 3. 环境变量

在 Vercel 项目设置中添加：

```
NEXT_PUBLIC_CDN_BASE_URL=你的CDN地址
PAYMENT_APP_ID=支付应用ID
PAYMENT_APP_SECRET=支付密钥
NEXT_PUBLIC_PAYMENT_NOTIFY_URL=https://mw.lingflow.cn/api/payment/notify
```

### 4. 域名配置

在 Vercel 添加自定义域名：`mw.lingflow.cn`

---

## 迁移验证清单

- [ ] 首页正常加载
- [ ] 侧边栏活动列表正常
- [ ] 点击活动可以跳转
- [ ] 抽卡功能正常
- [ ] 音效正常播放
- [ ] 本地存储正常
- [ ] 支付弹窗正常显示
- [ ] API 路由正常响应（`/api/payment/*`）
- [ ] 支付回调正常（测试环境）
- [ ] 部署后访问正常

---

## 常见问题

### 1. `window is not defined`

**问题**：服务端渲染时访问 `window` 对象

**解决**：
```javascript
'use client' // 添加到文件顶部

// 或者包裹判断
if (typeof window !== 'undefined') {
  // 使用 window
}
```

### 2. `import.meta is not defined`

**问题**：Vite 特有的 API

**解决**：
```javascript
// 修改前
import.meta.env.VITE_XXX

// 修改后
process.env.NEXT_PUBLIC_XXX
```

### 3. 路由跳转无效

**问题**：使用了 React Router 的 API

**解决**：
```javascript
// 修改前
import { useNavigate } from 'react-router-dom'
const navigate = useNavigate()
navigate('/xxx')

// 修改后
import { useRouter } from 'next/router'
const router = useRouter()
router.push('/xxx')
```

### 4. 样式不生效

**问题**：全局样式未导入

**解决**：
在 `pages/_app.jsx` 导入：
```javascript
import '@/App.css'
import '@/index.css'
```

---

## 回滚方案

如果迁移遇到问题，可以快速回滚：

```bash
# 恢复 Vite 配置
mv package.json next-package.json.bak
mv vite-package.json.bak package.json

mv tailwind.config.js tailwind.config.next.js.bak
mv tailwind.config.vite.js.bak tailwind.config.js

mv postcss.config.js postcss.config.next.js.bak
mv postcss.config.vite.js.bak postcss.config.js

# 重新安装依赖
npm install

# 启动 Vite
npm run dev
```

---

## 逐步迁移建议

如果不想一次性全部迁移，可以分阶段进行：

### 阶段 1：仅添加 API 路由

1. 保持 Vite 前端不变
2. 在 `server/` 目录创建独立的 Express 后端
3. 部署后端到独立服务器
4. 配置 CORS 允许前端跨域访问

### 阶段 2：前端迁移到 Next.js

1. 按照本文档完成迁移
2. 本地测试通过后部署到测试域名
3. 确认无误后切换 DNS 到新域名

---

## 技术支持

如果遇到问题，可以：
1. 查看 Next.js 官方文档：https://nextjs.org/docs
2. 参考本项目的支付系统文档：`PAYMENT_GUIDE.md`
3. 提交 GitHub Issue
