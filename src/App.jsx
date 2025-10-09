import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { GachaPage } from './pages/GachaPage'
import { LootboxAnimationDemo } from './pages/LootboxAnimationDemo'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="w-full h-screen overflow-hidden bg-black">
        <Analytics />

        <Routes>
          <Route path="/" element={<Navigate to="/gacha/chip/ag97" replace />} />
          <Route path="/test" element={<Navigate to="/test/lootbox-animation" replace />} />
          <Route path="/test/lootbox-animation" element={<LootboxAnimationDemo />} />
          <Route path="/gacha/:type/:activityId" element={<GachaPage />} />
          <Route path="*" element={<Navigate to="/gacha/chip/ag97" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
