'use client'

import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { CDN_BASE_URL } from '../../utils/constants'

/**
 * 加入交流群弹窗组件
 */
export function SponsorModal({ isOpen, onClose }) {
  if (!isOpen) return null

  const handleCopyQQ = () => {
    navigator.clipboard.writeText('1054801058')
    toast.success('QQ群号已复制', {
      duration: 2000,
      position: 'top-center',
      style: {
        background: '#000',
        color: '#fff',
        border: '1px solid #10b981',
        borderRadius: '12px',
        padding: '12px 24px'
      }
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          transition: {
            type: "spring",
            stiffness: 260,
            damping: 20,
          }
        }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        className="relative bg-black rounded-2xl p-3 md:p-6 max-w-[16rem] md:max-w-sm w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 顶部装饰线条 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent rounded-full" />

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* 内容区 */}
        <div className="flex flex-col items-center space-y-3 md:space-y-4 mt-1 md:mt-2">
          {/* 标题 */}
          <div className="text-center space-y-1">
            <h3 className="text-base md:text-2xl font-bold text-white">加入交流群</h3>
            <p className="text-xs md:text-sm text-gray-400">作者: CHanGO</p>
            <div className="flex items-center gap-2 justify-center">
              <div className="h-px w-6 bg-gradient-to-r from-transparent to-gray-600" />
              <p className="text-sm md:text-base text-emerald-400 font-semibold">MW抽抽乐小栈</p>
              <div className="h-px w-6 bg-gradient-to-l from-transparent to-gray-600" />
            </div>
          </div>

          {/* 收款码 */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-sky-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-500" />
            <div className="relative bg-black p-2 md:p-3 rounded-xl">
              <img
                src={`${CDN_BASE_URL}/assets/ui-common/group-qr.png`}
                alt="交流群二维码"
                className="w-32 h-32 md:w-48 md:h-48 object-contain"
              />
            </div>
            {/* 支付说明 */}
            <div className="text-center mt-2">
              <p className="text-gray-500 text-xs">扫码加入 QQ 交流群</p>
            </div>
          </div>

          {/* QQ号复制按钮 */}
          <button
            onClick={handleCopyQQ}
            className="bg-slate-800 no-underline group cursor-pointer relative shadow-2xl shadow-zinc-900 rounded-full p-px text-xs md:text-sm font-semibold leading-6 text-white inline-block w-full"
          >
            <span className="absolute inset-0 overflow-hidden rounded-full">
              <span className="absolute inset-0 rounded-full bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
            </span>
            <div className="relative flex space-x-1.5 md:space-x-2 items-center justify-center z-10 rounded-full bg-zinc-950 py-2 md:py-2.5 px-4 md:px-6 ring-1 ring-white/10">
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span className="text-xs md:text-sm">复制 QQ 群号: 1054801058</span>
            </div>
          </button>
        </div>

        {/* 底部装饰线条 */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-0.5 bg-gradient-to-r from-transparent via-sky-500 to-transparent rounded-full" />
      </motion.div>
    </motion.div>
  )
}
