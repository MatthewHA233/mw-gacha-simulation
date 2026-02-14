'use client'

/**
 * 会员购买弹窗组件（通行证密钥模式）
 *
 * 流程：选套餐 → 生成通行证密钥+二维码 → 扫码支付 → 自动登录当前设备
 */

import { useState, useEffect, useRef } from 'react'
import { X, Copy, Check, Loader2, ScanLine, Lock, Eye, EyeOff, ShieldCheck, KeyRound, UserRound } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { CDN_BASE_URL } from '@/utils/constants'

export function MembershipModal({ isOpen, onClose, onSuccess, initialStep = 'select' }) {
  const [selectedPlan, setSelectedPlan] = useState('monthly')
  const [selectedPayType, setSelectedPayType] = useState('wechat') // 默认微信支付
  const [step, setStep] = useState(initialStep) // 'select' | 'payment' | 'success' | 'login' | 'bind'
  const [paymentData, setPaymentData] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isMobilePayment, setIsMobilePayment] = useState(false)
  const pollingRef = useRef(null)
  const { activateAfterPayment, isActivated } = useAuth()

  // 当 initialStep 改变时同步（比如从 Header 点"绑定账号"）
  useEffect(() => {
    if (isOpen) setStep(initialStep)
  }, [isOpen, initialStep])

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [])

  // 手机端支付回来后恢复轮询
  useEffect(() => {
    if (!isOpen) return
    try {
      const raw = localStorage.getItem('pending_mobile_payment')
      if (!raw) return
      const pending = JSON.parse(raw)
      // 超过 10 分钟视为过期
      if (Date.now() - pending.timestamp > 10 * 60 * 1000) {
        localStorage.removeItem('pending_mobile_payment')
        return
      }
      setIsMobilePayment(true)
      setSelectedPlan(pending.plan_id)
      setPaymentData({ out_trade_no: pending.out_trade_no })
      setStep('payment')
      startPolling(pending.out_trade_no)
    } catch {
      localStorage.removeItem('pending_mobile_payment')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!isOpen) return null

  const plans = [
    {
      id: 'monthly',
      name: '月度会员',
      price: 3.9,
      duration: '30天',
      badge: '体验价'
    },
    {
      id: 'yearly',
      name: '年度会员',
      price: 20,
      duration: '365天',
      badge: '超值',
      savings: '省 ¥26.8'
    }
  ]

  const handleClose = () => {
    if (step === 'payment' && pollingRef.current) {
      if (confirm('关闭将停止等待支付结果。支付成功后可在"输入通行证密钥"中手动登录。是否关闭？')) {
        clearPolling()
        resetModal()
        onClose()
      }
    } else {
      resetModal()
      onClose()
    }
  }

  const resetModal = () => {
    setStep(initialStep)
    setPaymentData(null)
    setQrCodeUrl(null)
    setLoading(false)
    setCopied(false)
    setIsMobilePayment(false)
    clearPolling()
    try { localStorage.removeItem('pending_mobile_payment') } catch {}
  }

  const clearPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const handlePurchase = async () => {
    setLoading(true)
    try {
      const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
      const response = await fetch('/api/membership/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionType: selectedPlan,
          pay_type: 'wechat',
          pay_mode: isMobile ? 'h5' : 'native'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '创建订单失败')
      }

      const result = await response.json()
      setPaymentData(result.data)

      if (isMobile && result.data.jump_url) {
        // 手机端：存订单信息到 localStorage，跳转回来后可恢复轮询
        try {
          localStorage.setItem('pending_mobile_payment', JSON.stringify({
            out_trade_no: result.data.out_trade_no,
            plan_id: selectedPlan,
            timestamp: Date.now()
          }))
        } catch {}
        window.location.href = result.data.jump_url
      } else {
        // PC端：生成二维码
        const qrContent = result.data.pay_url || result.data.code_url || result.data.jump_url
        if (qrContent) {
          try {
            const QRCode = (await import('qrcode')).default
            const qrDataUrl = await QRCode.toDataURL(qrContent, {
              width: 200,
              margin: 1,
              color: { dark: '#000000', light: '#FFFFFF' }
            })
            setQrCodeUrl(qrDataUrl)
          } catch (err) {
            console.warn('生成二维码失败:', err)
          }
        }
        setStep('payment')
        startPolling(result.data.out_trade_no)
      }

    } catch (error) {
      toast.error(error.message || '创建订单失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const startPolling = (outTradeNo) => {
    let codeRetries = 0
    const MAX_CODE_RETRIES = 15 // 通行证密钥最多等 30 秒

    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/payment/query?out_trade_no=${outTradeNo}`)
        if (!response.ok) return

        const result = await response.json()
        const orderData = result.data

        if (orderData.status === 'paid') {
          const activationCode = orderData.activation_code

          if (activationCode) {
            // 有通行证密钥了，停止轮询并处理成功
            clearPolling()
            try { localStorage.removeItem('pending_mobile_payment') } catch {}
            setPaymentData(prev => ({ ...prev, activation_code: activationCode }))

            // 自动复制通行证密钥到剪贴板
            try {
              if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(activationCode)
              } else {
                const ta = document.createElement('textarea')
                ta.value = activationCode
                ta.style.cssText = 'position:fixed;left:-9999px'
                document.body.appendChild(ta)
                ta.select()
                document.execCommand('copy')
                document.body.removeChild(ta)
              }
              toast.success('支付成功！通行证密钥已自动复制到剪贴板')
            } catch {
              toast.success('支付成功！')
            }

            try {
              await activateAfterPayment(activationCode)
              onSuccess && onSuccess(orderData)
              setStep('success')
            } catch (err) {
              toast('自动登录失败，请手动输入通行证密钥登录', { icon: '⚠️' })
              setStep('success')
            }
          } else {
            // 订单已付但通行证密钥还没写入，继续轮询等待
            codeRetries++
            console.warn(`[MembershipModal] 订单已付但通行证密钥未生成，等待... (${codeRetries}/${MAX_CODE_RETRIES})`)
            if (codeRetries >= MAX_CODE_RETRIES) {
              clearPolling()
              toast('支付成功但通行证密钥生成超时，请稍后在"输入通行证密钥"中查询', { icon: '⚠️', duration: 5000 })
              setStep('select')
            }
          }
        } else if (orderData.status === 'failed') {
          clearPolling()
          toast.error('支付失败，请重试')
          setStep('select')
        }
      } catch (err) {
        console.error('[MembershipModal] 轮询失败:', err)
      }
    }, 2000)
  }

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        // HTTP 环境 fallback：用临时 textarea 复制
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.cssText = 'position:fixed;left:-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      toast.success('已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  // 统一的微信泡泡图标 SVG (fill=#15BA11)
  const WeChatBubbleIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 1228 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M530.8928 703.1296a41.472 41.472 0 0 1-35.7376-19.8144l-2.7136-5.5808L278.272 394.752a18.7392 18.7392 0 0 1-2.048-8.1408 19.968 19.968 0 0 1 20.48-19.3536c4.608 0 8.8576 1.4336 12.288 3.84l234.3936 139.9296a64.4096 64.4096 0 0 0 54.528 5.9392L1116.2624 204.8C1004.9536 80.896 821.76 0 614.4 0 275.0464 0 0 216.576 0 483.6352c0 145.7152 82.7392 276.8896 212.2752 365.5168a38.1952 38.1952 0 0 1 17.2032 31.488 44.4928 44.4928 0 0 1-2.1504 12.3904l-27.6992 97.4848c-1.3312 4.608-3.328 9.3696-3.328 14.1312 0 10.752 9.216 19.3536 20.48 19.3536 4.4032 0 8.0384-1.536 11.776-3.584l134.5536-73.3184c10.1376-5.5296 20.7872-8.96 32.6144-8.96 6.2976 0 12.288 0.9216 18.0736 2.5088 62.72 17.0496 130.4576 26.5728 200.5504 26.5728C953.7024 967.168 1228.8 750.592 1228.8 483.6352c0-80.9472-25.4464-157.1328-70.0416-224.1024l-604.9792 436.992-4.4544 2.4064a42.1376 42.1376 0 0 1-18.432 4.1984z" fill="#15BA11"></path>
    </svg>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 md:p-4 backdrop-blur-sm overflow-auto"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.2 }}
            className={`w-full relative overflow-x-hidden overflow-y-auto max-h-[85vh] transition-all duration-300 ${
              step === 'payment' ? 'max-w-[360px] md:max-w-2xl bg-white rounded-lg shadow-2xl'
              : (step === 'login' || step === 'bind') ? 'max-w-[360px] md:max-w-md bg-slate-900/80 border border-slate-600/50 shadow-2xl backdrop-blur-md'
              : 'max-w-[360px] md:max-w-2xl bg-slate-900/80 border border-slate-600/50 shadow-2xl backdrop-blur-md'
              }`}
            style={step !== 'payment' ? {
              backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0.4) 100%), url(${CDN_BASE_URL}/assets/ui-common/resources_captain_vip_background_1920x1080.webp)`,
              backgroundSize: '120%',
              backgroundPosition: 'center'
            } : {}}
            onClick={e => e.stopPropagation()}
          >
            {/* 顶部装饰 (仅非支付页显示) */}
            {step !== 'payment' && (
              <div className="absolute top-0 left-0 w-full h-1 bg-[#F59E0B] shadow-[0_0_10px_#F59E0B]"></div>
            )}

            {/* 关闭按钮 */}
            <button
              onClick={handleClose}
              className={`absolute top-2 right-2 md:top-4 md:right-4 z-10 p-1 transition-colors ${step === 'payment' ? 'text-gray-400 hover:text-gray-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              disabled={loading}
            >
              <X size={18} />
            </button>

            {/* 步骤 1: 套餐选择 (黑色主题) */}
            {step === 'select' && (
              <div className="p-1.5 md:p-8">
                <div className="mb-1 md:mb-8 border-b border-slate-700 pb-1 md:pb-4 flex items-end justify-between">
                  <div>
                    <h2 className="text-xs md:text-2xl font-bold text-white tracking-widest flex items-center gap-3">
                      <span className="text-[#F59E0B] drop-shadow-md">人民币无限通行证</span>
                    </h2>
                    <p className="text-slate-400 text-[9px] md:text-xs mt-0 md:mt-1 font-bold tracking-wide">解锁无限抽奖权限 · 畅快连抽</p>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className="grid grid-cols-3 gap-1 md:gap-3 mb-1.5 md:mb-8">
                    {plans.map(plan => (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`relative p-1.5 md:p-6 cursor-pointer transition-all border ${selectedPlan === plan.id
                            ? 'border-[#F59E0B] bg-[#F59E0B]/20 backdrop-blur-sm shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                            : 'border-slate-600/50 bg-slate-800/30 hover:border-[#F59E0B]/50 hover:bg-slate-800/50'
                          }`}
                      >
                        {/* 选中时的角标装饰 */}
                        {selectedPlan === plan.id && (
                          <>
                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#F59E0B]"></div>
                            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#F59E0B]"></div>
                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#F59E0B]"></div>
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#F59E0B]"></div>
                          </>
                        )}
                        <div className="flex justify-between items-start mb-0 md:mb-2">
                          <h3 className="text-[10px] md:text-lg font-bold text-white">{plan.name}</h3>
                          {plan.badge && (
                            <span className="bg-[#F59E0B] text-white text-[7px] md:text-[10px] px-1 md:px-2 py-px md:py-0.5 font-bold tracking-wide rounded-sm shadow-sm">
                              {plan.badge}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-0.5 mb-0 md:mb-2">
                          <span className="text-sm md:text-3xl font-bold text-[#F59E0B] font-mono shadow-[#F59E0B]/20 drop-shadow-sm">¥{plan.price}</span>
                          <span className="text-white/80 text-[8px] md:text-sm font-bold">/ {plan.duration}</span>
                        </div>
                        {plan.savings && (
                          <div className="text-emerald-400 text-xs font-mono border-l-2 border-emerald-500 pl-2">
                            {plan.savings}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mb-1.5 md:mb-6 flex items-center justify-end gap-1.5 text-slate-400">
                    <span className="text-[10px] md:text-xs font-medium">支付方式</span>
                    <div className="flex items-center gap-1 bg-[#07C160]/10 text-[#07C160] px-1.5 py-0.5 md:px-2 md:py-1 rounded border border-[#07C160]/30 shadow-[0_0_10px_rgba(7,193,96,0.1)]">
                      <WeChatBubbleIcon size={12} className="md:hidden" />
                      <WeChatBubbleIcon size={14} className="hidden md:block" />
                      <span className="text-[10px] md:text-sm font-bold tracking-wide">微信支付</span>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 border-l-4 border-[#F59E0B] p-1 md:p-4 mb-1.5 md:mb-8 backdrop-blur-sm">
                    <p className="text-white text-[10px] md:text-sm font-bold tracking-wide flex items-center gap-1.5">
                      <Check size={12} className="text-[#F59E0B] md:hidden" />
                      <Check size={16} className="text-[#F59E0B] hidden md:block" />
                      解锁模拟抽奖人民币无限量通行证
                    </p>
                  </div>


                  <button
                    onClick={handlePurchase}
                    disabled={loading}
                    className="w-full py-1 md:py-4 bg-[#07C160] hover:bg-[#06ad56] text-white font-bold text-xs md:text-lg rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 md:gap-3 shadow-lg group active:scale-[0.98]"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>正在创建订单...</span>
                      </>
                    ) : (
                      <>
                        <div className="bg-white rounded-sm p-0.5 shadow-sm">
                          <WeChatBubbleIcon size={20} />
                        </div>
                        <span>微信支付 ¥{plans.find(p => p.id === selectedPlan)?.price}</span>
                      </>
                    )}
                  </button>

                  {/* 已购买？登录入口（仅未登录时显示） */}
                  {!isActivated && (
                    <div className="mt-2 md:mt-5 pt-1.5 md:pt-4 border-t border-slate-700/50 text-center">
                      <p className="text-slate-500 text-[10px] md:text-xs mb-1">已购买通行证？</p>
                      <button
                        onClick={() => setStep('login')}
                        className="text-[#F59E0B] hover:text-[#FBBF24] text-[10px] md:text-sm font-bold transition-colors inline-flex items-center gap-1 group"
                      >
                        <KeyRound size={14} />
                        <span className="group-hover:underline underline-offset-4 decoration-[#F59E0B]/50">输入密钥 / 账号密码登录</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>
            )}

            {/* 步骤 2: 支付 (微信原生风格 - 白色) */}
            {step === 'payment' && paymentData && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white text-gray-800"
              >
                {/* 微信支付头部 */}
                <div className="bg-white p-6 border-b border-gray-100 flex items-center gap-3">
                  {/* 用户提供的微信 Logo SVG */}
                  <svg width="32" height="32" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                    <path d="M849.92 51.2H174.08c-67.8656 0-122.88 55.0144-122.88 122.88v675.84c0 67.8656 55.0144 122.88 122.88 122.88h675.84c67.8656 0 122.88-55.0144 122.88-122.88V174.08c0-67.8656-55.0144-122.88-122.88-122.88z m-337.92 701.76768a363.2896 363.2896 0 0 1-100.27008-14.03904 30.99136 30.99136 0 0 0-9.03168-1.35168c-5.89824 0-11.25376 1.80224-16.31232 4.73088l-67.25632 38.81984c-1.87392 1.08032-3.6864 1.89952-5.9136 1.89952a10.24 10.24 0 0 1-10.24512-10.24c0-2.52928 1.01376-5.05856 1.65888-7.48032l13.84448-51.64032c0.5888-2.16064 1.0752-4.2496 1.0752-6.51776a20.48512 20.48512 0 0 0-8.59648-16.6912C246.18496 643.53792 204.8 574.11072 204.8 496.96256c0-141.38368 137.53344-256 307.2-256 103.68 0 195.30752 42.8544 250.9312 108.41088l-310.35904 138.1376a30.4896 30.4896 0 0 1-27.28448-3.1232l-65.99168-46.98112a10.24 10.24 0 0 0-16.36864 8.21248c0 1.46432 0.37376 2.9696 0.97792 4.31104l55.92576 122.71104 1.34144 2.94912a20.44928 20.44928 0 0 0 27.07968 8.2688l2.24256-1.30048 353.71008-204.21632C806.51264 413.81376 819.2 454.14912 819.2 496.96256c0 141.3888-137.53856 256.00512-307.2 256.00512z" fill="#07C160" />
                  </svg>
                  <span className="text-lg font-medium text-gray-800">微信支付</span>
                </div>

                {isMobilePayment ? (
                  /* 手机端：已跳转微信 H5 等待界面 */
                  <div className="p-6 flex flex-col items-center justify-center gap-4">
                    <Loader2 size={36} className="animate-spin text-[#07C160]" />
                    <div className="text-center">
                      <p className="text-gray-800 font-bold text-base mb-1">已跳转微信支付</p>
                      <p className="text-gray-500 text-sm">请在微信中完成支付</p>
                    </div>
                    <p className="text-gray-400 text-xs">支付完成后将自动跳转</p>
                  </div>
                ) : (
                  /* PC端：二维码扫码界面 */
                  <div className="p-4 md:p-8 flex flex-col md:flex-row gap-4 md:gap-8 items-center justify-center">
                    <div className="flex flex-col items-center">
                      <div className="bg-white p-2 shadow-[0_0_15px_rgba(0,0,0,0.1)] border border-gray-100 rounded-sm mb-4">
                        {qrCodeUrl ? (
                          <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 md:w-56 md:h-56 mix-blend-multiply" />
                        ) : (
                          <div className="w-48 h-48 bg-gray-50 flex items-center justify-center text-gray-400 text-xs">
                            加载中...
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 bg-[#07C160] py-2 px-6 rounded-full shadow-lg shadow-[#07C160]/20">
                        <ScanLine className="text-white" size={20} />
                        <div className="text-white text-left">
                          <p className="text-xs opacity-90">请使用微信扫一扫</p>
                          <p className="text-sm font-bold">扫描二维码支付</p>
                        </div>
                      </div>
                    </div>

                    {/* 手机示意图 */}
                    <div className="hidden md:block w-px h-64 bg-gray-100 mx-4"></div>
                    <div className="hidden md:flex flex-col items-center justify-center">
                      <div className="relative">
                        <svg width="140" height="200" viewBox="0 0 140 240" fill="none" className="text-gray-200" xmlns="http://www.w3.org/2000/svg">
                          <rect x="10" y="10" width="120" height="220" rx="16" stroke="currentColor" strokeWidth="4" fill="white" />
                          <rect x="25" y="30" width="90" height="150" rx="2" fill="#F3F4F6" />
                          <rect x="18" y="200" width="104" height="2" rx="1" fill="currentColor" fillOpacity="0.5" />
                          <rect x="35" y="50" width="70" height="70" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" opacity="0.4" />
                        </svg>
                        <motion.div
                          className="absolute left-[35px] top-[50px] w-[70px] h-[2px] bg-[#07C160] shadow-[0_0_8px_#07C160]"
                          animate={{ top: [50, 120, 50] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">手机微信支付</p>
                    </div>
                  </div>
                )}

                {/* 底部价格条 */}
                <div className="bg-gray-50 p-4 flex justify-between items-center border-t border-gray-100">
                  <span className="text-gray-500 text-sm">订单金额</span>
                  <span className="text-2xl font-bold text-gray-800">¥{plans.find(p => p.id === selectedPlan)?.price}</span>
                </div>
              </motion.div>
            )}

            {/* 步骤: 登录（密钥/账号密码） */}
            {step === 'login' && (
              <LoginStep
                onBack={() => setStep('select')}
                onSuccess={() => {
                  onSuccess?.()
                  resetModal()
                  onClose()
                }}
              />
            )}

            {/* 步骤: 绑定账号 */}
            {step === 'bind' && (
              <BindStep
                onBack={() => setStep('select')}
                onSuccess={() => {
                  toast.success('账号绑定成功！')
                  resetModal()
                  onClose()
                }}
              />
            )}

            {/* 步骤 3: 成功 */}
            {step === 'success' && paymentData && (
              <SuccessScreen
                paymentData={paymentData}
                copied={copied}
                onCopy={copyToClipboard}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * 登录步骤（内部组件）
 * 双模式：通行证密钥登录 / 账号密码登录
 */
function LoginStep({ onBack, onSuccess }) {
  const { activate, loginByAccount } = useAuth()
  const [tab, setTab] = useState('code') // 'code' | 'account'
  const [code, setCode] = useState('')
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleActivateByCode = async () => {
    const trimmedCode = code.trim().toUpperCase()
    if (!trimmedCode) { toast.error('请输入通行证密钥'); return }

    setLoading(true)
    try {
      await activate(trimmedCode)
      toast.success('登录成功！')
      setTimeout(() => onSuccess?.(), 300)
    } catch (error) {
      toast.error(error.error || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleLoginByAccount = async () => {
    if (!loginId.trim()) { toast.error('请输入账号'); return }
    if (!password.trim()) { toast.error('请输入密码'); return }

    setLoading(true)
    try {
      await loginByAccount(loginId, password)
      toast.success('登录成功！')
      setTimeout(() => onSuccess?.(), 300)
    } catch (error) {
      toast.error(error.error || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      tab === 'code' ? handleActivateByCode() : handleLoginByAccount()
    }
  }

  return (
    <div className="p-1.5 md:p-8">
      {/* 标题 */}
      <div className="mb-1 md:mb-6 border-b border-slate-700 pb-1 md:pb-4">
        <h2 className="text-xs md:text-xl font-bold text-white tracking-widest flex items-center gap-2">
          <span className="text-[#F59E0B] font-bold">::</span>
          已有通行证
        </h2>
        <p className="text-slate-400 text-[9px] md:text-xs mt-0 md:mt-1">输入密钥或使用账号密码登录</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex mb-1.5 md:mb-6 border border-slate-700 rounded-sm overflow-hidden">
        <button
          onClick={() => setTab('code')}
          className={`flex-1 py-1 md:py-2 text-[10px] md:text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-1 ${
            tab === 'code'
              ? 'bg-[#F59E0B] text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <KeyRound size={12} className="md:hidden" />
          <KeyRound size={14} className="hidden md:block" />
          通行证密钥登录
        </button>
        <button
          onClick={() => setTab('account')}
          className={`flex-1 py-1 md:py-2 text-[10px] md:text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-1 ${
            tab === 'account'
              ? 'bg-[#F59E0B] text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <UserRound size={12} className="md:hidden" />
          <UserRound size={14} className="hidden md:block" />
          账号密码
        </button>
      </div>

      {/* 通行证密钥登录 */}
      {tab === 'code' && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1.5 md:space-y-4"
        >
          <div>
            <label className="block text-[#F59E0B] text-[9px] md:text-xs font-bold mb-0.5 md:mb-2 tracking-wide">通行证密钥</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyPress}
              placeholder="输入 MW-XXXXXXXX"
              disabled={loading}
              className="w-full bg-black/40 text-white px-1.5 py-1 md:px-4 md:py-3 border border-slate-700 focus:border-[#F59E0B] focus:outline-none transition-colors disabled:opacity-50 font-mono text-xs md:text-lg tracking-widest placeholder:text-slate-700 placeholder:tracking-normal placeholder:font-sans"
              autoComplete="off"
              autoFocus
            />
          </div>
        </motion.div>
      )}

      {/* 账号密码登录 */}
      {tab === 'account' && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1.5 md:space-y-4"
        >
          <div className="bg-slate-800/50 border border-slate-700/50 px-1.5 py-1 md:px-3 md:py-2 rounded-sm text-slate-400 text-[9px] md:text-xs leading-relaxed">
            账号密码需在购买通行证后绑定注册。如尚未购买，请先返回购买通行证。
          </div>
          <div>
            <label className="block text-[#F59E0B] text-[9px] md:text-xs font-bold mb-0.5 md:mb-2 tracking-wide">登录账号</label>
            <input
              type="text"
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="手机号 / 邮箱 / 自定义账号"
              disabled={loading}
              className="w-full bg-black/40 text-white px-1.5 py-1 md:px-4 md:py-3 text-xs md:text-base border border-slate-700 focus:border-[#F59E0B] focus:outline-none transition-colors disabled:opacity-50 placeholder:text-slate-700"
              autoComplete="off"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[#F59E0B] text-[9px] md:text-xs font-bold mb-0.5 md:mb-2 tracking-wide">密码</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={loading}
                className="w-full bg-black/40 text-white px-1.5 py-1 md:px-4 md:py-3 text-xs md:text-base border border-slate-700 focus:border-[#F59E0B] focus:outline-none transition-colors disabled:opacity-50 font-mono pr-10"
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
        </motion.div>
      )}

      {/* 登录按钮 */}
      <button
        onClick={tab === 'code' ? handleActivateByCode : handleLoginByAccount}
        disabled={loading}
        className="w-full mt-2 md:mt-6 py-1 md:py-3 text-xs md:text-base bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold tracking-[0.2em] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">验证中...</span>
          </>
        ) : (
          <span>登录</span>
        )}
      </button>

      {/* 返回购买 */}
      <div className="mt-1.5 md:mt-5 pt-1 md:pt-4 border-t border-slate-700/50 text-center">
        <button
          onClick={onBack}
          disabled={loading}
          className="text-slate-400 hover:text-white text-[10px] md:text-sm transition-colors inline-flex items-center gap-1"
        >
          <span className="text-slate-600">{'<'}</span>
          <span>还没有通行证？返回购买</span>
        </button>
      </div>
    </div>
  )
}

/**
 * 绑定账号步骤（内部组件）
 * 已登录用户绑定 login_id + password
 */
function BindStep({ onBack, onSuccess }) {
  const { bindAccount, membership, userAccount } = useAuth()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // 已绑定状态
  if (userAccount?.login_id) {
    return (
      <div className="p-1.5 md:p-8">
        <div className="mb-1 md:mb-6 border-b border-slate-700 pb-1 md:pb-4">
          <h2 className="text-xs md:text-xl font-bold text-white tracking-widest flex items-center gap-2">
            <span className="text-[#F59E0B] font-bold">::</span>
            账号绑定
          </h2>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 md:p-6 text-center"
        >
          <ShieldCheck size={20} className="text-emerald-400 mx-auto mb-1 md:mb-3 md:[&]:w-8 md:[&]:h-8" />
          <p className="text-emerald-400 text-[10px] md:text-base font-bold mb-0.5 md:mb-2">已绑定账号</p>
          <p className="text-slate-300 text-[9px] md:text-sm">
            登录账号：<span className="text-white font-mono">{userAccount.login_id}</span>
          </p>
          <p className="text-slate-500 text-[9px] md:text-xs mt-0.5 md:mt-2">可用此账号 + 密码直接登录，无需记住通行证密钥</p>
        </motion.div>
        <div className="mt-1.5 md:mt-5 pt-1 md:pt-4 border-t border-slate-700/50 text-center">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-white text-[10px] md:text-sm transition-colors inline-flex items-center gap-1"
          >
            <span className="text-slate-600">{'<'}</span>
            <span>返回</span>
          </button>
        </div>
      </div>
    )
  }

  // 未登录不能绑定
  if (!membership?.activation_code) {
    return (
      <div className="p-1.5 md:p-8">
        <div className="mb-1 md:mb-6 border-b border-slate-700 pb-1 md:pb-4">
          <h2 className="text-xs md:text-xl font-bold text-white tracking-widest flex items-center gap-2">
            <span className="text-[#F59E0B] font-bold">::</span>
            账号绑定
          </h2>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 p-2 md:p-6 text-center rounded-sm">
          <p className="text-slate-400 text-[10px] md:text-sm mb-1.5 md:mb-4">需要先用通行证密钥登录后才能绑定账号</p>
          <button
            onClick={onBack}
            className="text-[#F59E0B] hover:text-[#FBBF24] text-[10px] md:text-sm font-bold transition-colors"
          >
            返回购买或登录
          </button>
        </div>
      </div>
    )
  }

  const handleBind = async () => {
    if (!loginId.trim() || loginId.trim().length < 2) {
      toast.error('账号至少 2 个字符')
      return
    }
    if (!password || password.length < 4) {
      toast.error('密码至少 4 个字符')
      return
    }
    setLoading(true)
    try {
      await bindAccount(loginId.trim(), password)
      onSuccess?.()
    } catch (err) {
      toast.error(err.message || '绑定失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-1.5 md:p-8">
      <div className="mb-1 md:mb-6 border-b border-slate-700 pb-1 md:pb-4">
        <h2 className="text-xs md:text-xl font-bold text-white tracking-widest flex items-center gap-2">
          <span className="text-[#F59E0B] font-bold">::</span>
          绑定登录账号
        </h2>
        <p className="text-slate-400 text-[9px] md:text-xs mt-0 md:mt-1">绑定后可用 账号+密码 登录，无需记住通行证密钥</p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 px-1.5 py-1 md:px-3 md:py-2 mb-1.5 md:mb-4 rounded-sm text-slate-400 text-[9px] md:text-xs">
        当前通行证密钥：<span className="text-[#F59E0B] font-mono">{membership.activation_code}</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1.5 md:space-y-4"
      >
        <div>
          <label className="block text-[#F59E0B] text-[9px] md:text-xs font-bold mb-0.5 md:mb-2 tracking-wide">设置账号</label>
          <input
            type="text"
            value={loginId}
            onChange={e => setLoginId(e.target.value)}
            placeholder="手机号 / 邮箱 / 自定义昵称"
            disabled={loading}
            className="w-full bg-black/40 text-white px-1.5 py-1 md:px-4 md:py-3 text-xs md:text-base border border-slate-700 focus:border-[#F59E0B] focus:outline-none transition-colors disabled:opacity-50 placeholder:text-slate-700"
            autoComplete="off"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-[#F59E0B] text-[9px] md:text-xs font-bold mb-0.5 md:mb-2 tracking-wide">设置密码</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="至少 4 位"
              disabled={loading}
              className="w-full bg-black/40 text-white px-1.5 py-1 md:px-4 md:py-3 text-xs md:text-base border border-slate-700 focus:border-[#F59E0B] focus:outline-none transition-colors disabled:opacity-50 font-mono pr-10"
              onKeyDown={e => e.key === 'Enter' && !loading && handleBind()}
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
      </motion.div>

      <button
        onClick={handleBind}
        disabled={loading || !loginId.trim() || password.length < 4}
        className="w-full mt-2 md:mt-6 py-1 md:py-3 text-xs md:text-base bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold tracking-[0.2em] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs md:text-sm">绑定中...</span>
          </>
        ) : (
          <>
            <ShieldCheck size={16} />
            <span>绑定账号</span>
          </>
        )}
      </button>

      <div className="mt-1.5 md:mt-5 pt-1 md:pt-4 border-t border-slate-700/50 text-center">
        <button
          onClick={onBack}
          disabled={loading}
          className="text-slate-400 hover:text-white text-[10px] md:text-sm transition-colors inline-flex items-center gap-1"
        >
          <span className="text-slate-600">{'<'}</span>
          <span>返回</span>
        </button>
      </div>
    </div>
  )
}

/**
 * 支付成功页面（内部组件）
 * 展示通行证密钥 + 可选绑定登录账号
 */
function SuccessScreen({ paymentData, copied, onCopy }) {
  const { bindAccount, userAccount } = useAuth()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [binding, setBinding] = useState(false)
  const [bound, setBound] = useState(!!userAccount) // 已有账号则直接显示已绑定
  const [boundLoginId, setBoundLoginId] = useState(userAccount?.login_id || '')

  const handleBind = async () => {
    if (!loginId.trim() || loginId.trim().length < 2) {
      toast.error('账号至少 2 个字符')
      return
    }
    if (!password || password.length < 4) {
      toast.error('密码至少 4 个字符')
      return
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
    <div className="p-1.5 md:p-8 py-2 md:py-8 bg-transparent">
      {/* 顶部成功标识 */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="w-7 h-7 md:w-14 md:h-14 mx-auto mb-1 md:mb-4 rounded-full bg-[#F59E0B]/20 border-2 border-[#F59E0B] flex items-center justify-center"
        >
          <Check size={16} strokeWidth={3} className="text-[#F59E0B] md:[&]:w-8 md:[&]:h-8" />
        </motion.div>
        <h2 className="text-xs md:text-2xl font-bold text-white tracking-widest mb-0 md:mb-1">支付成功</h2>
        <p className="text-slate-400 text-[9px] md:text-sm">会员已开通，通行证密钥已自动复制到剪贴板</p>
      </div>

      {/* 通行证密钥展示 */}
      <div className="mt-1.5 md:mt-5 bg-slate-800/60 border border-[#F59E0B]/30 p-1.5 md:p-4 rounded-lg w-full max-w-sm mx-auto">
        <p className="text-slate-400 text-[9px] md:text-xs mb-0.5 md:mb-2 font-bold uppercase tracking-widest">通行证密钥</p>
        <div className="flex items-center justify-between bg-black/40 p-1 md:p-3 rounded border border-slate-600/50">
          <code className="text-[#F59E0B] font-mono text-[10px] md:text-lg tracking-widest">
            {paymentData.activation_code}
          </code>
          <button
            onClick={() => onCopy(paymentData.activation_code)}
            className="text-slate-400 hover:text-white transition-colors ml-2"
            title="复制通行证密钥"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* 警告 */}
      <motion.p
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-1 md:mt-3 text-center text-red-400 text-[10px] md:text-lg font-bold"
      >
        请截图保存通行证密钥！丢失将无法找回
      </motion.p>

      {/* 分隔 */}
      <div className="flex items-center gap-1.5 md:gap-3 mt-1.5 md:mt-5 mb-1 md:mb-4 max-w-sm mx-auto">
        <div className="flex-1 h-px bg-slate-700" />
        <span className="text-slate-500 text-[9px] md:text-xs">或绑定账号，忘记密钥也能登录</span>
        <div className="flex-1 h-px bg-slate-700" />
      </div>

      {/* 绑定账号表单 */}
      <div className="w-full max-w-sm mx-auto">
        {!bound ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-1 md:space-y-3"
          >
            <div>
              <input
                type="text"
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                placeholder="设置账号（手机号 / 邮箱 / 自定义昵称）"
                className="w-full bg-black/40 border border-slate-600/50 rounded-md px-1.5 py-1 md:px-3 md:py-2.5 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-[#F59E0B]/50 transition-colors"
              />
            </div>
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
    </div>
  )
}
