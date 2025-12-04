'use client'

/**
 * 支付弹窗组件
 * 支持支付宝和微信支付
 */

import { useState } from 'react'
import { X } from 'lucide-react'
import { usePayment } from '@/hooks/usePayment'
import toast from 'react-hot-toast'

export function PaymentModal({ isOpen, onClose, onSuccess }) {
  const [selectedPayType, setSelectedPayType] = useState('alipay')
  const [amount, setAmount] = useState(100) // 默认 1 元（100 分）
  const { loading, createPayment, pollPaymentStatus } = usePayment()

  if (!isOpen) return null

  const handlePay = async () => {
    try {
      // 1. 发起支付
      const paymentResult = await createPayment({
        amount,
        description: '购买筹码',
        pay_type: selectedPayType,
        attach: JSON.stringify({
          userId: 'user123', // 替换为实际用户 ID
          itemType: 'chips',
          itemCount: amount / 10, // 示例：10 分 = 1 个筹码
        }),
      })

      console.log('支付创建成功:', paymentResult)

      // 2. 跳转到支付页面
      window.location.href = paymentResult.jump_url

      // 3. 开始轮询查询支付状态
      const stopPolling = pollPaymentStatus(
        paymentResult.out_trade_no,
        (order) => {
          // 支付成功
          toast.success('支付成功！')
          onSuccess && onSuccess(order)
          onClose()
        },
        (order) => {
          // 支付失败
          toast.error('支付失败')
          console.log('支付失败:', order)
        }
      )

      // 当用户关闭弹窗时，停止轮询
      return () => stopPolling()

    } catch (error) {
      toast.error(error.message || '发起支付失败')
      console.error('支付失败:', error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-700">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* 标题 */}
        <h2 className="text-2xl font-bold text-white mb-6">
          选择支付方式
        </h2>

        {/* 金额选择 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            支付金额
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[100, 500, 1000, 2000, 5000, 10000].map((value) => (
              <button
                key={value}
                onClick={() => setAmount(value)}
                className={`py-3 rounded-lg font-semibold transition-all ${
                  amount === value
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                ¥{(value / 100).toFixed(2)}
              </button>
            ))}
          </div>
        </div>

        {/* 支付方式选择 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            支付方式
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedPayType('alipay')}
              className={`flex-1 py-4 rounded-lg font-semibold transition-all ${
                selectedPayType === 'alipay'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              支付宝
            </button>
            <button
              onClick={() => setSelectedPayType('wechat')}
              className={`flex-1 py-4 rounded-lg font-semibold transition-all ${
                selectedPayType === 'wechat'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              微信支付
            </button>
          </div>
        </div>

        {/* 确认支付按钮 */}
        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '处理中...' : `确认支付 ¥${(amount / 100).toFixed(2)}`}
        </button>

        {/* 提示信息 */}
        <p className="text-xs text-gray-400 mt-4 text-center">
          点击确认后将跳转到支付页面
        </p>
      </div>
    </div>
  )
}
