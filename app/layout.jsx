import { Analytics } from '@vercel/analytics/react'
import { MilestoneToastProvider } from '@/components/ui/MilestoneToastProvider'
import { AuthProvider } from '@/hooks/useAuth'
import { VersionInitializer } from '@/components/VersionInitializer'
import '@/App.css'
import '@/index.css'

export const metadata = {
  title: '现代战舰抽奖模拟器',
  description: '现代战舰游戏抽卡模拟器',
  icons: {
    icon: '/MW.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <VersionInitializer />
        <AuthProvider>
          <MilestoneToastProvider maxToasts={3} position="top-right">
            <div className="w-full h-screen overflow-hidden bg-black">
              <Analytics />
              {children}
            </div>
          </MilestoneToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
