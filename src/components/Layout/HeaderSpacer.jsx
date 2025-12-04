'use client'

/**
 * Header 占位组件
 * 用于为绝对定位的 Header 预留空间
 * 高度和样式与 Header 完全一致
 */
export function HeaderSpacer() {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-4 py-1 md:py-3 invisible">
        {/* 占位内容 - 保持和 Header 相同的高度 */}
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 md:w-10 md:h-10" />
          <div>
            <div className="text-sm md:text-lg h-5 md:h-7" />
            <div className="text-[8px] md:text-xs h-3 md:h-4" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-5 h-5 md:w-6 md:h-6" />
          <div className="w-5 h-5 md:w-6 md:h-6" />
          <div className="w-5 h-5 md:w-6 md:h-6" />
        </div>
      </div>
    </div>
  )
}
