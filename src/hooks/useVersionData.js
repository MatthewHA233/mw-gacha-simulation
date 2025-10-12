import { useState, useEffect } from 'react'
import { loadVersionHistory } from '../services/cdnService'

/**
 * 版本历史数据 Hook
 * 从 CDN 加载版本历史、规则说明、统计信息
 * 注意：版本号的全局更新已在 App.jsx 中处理
 * @returns {Object} { versionData, loading, error }
 */
export function useVersionData() {
  const [versionData, setVersionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchVersionData = async () => {
      try {
        setLoading(true)
        const data = await loadVersionHistory()
        setVersionData(data)
        setError(null)
      } catch (err) {
        console.error('Failed to load version data:', err)
        setError(err.message)
        setVersionData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchVersionData()
  }, [])

  return { versionData, loading, error }
}
