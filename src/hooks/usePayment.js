'use client'

/**
 * 支付 Hook
 * 提供发起支付和查询支付状态的功能
 */

import { useState, useCallback } from 'react'

export function usePayment() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * 发起支付
   * @param {Object} paymentData - 支付数据
   * @param {number} paymentData.amount - 金额（分）
   * @param {string} paymentData.description - 商品描述
   * @param {string} paymentData.pay_type - 支付类型（alipay | wechat）
   * @param {string} paymentData.attach - 自定义数据（可选）
   * @returns {Promise<Object>} 支付跳转信息
   */
  const createPayment = useCallback(async (paymentData) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '支付请求失败')
      }

      return result.data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 查询订单状态
   * @param {string} out_trade_no - 商家订单号
   * @returns {Promise<Object>} 订单信息
   */
  const queryPayment = useCallback(async (out_trade_no) => {
    try {
      const response = await fetch(`/api/payment/query?out_trade_no=${out_trade_no}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '查询订单失败')
      }

      return result.data
    } catch (err) {
      console.error('查询订单失败:', err)
      throw err
    }
  }, [])

  /**
   * 轮询查询订单状态（用于支付后等待回调）
   * @param {string} out_trade_no - 商家订单号
   * @param {Function} onSuccess - 支付成功回调
   * @param {Function} onFailed - 支付失败回调
   * @param {number} maxRetries - 最大重试次数（默认 60 次，即 2 分钟）
   */
  const pollPaymentStatus = useCallback((out_trade_no, onSuccess, onFailed, maxRetries = 60) => {
    let retries = 0
    const interval = setInterval(async () => {
      retries++

      try {
        const order = await queryPayment(out_trade_no)

        if (order.status === 'paid') {
          clearInterval(interval)
          onSuccess && onSuccess(order)
        } else if (order.status === 'failed') {
          clearInterval(interval)
          onFailed && onFailed(order)
        } else if (retries >= maxRetries) {
          clearInterval(interval)
          console.log('轮询超时，停止查询')
        }
      } catch (err) {
        console.error('轮询查询失败:', err)
      }
    }, 2000) // 每 2 秒查询一次

    // 返回清除函数，用于手动停止轮询
    return () => clearInterval(interval)
  }, [queryPayment])

  return {
    loading,
    error,
    createPayment,
    queryPayment,
    pollPaymentStatus,
  }
}
