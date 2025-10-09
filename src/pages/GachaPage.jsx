import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Sidebar } from '../components/Layout/Sidebar'
import { Header } from '../components/Layout/Header'
import { ChipGacha } from '../components/ChipGacha/ChipGacha'
import { FlagshipGacha } from '../components/FlagshipGacha/FlagshipGacha'

/**
 * 抽卡页面容器
 * 整合侧边栏、顶部栏和抽卡组件
 */
export function GachaPage() {
  const { type, activityId } = useParams()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sponsorModal, setSponsorModal] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
  const [itemScale, setItemScale] = useState(1)
  const [shouldRotate, setShouldRotate] = useState(false)

  // Header 需要的数据，由子组件提供
  const [headerData, setHeaderData] = useState({
    activityConfig: null,
    gameState: { currency: 0, rmb: 0, items: [] },
    activityName: '',
    activityNameEn: '',
    isModalOpen: false,
    onOpenInfo: () => {},
    onOpenShop: () => {},
    onResetData: () => {}
  })

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
            sponsorModal={sponsorModal}
            onSetSponsorModal={setSponsorModal}
            onUpdateHeader={setHeaderData}
          />
        )
      case 'cargo':
        return (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-black">
            <div className="text-center space-y-6">
              <h1 className="text-white text-3xl md:text-4xl font-bold">机密货物类抽卡</h1>
              <p className="text-white/60 text-lg md:text-xl">功能开发中，敬请期待...</p>
              <button
                onClick={() => navigate('/gacha/chip/ag97')}
                className="mt-8 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-bold transition-colors"
              >
                返回主页
              </button>
            </div>
          </div>
        )
      case 'flagship':
        return (
          <FlagshipGacha
            activityId={activityId}
            itemScale={itemScale}
            sponsorModal={sponsorModal}
            onSetSponsorModal={setSponsorModal}
            onUpdateHeader={setHeaderData}
          />
        )
      default:
        return (
          <ChipGacha
            activityId={activityId}
            itemScale={itemScale}
            sponsorModal={sponsorModal}
            onSetSponsorModal={setSponsorModal}
            onUpdateHeader={setHeaderData}
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
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            marginTop: isMobile ? '20px' : '60px',
            padding: isMobile ? '6px 12px' : '8px 16px',
            fontSize: isMobile ? '12px' : '14px',
            minHeight: 'auto',
          },
        }}
      />

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
          {/* 统一的顶部导航栏 */}
          {type !== 'cargo' && (
            <Header
              activityId={activityId}
              activityConfig={headerData.activityConfig}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              onOpenInfo={headerData.onOpenInfo}
              onOpenSponsor={() => setSponsorModal(true)}
              onOpenShop={headerData.onOpenShop}
              onResetData={headerData.onResetData}
              onAddCommonKeys={headerData.onAddCommonKeys}
              gameState={headerData.gameState}
              activityName={headerData.activityName}
              activityNameEn={headerData.activityNameEn}
              isModalOpen={headerData.isModalOpen}
            />
          )}

          {/* 抽卡组件内容 */}
          {renderGachaComponent()}
        </div>
      </div>
    </div>
  )
}
