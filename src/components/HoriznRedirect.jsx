'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getLatestHoriznMonth } from '@/services/horiznSupabase'

/**
 * Horizn 重定向组件
 * 自动获取最新游戏月并重定向到对应路由
 */
export function HoriznRedirect() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const yearMonth = await getLatestHoriznMonth()
        router.replace(`/horizn/${yearMonth}`)
      } catch (error) {
        console.error('Failed to get latest horizn month:', error)
        // Fallback to current month
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        router.replace(`/horizn/${year}${month}`)
      } finally {
        setLoading(false)
      }
    }

    fetchLatest()
  }, [router])

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">加载中...</p>
        </div>
      </div>
    )
  }

  return null
}
