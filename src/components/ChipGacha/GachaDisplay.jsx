'use client'

import { HexGrid } from '../HexGrid'
import { CDN_BASE_URL } from '../../utils/constants'
import { IMG_WEBP } from '../../services/cdnService'
import { useSound } from '../../hooks/useSound'
import { MilestonePullButton } from '../ui/MilestonePullButton'

/**
 * 抽卡展示区域组件
 * 包含商人图片、奖池展示、抽奖按钮
 */
export function GachaDisplay({
  premiumItems,
  highlightedItemName,
  onSingleDraw,
  onMultiDraw,
  onDraw100,
  onDraw500,
  onDraw5000,
  onPlaySound,
  isDrawing = false,
  isPremium = false,
  totalDraws = 0,
  resultModalOpen = false,
}) {
  const { playGachaClick } = useSound()

  const handleButtonClick = (callback) => {
    playGachaClick()  // 使用抽卡音效 Button_02_UI.wav
    callback()
  }

  return (
    <div className="relative z-10 h-[calc(100%-60px)]">
      {/* 左侧：商人角色 - 绝对定位，中间偏左 */}
      <div className="absolute left-[5%] top-1/2 -translate-y-1/2">
        <img
          src={`${CDN_BASE_URL}/assets/ui-common/merchant.png${IMG_WEBP}`}
          alt="商人"
          className="max-h-[65vh] md:h-[900px] md:max-h-none object-contain drop-shadow-2xl"
        />
      </div>

      {/* 中间偏右：六边形奖池 + 抽奖按钮 */}
      <div className="absolute right-[-8%] md:right-[15%] top-[50%] md:top-[48%] -translate-y-1/2 scale-[0.6] md:scale-100 origin-center">
        <HexGrid
          items={premiumItems}
          onItemClick={(item) => console.log('点击了', item.name)}
          highlightedItemName={highlightedItemName}
        />

        {/* 抽奖按钮（在六边形下方居中） */}
        <div className="flex gap-8 justify-center mt-12 items-end">
          {/* 抽奖 x1 */}
          <button
            onClick={() => handleButtonClick(onSingleDraw)}
            disabled={isDrawing}
            className="relative inline-flex h-10 overflow-hidden rounded-md p-[1px] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#10b981_0%,#059669_50%,#10b981_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-md bg-gradient-to-b from-emerald-500 to-emerald-700 px-8 py-1 text-sm font-bold text-white backdrop-blur-3xl hover:from-emerald-400 hover:to-emerald-600 transition-all">
              抽奖 ×1
            </span>
          </button>

          {/* 抽奖 x10 */}
          <button
            onClick={() => handleButtonClick(onMultiDraw)}
            disabled={isDrawing}
            className="relative inline-flex h-10 overflow-hidden rounded-md p-[1px] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#10b981_0%,#059669_50%,#10b981_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-md bg-gradient-to-b from-emerald-500 to-emerald-700 px-8 py-1 text-sm font-bold text-white backdrop-blur-3xl hover:from-emerald-400 hover:to-emerald-600 transition-all">
              抽奖 ×10
            </span>
          </button>

          {/* 抽奖 x100 - 金色主题（会员专属） */}
          {isPremium && (
            <button
              onClick={() => handleButtonClick(onDraw100)}
              disabled={isDrawing}
              className="relative inline-flex h-10 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#fde047_0%,#ea580c_50%,#fde047_100%)]" />
              <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-8 py-1 text-sm font-bold text-white backdrop-blur-3xl hover:bg-slate-900 transition-all">
                抽奖 ×100
              </span>
            </button>
          )}

          {/* 抽奖 x500/x5000 - 里程碑按钮（会员专属） */}
          {isPremium && (
            <MilestonePullButton
              totalDraws={totalDraws}
              onDraw500={() => handleButtonClick(onDraw500)}
              onDraw5000={() => handleButtonClick(onDraw5000)}
              onPlaySound={null}
              isDisabled={isDrawing}
              resultModalOpen={resultModalOpen}
            />
          )}
        </div>
      </div>
    </div>
  )
}
