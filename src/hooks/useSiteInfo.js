'use client'

import { useState, useEffect } from 'react'
import { loadSiteInfo } from '../services/cdnService'

/**
 * 网站信息数据 Hook
 * 从 CDN 加载网站基本信息、赞赏者名单、致谢信息
 * @returns {Object} { siteInfo, loading, error }
 */
export function useSiteInfo() {
  const [siteInfo, setSiteInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchSiteInfo = async () => {
      try {
        setLoading(true)
        const data = await loadSiteInfo()
        setSiteInfo(data.siteInfo) // 注意：JSON中是嵌套在 siteInfo 字段下
        setError(null)
      } catch (err) {
        console.error('Failed to load site info:', err)
        setError(err.message)
        setSiteInfo(null)
      } finally {
        setLoading(false)
      }
    }

    fetchSiteInfo()
  }, [])

  return { siteInfo, loading, error }
}
