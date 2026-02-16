'use client'

/**
 * 全局支付结果监听组件
 *
 * 核心问题：手机端跳转微信/支付宝支付后返回，浏览器 bfcache 恢复页面状态，
 * 导致 React useEffect 不重新触发，轮询永远没启动。
 *
 * 解决方案：
 *   1. 组件挂载时检查 pending_mobile_payment
 *   2. 监听 pageshow（bfcache 恢复）和 visibilitychange（切回页面）事件
 *   3. 检测到待处理支付后，显示等待界面 + 启动轮询 + Realtime 双保险
 *   4. 支付成功后弹出密钥成功界面（复制 + 绑定账号）
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { CDN_BASE_URL } from '@/utils/constants'
import { getBrowserSupabase } from '@lib/supabase/browserClient'

const PENDING_KEY = 'pending_mobile_payment'
const EXPIRY_MS = 10 * 60 * 1000 // 10 分钟
const POLL_INTERVAL = 2000
const MAX_CODE_RETRIES = 15 // 订单已付但密钥未生成，最多等 30 秒

export function PendingPaymentWatcher() {
  const { activateAfterPayment, bindPass, verify, totalRemainingDays } = useAuth()
  const handledRef = useRef(false)
  const totalDaysRef = useRef(totalRemainingDays)
  useEffect(() => { totalDaysRef.current = totalRemainingDays }, [totalRemainingDays])
  const pollingRef = useRef(null)
  const subscriptionRef = useRef(null)
  const [status, setStatus] = useState(null) // null | 'waiting' | 'success'
  const [successCode, setSuccessCode] = useState(null)
  const [isRenewal, setIsRenewal] = useState(false)
  const [optimisticDays, setOptimisticDays] = useState(null)
  const [shouldRotate, setShouldRotate] = useState(false)

  // 横屏旋转检测（与 GachaPage 一致）
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      setShouldRotate(w < h && w < 900)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleSuccess = useCallback(async (activationCode) => {
    if (handledRef.current) return
    handledRef.current = true

    // 清理轮询和订阅
    clearPolling()
    clearSubscription()

    // 读取 is_renewal 和 plan_id 标记（在清理前读取）
    let renewal = isRenewal
    let planId = null
    try {
      const raw = localStorage.getItem(PENDING_KEY)
      if (raw) {
        const pending = JSON.parse(raw)
        renewal = !!pending.is_renewal
        planId = pending.plan_id
      }
    } catch {}

    try { localStorage.removeItem(PENDING_KEY) } catch {}

    // 切换到成功界面
    setSuccessCode(activationCode)
    setIsRenewal(renewal)

    if (renewal) {
      // 续费模式：乐观更新，立即显示成功
      const planDays = planId === 'yearly' ? 365 : 30
      setOptimisticDays((totalDaysRef.current || 0) + planDays)
      setStatus('success')
      // 后台绑定新密钥到当前账号
      try {
        await bindPass(activationCode)
        await verify()
        toast.success('续费成功！新通行证已自动绑定')
      } catch {
        copyToClipboard(activationCode)
        toast('自动绑定失败，请在"绑定其它通行证"中手动绑定', { icon: '⚠️', duration: 5000 })
      }
    } else {
      // 新购模式：复制密钥 + 自动登录
      setStatus('success')
      copyToClipboard(activationCode)
      try {
        await activateAfterPayment(activationCode)
      } catch {
        toast('自动登录失败，请手动输入通行证密钥登录', { icon: '⚠️', duration: 5000 })
      }
    }
  }, [activateAfterPayment, bindPass, verify, isRenewal])

  /** 启动轮询（主要检测手段，不依赖 Supabase） */
  const startPolling = useCallback((outTradeNo) => {
    if (pollingRef.current) return
    let codeRetries = 0

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/query?out_trade_no=${outTradeNo}`)
        if (!res.ok) return
        const result = await res.json()
        const order = result.data

        if (order.status === 'paid') {
          if (order.activation_code) {
            handleSuccess(order.activation_code)
          } else {
            codeRetries++
            if (codeRetries >= MAX_CODE_RETRIES) {
              clearPolling()
              toast('支付成功但通行证密钥生成超时，请稍后在"输入通行证密钥"中查询', { icon: '⚠️', duration: 5000 })
              setStatus(null)
            }
          }
        } else if (order.status === 'failed') {
          clearPolling()
          clearSubscription()
          try { localStorage.removeItem(PENDING_KEY) } catch {}
          toast.error('支付失败，请重试')
          setStatus(null)
        }
      } catch {
        // 网络错误，继续轮询
      }
    }, POLL_INTERVAL)
  }, [handleSuccess])

  /** 启动 Supabase Realtime 订阅（加速检测，可选） */
  const startRealtime = useCallback((outTradeNo) => {
    const supabase = getBrowserSupabase()
    if (!supabase) return

    // 先查一次（覆盖回调已完成但还没连上 Realtime 的情况）
    supabase
      .from('payment_orders')
      .select('activation_code')
      .eq('out_trade_no', outTradeNo)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.activation_code) {
          handleSuccess(data.activation_code)
        }
      })
      .catch(() => {})

    const channel = supabase
      .channel(`payment_watch_${outTradeNo}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_orders',
          filter: `out_trade_no=eq.${outTradeNo}`
        },
        (payload) => {
          const code = payload.new?.activation_code
          if (code) handleSuccess(code)
        }
      )
      .subscribe()

    subscriptionRef.current = channel
  }, [handleSuccess])

  /** 检查并启动恢复流程 */
  const tryRecover = useCallback(() => {
    if (handledRef.current) return
    if (status === 'waiting' || status === 'success') return

    const pending = readPending()
    if (!pending) return

    setIsRenewal(!!pending.is_renewal)
    setStatus('waiting')
    startPolling(pending.out_trade_no)
    startRealtime(pending.out_trade_no)
  }, [status, startPolling, startRealtime])

  // 挂载时检查
  useEffect(() => {
    tryRecover()
  }, [tryRecover])

  // 监听 pageshow（bfcache 恢复）和 visibilitychange（从微信切回来）
  useEffect(() => {
    const onPageShow = (e) => {
      // persisted = true 表示从 bfcache 恢复
      if (e.persisted) tryRecover()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') tryRecover()
    }

    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [tryRecover])

  // 组件卸载清理
  useEffect(() => {
    return () => {
      clearPolling()
      clearSubscription()
    }
  }, [])

  function clearPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  function clearSubscription() {
    if (subscriptionRef.current) {
      const supabase = getBrowserSupabase()
      if (supabase) supabase.removeChannel(subscriptionRef.current)
      subscriptionRef.current = null
    }
  }

  if (status === 'waiting') {
    return <WaitingOverlay shouldRotate={shouldRotate} onCancel={() => {
      clearPolling()
      clearSubscription()
      try { localStorage.removeItem(PENDING_KEY) } catch {}
      setStatus(null)
    }} />
  }

  if (status === 'success' && successCode) {
    return <SuccessModal shouldRotate={shouldRotate} activationCode={successCode} isRenewal={isRenewal} optimisticDays={optimisticDays} onClose={() => setStatus(null)} />
  }

  return null
}

function readPending() {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (Date.now() - data.timestamp > EXPIRY_MS) {
      localStorage.removeItem(PENDING_KEY)
      return null
    }
    return data
  } catch {
    localStorage.removeItem(PENDING_KEY)
    return null
  }
}

function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.cssText = 'position:fixed;left:-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  } catch {}
}

/** 横屏旋转样式（与 GachaPage 一致） */
const rotateStyle = {
  width: '100vh',
  height: '100vw',
  transform: 'rotate(90deg) translateY(-100%)',
  transformOrigin: 'top left',
  position: 'fixed',
  top: 0,
  left: 0
}

/** 等待支付中遮罩 */
function WaitingOverlay({ onCancel, shouldRotate }) {
  return (
    <div style={shouldRotate ? rotateStyle : { position: 'fixed', inset: 0 }} className="z-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full h-full bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-lg shadow-2xl max-w-[320px] w-full"
        >
          <div className="p-6 flex flex-col items-center gap-4">
            <Loader2 size={36} className="animate-spin text-[#07C160]" />
            <div className="text-center">
              <p className="text-gray-800 font-bold text-base mb-1">等待支付结果</p>
              <p className="text-gray-500 text-sm">请在微信中完成支付</p>
            </div>
            <p className="text-gray-400 text-xs">支付完成后将自动跳转</p>
          </div>
          <div className="border-t border-gray-100 p-3">
            <button
              onClick={onCancel}
              className="w-full text-gray-400 hover:text-gray-600 text-xs py-1 transition-colors"
            >
              取消等待
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

/** 支付成功弹窗 */
function SuccessModal({ activationCode, onClose, shouldRotate, isRenewal = false, optimisticDays = null }) {
  const { bindAccount, userAccount, totalRemainingDays } = useAuth()
  const displayDays = optimisticDays ?? totalRemainingDays
  const [copied, setCopied] = useState(false)
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [binding, setBinding] = useState(false)
  const [bound, setBound] = useState(!!userAccount)
  const [boundLoginId, setBoundLoginId] = useState(userAccount?.login_id || '')

  const copyCode = async () => {
    try {
      copyToClipboard(activationCode)
      setCopied(true)
      toast.success('已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  const handleBind = async () => {
    if (!loginId.trim() || loginId.trim().length < 2) {
      toast.error('账号至少 2 个字符'); return
    }
    if (!password || password.length < 4) {
      toast.error('密码至少 4 个字符'); return
    }
    setBinding(true)
    try {
      await bindAccount(loginId, password)
      setBound(true)
      setBoundLoginId(loginId.trim())
      toast.success('账号绑定成功！')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBinding(false)
    }
  }

  return (
    <AnimatePresence>
      <div style={shouldRotate ? rotateStyle : { position: 'fixed', inset: 0 }} className="z-50">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full h-full bg-black/80 flex items-center justify-center p-2 md:p-4 backdrop-blur-sm overflow-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="w-full max-w-[360px] md:max-w-2xl relative overflow-x-hidden overflow-y-auto max-h-[85vh] bg-slate-900/80 border border-slate-600/50 shadow-2xl backdrop-blur-md"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0.4) 100%), url(${CDN_BASE_URL}/assets/ui-common/resources_captain_vip_background_1920x1080.webp)`,
            backgroundSize: '120%',
            backgroundPosition: 'center'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-[#F59E0B] shadow-[0_0_10px_#F59E0B]" />
          <button
            onClick={onClose}
            className="absolute top-2 right-2 md:top-4 md:right-4 z-10 p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="p-1.5 md:p-5 py-2 md:py-5">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="w-7 h-7 md:w-12 md:h-12 mx-auto mb-1 md:mb-3 rounded-full bg-[#F59E0B]/20 border-2 border-[#F59E0B] flex items-center justify-center"
              >
                <Check size={16} strokeWidth={3} className="text-[#F59E0B] md:[&]:w-6 md:[&]:h-6" />
              </motion.div>
              <h2 className="text-xs md:text-xl font-bold text-white tracking-widest mb-0 md:mb-1">
                {isRenewal ? '续费成功' : '支付成功'}
              </h2>
              <p className="text-slate-400 text-[9px] md:text-sm">
                {isRenewal ? '新通行证已自动绑定到您的账号' : '会员已开通，通行证密钥已自动复制到剪贴板'}
              </p>
            </div>

            {isRenewal ? (
              /* 续费模式：显示绑定成功 + 总剩余天数 */
              <div className="mt-1.5 md:mt-4 w-full max-w-sm mx-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 md:p-4 text-center"
                >
                  <ShieldCheck size={20} className="text-emerald-400 mx-auto mb-1 md:mb-2 md:[&]:w-7 md:[&]:h-7" />
                  <p className="text-emerald-400 text-[10px] md:text-base font-bold mb-0.5 md:mb-2">已自动绑定</p>
                  <p className="text-white text-sm md:text-lg font-bold font-mono">
                    总剩余 {displayDays} 天
                  </p>
                  <p className="text-slate-500 text-[9px] md:text-xs mt-0.5 md:mt-2">新通行证时间已串行叠加到您的账号</p>
                </motion.div>
              </div>
            ) : (
              /* 新购模式：显示密钥 + 绑定账号表单 */
              <>
                <div className="mt-1.5 md:mt-3 bg-slate-800/60 border border-[#F59E0B]/30 p-1.5 md:p-3 rounded-lg w-full max-w-sm mx-auto">
                  <p className="text-slate-400 text-[9px] md:text-xs mb-0.5 md:mb-2 font-bold uppercase tracking-widest">通行证密钥</p>
                  <div className="flex items-center justify-between bg-black/40 p-1 md:p-3 rounded border border-slate-600/50">
                    <code className="text-[#F59E0B] font-mono text-[10px] md:text-lg tracking-widest">
                      {activationCode}
                    </code>
                    <button
                      onClick={copyCode}
                      className="text-slate-400 hover:text-white transition-colors ml-2"
                      title="复制通行证密钥"
                    >
                      {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-1 md:mt-2 text-center text-red-400 text-[10px] md:text-base font-bold"
                >
                  请截图保存通行证密钥！丢失将无法找回
                </motion.p>

                <div className="flex items-center gap-1.5 md:gap-3 mt-1.5 md:mt-3 mb-1 md:mb-3 max-w-sm mx-auto">
                  <div className="flex-1 h-px bg-slate-700" />
                  <span className="text-slate-500 text-[9px] md:text-xs">或绑定账号，忘记密钥也能登录</span>
                  <div className="flex-1 h-px bg-slate-700" />
                </div>

                <div className="w-full max-w-sm mx-auto">
                  {!bound ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="space-y-1 md:space-y-3"
                    >
                      <input
                        type="text"
                        value={loginId}
                        onChange={e => setLoginId(e.target.value)}
                        placeholder="设置账号（手机号 / 邮箱 / 自定义昵称）"
                        className="w-full bg-black/40 border border-slate-600/50 rounded-md px-1.5 py-1 md:px-3 md:py-2.5 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-[#F59E0B]/50 transition-colors"
                      />
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="设置密码（至少 4 位）"
                          className="w-full bg-black/40 border border-slate-600/50 rounded-md px-1.5 py-1 md:px-3 md:py-2.5 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-[#F59E0B]/50 transition-colors"
                          onKeyDown={e => e.key === 'Enter' && handleBind()}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <button
                        onClick={handleBind}
                        disabled={binding || !loginId.trim() || password.length < 4}
                        className="w-full py-1 md:py-2.5 bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-40 disabled:hover:bg-[#F59E0B] text-white text-[10px] md:text-sm font-bold rounded-md transition-all flex items-center justify-center gap-1.5"
                      >
                        {binding ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <ShieldCheck size={16} />
                            绑定登录账号
                          </>
                        )}
                      </button>
                      <p className="text-slate-600 text-[8px] md:text-[11px] text-center">绑定后可用 账号+密码 登录，无需记住通行证密钥</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 md:p-4 text-center"
                    >
                      <ShieldCheck size={16} className="text-emerald-400 mx-auto mb-0.5 md:mb-2 md:[&]:w-6 md:[&]:h-6" />
                      <p className="text-emerald-400 text-[10px] md:text-sm font-bold mb-0.5">账号绑定成功</p>
                      <p className="text-slate-400 text-[9px] md:text-xs">
                        登录账号：<span className="text-white font-mono">{boundLoginId}</span>
                      </p>
                      <p className="text-slate-500 text-[8px] md:text-[11px] mt-0.5">下次可用此账号 + 密码直接登录</p>
                    </motion.div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
      </div>
    </AnimatePresence>
  )
}
