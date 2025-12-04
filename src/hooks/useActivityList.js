'use client'

import { useState, useEffect } from 'react'
import { loadActivityIndex } from '../services/cdnService'

/**
 * 活动列表 Hook
 * 从 CDN 加载所有活动列表
 * @returns {Object} { activities, loading, error }
 */
export function useActivityList() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true)
        const data = await loadActivityIndex()
        setActivities(data.activities || [])
        setError(null)
      } catch (err) {
        console.error('Failed to load activities:', err)
        setError(err.message)
        setActivities([])
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [])

  return { activities, loading, error }
}
