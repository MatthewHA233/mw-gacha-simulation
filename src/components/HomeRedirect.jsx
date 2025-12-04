'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadActivityIndex, getGachaTypePath } from '../services/cdnService'

/**
 * 主页重定向组件
 * 从 index.json 读取第一个活动，自动重定向到对应页面
 */
export function HomeRedirect() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLatestActivity = async () => {
      try {
        const data = await loadActivityIndex()

        if (data.activities && data.activities.length > 0) {
          const firstActivity = data.activities[0]
          const typePath = getGachaTypePath(firstActivity.gacha_type)
          const path = `/gacha/${typePath}/${firstActivity.id}`

          console.log(`[HomeRedirect] Redirecting to latest activity: ${firstActivity.name} (${firstActivity.id})`)
          router.replace(path)
        } else {
          // 兜底：如果没有活动，重定向到一个默认路径
          console.error('[HomeRedirect] No activities found in index.json')
          router.replace('/gacha/chip/ag97')
        }
      } catch (error) {
        console.error('[HomeRedirect] Failed to load activity index:', error)
        // 错误兜底：重定向到一个默认路径
        router.replace('/gacha/chip/ag97')
      } finally {
        setLoading(false)
      }
    }

    loadLatestActivity()
  }, [router])

  if (loading) {
    // 加载中：显示一个简单的加载界面
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="text-white text-xl">加载中...</div>
      </div>
    )
  }

  return null
}
