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
          <MilestoneToastProvider maxToasts={3} position="top-right">
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
