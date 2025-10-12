import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 版本检查移至 App.jsx 的 useEffect 中
// 等待从 OSS 加载真实版本号后再执行检查

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
