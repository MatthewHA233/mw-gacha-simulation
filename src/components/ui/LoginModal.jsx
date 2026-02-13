'use client'

/**
 * 登录弹窗（双模式）
 * - 通行证密钥登录
 * - 账号 + 密码登录
 */

import { useState } from 'react'
import { X, Eye, EyeOff, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'

export function LoginModal({ isOpen, onClose, onSuccess, onOpenMembership }) {
  const [tab, setTab] = useState('code') // 'code' | 'account'
  const [code, setCode] = useState('')
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { activate, loginByAccount } = useAuth()

  if (!isOpen) return null

  const handleActivateByCode = async () => {
    const trimmedCode = code.trim().toUpperCase()
    if (!trimmedCode) {
      toast.error('请输入通行证密钥')
      return
    }

    setLoading(true)
    try {
      const data = await activate(trimmedCode)
      toast.success('登录成功！')
      setTimeout(() => { handleClose(); onSuccess?.(data) }, 500)
    } catch (error) {
      toast.error(error.error || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleActivateByAccount = async () => {
    if (!loginId.trim()) {
      toast.error('请输入账号')
      return
    }
    if (!password.trim()) {
      toast.error('请输入密码')
      return
    }

    setLoading(true)
    try {
      const data = await loginByAccount(loginId, password)
      toast.success('登录成功！')
      setTimeout(() => { handleClose(); onSuccess?.(data) }, 500)
    } catch (error) {
      toast.error(error.error || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      tab === 'code' ? handleActivateByCode() : handleActivateByAccount()
    }
  }

  const handleClose = () => {
    setCode('')
    setLoginId('')
    setPassword('')
    setShowPassword(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-2 md:p-4 backdrop-blur-sm overflow-auto"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="bg-slate-900 w-full max-w-[320px] md:max-w-md max-h-[85vh] overflow-y-auto border border-slate-600 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            {/* 顶部装饰条 */}
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-600" />

            {/* 关闭按钮 */}
            <button
              onClick={handleClose}
              className="absolute top-2 right-2 md:top-4 md:right-4 text-slate-400 hover:text-white transition-colors z-10 hover:bg-slate-800 p-1"
              disabled={loading}
            >
              <X size={18} />
            </button>

            <div className="p-1.5 md:p-8">
              {/* 标题 */}
              <div className="mb-1 md:mb-6 border-b border-slate-700 pb-1 md:pb-4">
                <h2 className="text-xs md:text-xl font-bold text-white tracking-widest flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">::</span>
                  系统接入
                </h2>
              </div>

              {/* Tab 切换 */}
              <div className="flex mb-1.5 md:mb-6 border border-slate-700 rounded-sm overflow-hidden">
                <button
                  onClick={() => setTab('code')}
                  className={`flex-1 py-1 md:py-2 text-[10px] md:text-sm font-bold tracking-wide transition-all ${
                    tab === 'code'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  通行证密钥登录
                </button>
                <button
                  onClick={() => setTab('account')}
                  className={`flex-1 py-1 md:py-2 text-[10px] md:text-sm font-bold tracking-wide transition-all ${
                    tab === 'account'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  账号密码登录
                </button>
              </div>

              {/* 通行证密钥登录 */}
              {tab === 'code' && (
                <div className="space-y-1.5 md:space-y-4">
                  <div>
                    <label className="block text-emerald-500 text-[9px] md:text-xs font-bold mb-0.5 md:mb-2 tracking-wide">
                      通行证密钥
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={code}
                        onChange={e => setCode(e.target.value.toUpperCase())}
                        onKeyDown={handleKeyPress}
                        placeholder="输入 MW-XXXXXXXX"
                        disabled={loading}
                        className="w-full bg-black text-white px-1.5 py-1 md:px-4 md:py-3 border border-slate-700 focus:border-emerald-500 focus:outline-none transition-colors disabled:opacity-50 font-mono text-xs md:text-lg tracking-widest placeholder:text-slate-700 placeholder:tracking-normal placeholder:font-sans"
                        autoComplete="off"
                        autoFocus
                      />
                      <div className="absolute top-0 right-0 bottom-0 w-1 bg-emerald-500/20 group-focus-within:bg-emerald-500 transition-colors" />
                    </div>
                  </div>
                </div>
              )}

              {/* 账号密码登录 */}
              {tab === 'account' && (
                <div className="space-y-1.5 md:space-y-4">
                  <div>
                    <label className="block text-emerald-500 text-[9px] md:text-xs font-bold mb-0.5 md:mb-2 tracking-wide">
                      登录账号
                    </label>
                    <input
                      type="text"
                      value={loginId}
                      onChange={e => setLoginId(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="手机号 / 邮箱 / 自定义账号"
                      disabled={loading}
                      className="w-full bg-black text-white px-1.5 py-1 md:px-4 md:py-3 text-xs md:text-base border border-slate-700 focus:border-emerald-500 focus:outline-none transition-colors disabled:opacity-50 placeholder:text-slate-700"
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-500 text-[9px] md:text-xs font-bold mb-0.5 md:mb-2 tracking-wide">
                      密码
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={loading}
                        className="w-full bg-black text-white px-1.5 py-1 md:px-4 md:py-3 text-xs md:text-base border border-slate-700 focus:border-emerald-500 focus:outline-none transition-colors disabled:opacity-50 font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 登录按钮 */}
              <button
                onClick={tab === 'code' ? handleActivateByCode : handleActivateByAccount}
                disabled={loading}
                className="w-full mt-2 md:mt-6 py-1 md:py-3 text-xs md:text-base bg-emerald-700 hover:bg-emerald-600 text-white font-bold tracking-[0.2em] transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs">验证中...</span>
                  </>
                ) : (
                  <span>{tab === 'code' ? '执行接入' : '登录'}</span>
                )}
              </button>

              {/* 底部 */}
              <div className="mt-1.5 md:mt-6 pt-1 md:pt-4 border-t border-slate-800 flex justify-between items-center">
                <span className="text-slate-600 text-[10px] font-mono">
                  {tab === 'code' ? '模式: 通行证密钥' : '模式: 账号密码'}
                </span>
                <button
                  onClick={() => { handleClose(); onOpenMembership?.() }}
                  className="text-slate-400 hover:text-emerald-400 text-xs transition-colors group"
                  disabled={loading}
                >
                  <span className="group-hover:underline decoration-emerald-500/50 underline-offset-4">还没有会员?</span>
                  <span className="text-emerald-600 font-bold ml-1">{'>'}</span>
                </button>
              </div>
            </div>

            {/* 底部装饰 */}
            <div className="bg-slate-800 p-0.5 md:p-1.5 text-center border-t border-slate-700">
              <div className="flex justify-between px-2 md:px-4">
                <span className="text-[10px] text-slate-500 font-mono">安全连接: 加密</span>
                <span className="text-[10px] text-slate-500 font-mono">V.2.1.0</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export { LoginModal as ActivateModal }
