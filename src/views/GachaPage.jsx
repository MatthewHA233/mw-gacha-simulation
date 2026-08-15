'use client'

import { useState, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { Sidebar } from '../components/Layout/Sidebar'
import { Header } from '../components/Layout/Header'
import { ChipGacha } from '../components/ChipGacha/ChipGacha'
import { CargoGacha } from '../components/CargoGacha/CargoGacha'
import { FlagshipGacha } from '../components/FlagshipGacha/FlagshipGacha'

/**
 * 抽卡页面容器
 * 整合侧边栏、顶部栏和抽卡组件
 */
export function GachaPage({ type, activityId }) {
  // type 和 activityId 现在通过 props 传入（来自 App Router 的 params）
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sponsorModal, setSponsorModal] = useState(false)
  const [versionModalOpen, setVersionModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
  const [itemScale, setItemScale] = useState(1)
  const [shouldRotate, setShouldRotate] = useState(false)

  // 检查版本更新标记并显示 Toast + 打开版本弹窗
  useEffect(() => {
    try {
      const versionUpdateData = sessionStorage.getItem('mw_gacha_version_updated')
      if (versionUpdateData) {
        // 显示版本更新 Toast（不显示具体版本号）
        toast.success(
          '版本已更新\n已自动重置全部数据',
          {
            duration: 4000,
            style: {
              background: '#10b981',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 'bold',
              padding: '16px 24px',
              borderRadius: '12px',
              whiteSpace: 'pre-line'
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#10b981'
            }
          }
        )

        // 延迟 500ms 后打开版本弹窗，让用户查看详情
        setTimeout(() => {
          setVersionModalOpen(true)
        }, 500)

        // 清除标记（确保只显示一次）
        sessionStorage.removeItem('mw_gacha_version_updated')
      }
    } catch (error) {
      console.error('读取版本更新标记失败:', error)
    }
  }, [])

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
          <CargoGacha
            activityId={activityId}
            sponsorModal={sponsorModal}
            onSetSponsorModal={setSponsorModal}
            onUpdateHeader={setHeaderData}
          />
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
      {/* Toast 通知（在旋转容器内） - z-index 高于 VersionModal */}
      <Toaster
        position="top-center"
        containerStyle={{
          zIndex: 10000,
        }}
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
          versionModalOpen={versionModalOpen}
          onVersionModalChange={setVersionModalOpen}
        />

        {/* 主内容区 */}
        <div className="overflow-hidden relative flex-1">
          {/* 统一的顶部导航栏 */}
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
            onAddBatteries={headerData.onAddBatteries}
            gameState={headerData.gameState}
            activityName={headerData.activityName}
            activityNameEn={headerData.activityNameEn}
            isModalOpen={headerData.isModalOpen}
          />

          {/* 抽卡组件内容 */}
          {renderGachaComponent()}
        </div>
      </div>
    </div>
  )
}
