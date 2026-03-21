import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { useEffect, useRef } from 'react'
import { GachaPage } from './pages/GachaPage'
import { LootboxAnimationDemo } from './pages/LootboxAnimationDemo'
import MilestoneToastDemo from './pages/MilestoneToastDemo'
import { MilestoneToastProvider } from './components/ui/MilestoneToastProvider'
import { AuthProvider } from './hooks/useAuth'
import { HomeRedirect } from './components/HomeRedirect'
import { loadVersionHistory, clearConfigCache } from './services/cdnService'
import { setAppVersion, getAppVersion } from './utils/version'
import { checkAndResetIfNeeded, getStoredVersion } from './utils/gameStateStorage'
import './App.css'

function App() {
  // 防止 StrictMode 重复执行版本检查
  const versionCheckStartedRef = useRef(false)

  // 在应用启动时加载版本号并执行版本检查
  useEffect(() => {
    // 如果已经开始执行，直接返回（防止 StrictMode 重复触发）
    if (versionCheckStartedRef.current) {
      return
    }
    versionCheckStartedRef.current = true

    const initializeVersion = async () => {
      try {
        // 1. 异步加载真实版本号
        const data = await loadVersionHistory()
        if (data?.currentVersion) {
          setAppVersion(data.currentVersion)

          // 2. 加载完成后执行版本检查
          const resetResult = checkAndResetIfNeeded()

          // 3. 如果触发了重置，设置 sessionStorage 标记
          if (resetResult?.wasReset) {
            sessionStorage.setItem('mw_gacha_version_updated', JSON.stringify({
              newVersion: resetResult.newVersion,
              oldVersion: resetResult.oldVersion
            }))
          }
        }
      } catch (error) {
        console.error('Failed to initialize version:', error)
      }
    }

    initializeVersion()

    // 🔧 开发者工具：挂载到全局 window 对象，方便调试
    if (import.meta.env.DEV) {
      window.__MW_DEBUG__ = {
        getCurrentVersion: () => {
          const info = {
            current: getAppVersion(),
            stored: getStoredVersion()
          }
          console.log('Version Info:', info)
          return info
        },
        refreshVersion: async () => {
          clearConfigCache('version-history')
          clearConfigCache('site-info')
          const data = await loadVersionHistory()
          setAppVersion(data.currentVersion)
          console.log('Refreshed to:', data.currentVersion)
          location.reload()
        },
        forceUpdate: (newVersion) => {
          localStorage.removeItem('mw_gacha_app_version')
          setAppVersion(newVersion)
          checkAndResetIfNeeded()
          location.reload()
        }
      }
    }
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
      <MilestoneToastProvider maxToasts={3} position="top-right">
        <div className="w-full h-screen overflow-hidden bg-black">
          <Analytics />

          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/test" element={<Navigate to="/test/lootbox-animation" replace />} />
            <Route path="/test/lootbox-animation" element={<LootboxAnimationDemo />} />
            <Route path="/test/milestone-toast" element={<MilestoneToastDemo />} />
            {/* HORIZN 已迁移至 horizn.cn */}
            <Route path="/gacha/:type/:activityId" element={<GachaPage />} />
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </div>
      </MilestoneToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
