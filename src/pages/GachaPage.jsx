import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Sidebar } from '../components/Layout/Sidebar'
import { ChipGacha } from '../components/ChipGacha/ChipGacha'

/**
 * 抽卡页面容器
 * 整合侧边栏和抽卡组件
 */
export function GachaPage() {
  const { type, activityId } = useParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sponsorModal, setSponsorModal] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
  const [itemScale, setItemScale] = useState(1)
  const [shouldRotate, setShouldRotate] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      // 当宽度小于高度时（接近1:1或更窄），触发横屏旋转
      const shouldRotateNow = width < height && width < 900
      setShouldRotate(shouldRotateNow)

      setIsMobile(width < 768)

      // 计算物品缩放比例
      const baseWidth = 1920
      const minScale = 0.5
      const scale = Math.max(width / baseWidth, minScale)
      setItemScale(scale)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 根据type渲染不同的抽卡组件
  const renderGachaComponent = () => {
    switch (type) {
      case 'chip':
        return (
          <ChipGacha
            activityId={activityId}
            itemScale={itemScale}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
            sponsorModal={sponsorModal}
            onSetSponsorModal={setSponsorModal}
          />
        )
      case 'cargo':
        // 未来实现
        return <div className="text-white">机密货物类抽卡（开发中）</div>
      case 'flagship':
        // 未来实现
        return <div className="text-white">旗舰宝箱类抽卡（开发中）</div>
      default:
        return (
          <ChipGacha
            activityId={activityId}
            itemScale={itemScale}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
            sponsorModal={sponsorModal}
            onSetSponsorModal={setSponsorModal}
          />
        )
    }
  }

  return (
    <div
      className="overflow-hidden relative"
      style={shouldRotate ? {
        width: '100vh',
        height: '100vw',
        transform: 'rotate(90deg) translateY(-100%)',
        transformOrigin: 'top left',
        position: 'fixed',
        top: 0,
        left: 0
      } : {
        width: '100vw',
        height: '100vh',
        position: 'relative'
      }}
    >
      {/* Toast 通知（在旋转容器内） */}
      <Toaster />

      <div className="flex h-full w-full">
        {/* 侧边栏 */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenSponsor={() => {
            setSponsorModal(true)
            setSidebarOpen(false)
          }}
          isMobile={isMobile}
        />

        {/* 主内容区 */}
        <div className="overflow-hidden relative flex-1">
          {renderGachaComponent()}
        </div>
      </div>
    </div>
  )
}
