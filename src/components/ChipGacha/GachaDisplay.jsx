'use client'

import { HexGrid } from '../HexGrid'
import { CDN_BASE_URL } from '../../utils/constants'
import { IMG_WEBP } from '../../services/cdnService'
import { useSound } from '../../hooks/useSound'
import { MilestonePullButton } from '../ui/MilestonePullButton'
import { FitScale } from '../ui/FitScale'

/**
 * 抽卡展示区域组件
 * 包含商人图片、奖池展示、抽奖按钮
 *
 * 尺寸都跟着内容区的实际大小走（2026-10-15）：原来人物是 max-h-[65vh] / md:h-[900px]、奖池 scale-[0.6] / md:scale-100，
 * 手机全屏真横屏时宽度过了 md 就套上电脑尺寸撑爆，没过 md 则 65vh 只剩两百多像素、人物特别小；
 * 伪横屏（竖着拿、页面转 90°）下 vh 又是竖屏高度。现在人物高度 = 内容区高度（最高 900），奖池在右半边按空间等比缩放。
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
    // 高度 = 整页减去顶部栏占位（HeaderSpacer：手机 40px、电脑约 60px）。减少了的话容器底边会超出屏幕，抽奖按钮被挤出去
    <div className="relative z-10 h-[calc(100%-40px)] md:h-[calc(100%-60px)]">
      {/* 左侧：商人角色。手机上比内容区高一截（130%）、上下居中，和以前伪横屏的观感一致（图片头顶有透明留白，切不到头）；
          电脑最高 900px，与改动前一样 */}
      <div className="absolute left-[9%] md:left-[5%] inset-y-0 flex items-center">
        <img
          src={`${CDN_BASE_URL}/assets/ui-common/merchant.png${IMG_WEBP}`}
          alt="商人"
          className="h-[130%] max-h-[900px] w-auto max-w-none object-contain drop-shadow-2xl"
        />
      </div>

      {/* 右半边：六边形奖池 + 抽奖按钮，按这块区域等比缩放（不放大） */}
      <div className="absolute inset-y-0 right-0 w-[58%]">
        <FitScale className="w-full h-full">
          <div className="p-4">
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
        </FitScale>
      </div>
    </div>
  )
}
