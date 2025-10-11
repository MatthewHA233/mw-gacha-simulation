import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { GachaPage } from './pages/GachaPage'
import { LootboxAnimationDemo } from './pages/LootboxAnimationDemo'
import MilestoneToastDemo from './pages/MilestoneToastDemo'
import { MilestoneToastProvider } from './components/ui/MilestoneToastProvider'
import { HomeRedirect } from './components/HomeRedirect'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <MilestoneToastProvider maxToasts={3} position="top-right">
        <div className="w-full h-screen overflow-hidden bg-black">
          <Analytics />

          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/test" element={<Navigate to="/test/lootbox-animation" replace />} />
            <Route path="/test/lootbox-animation" element={<LootboxAnimationDemo />} />
            <Route path="/test/milestone-toast" element={<MilestoneToastDemo />} />
            <Route path="/gacha/:type/:activityId" element={<GachaPage />} />
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </div>
      </MilestoneToastProvider>
    </BrowserRouter>
  )
}

export default App
