import { Analytics } from '@vercel/analytics/react'
import { MilestoneToastProvider } from '@/components/ui/MilestoneToastProvider'
import { AuthProvider } from '@/hooks/useAuth'
import { PendingPaymentWatcher } from '@/components/ui/PendingPaymentWatcher'
import { VersionInitializer } from '@/components/VersionInitializer'
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar'
import { ViewportHeightSync } from '@/components/ViewportHeightSync'
import { MusicProvider } from '@/components/music/MusicProvider'
import '@/App.css'
import '@/index.css'

export const metadata = {
  title: '现代战舰抽奖模拟器',
  description: '现代战舰游戏抽奖模拟器',
  icons: {
    icon: '/MW.png',
  },
  // 安卓「添加到主屏幕」后从桌面打开：全屏 + 横屏（manifest 里的 display / orientation，iPhone 会忽略方向）
  manifest: '/manifest.webmanifest',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // 安卓 Chrome 输入法：默认只缩小可视区域、再把整页往上推来露出输入框（顶上去，收起后还可能错位）。
  // resizes-content 让布局区域直接变矮：fixed 居中的弹窗自动落到键盘上方。背后页面的高度由 ViewportHeightSync
  // 在输入时冻结，不跟着压扁。iPhone 会忽略这一项，照它自己的方式处理。
  interactiveWidget: 'resizes-content',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <script defer src="https://umami.lingflow.cn/script.js" data-website-id="b982957c-d4c7-4e48-af34-e84bf8788261"></script>
      </head>
      <body>
        <ViewportHeightSync />
        <VersionInitializer />
        <ServiceWorkerRegistrar />
        <AuthProvider>
          <MusicProvider>
          <PendingPaymentWatcher />
          <MilestoneToastProvider maxToasts={3} position="bottom-right">
            <div className="w-full h-[var(--app-height,100vh)] overflow-hidden bg-black">
              <Analytics />
              {children}
            </div>
          </MilestoneToastProvider>
          </MusicProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
