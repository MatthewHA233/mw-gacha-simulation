import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { checkAndResetIfNeeded } from './utils/gameStateStorage'

// 在应用启动前检查版本并在需要时强制重置数据
checkAndResetIfNeeded()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
