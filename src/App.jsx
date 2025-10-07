import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { GachaPage } from './pages/GachaPage'
import { LootboxAnimationDemo } from './pages/LootboxAnimationDemo'
import './App.css'

/**
 * 主应用组件
 * 配置路由和全局组件
 */
function App() {
  return (
    <BrowserRouter>
      <div className="w-full h-screen overflow-hidden bg-black">
        {/* Vercel Analytics */}
        <Analytics />

        {/* 路由配置 */}
        <Routes>
          {/* 默认重定向到暗影交易活动 */}
          <Route path="/" element={<Navigate to="/gacha/chip/ag97" replace />} />

          {/* 测试页面路由 */}
          <Route path="/test" element={<Navigate to="/test/lootbox-animation" replace />} />
          <Route path="/test/lootbox-animation" element={<LootboxAnimationDemo />} />

          {/* 抽卡页面路由 */}
          <Route path="/gacha/:type/:activityId" element={<GachaPage />} />

          {/* 404 重定向 */}
          <Route path="*" element={<Navigate to="/gacha/chip/ag97" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
