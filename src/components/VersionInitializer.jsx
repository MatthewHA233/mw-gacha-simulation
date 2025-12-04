'use client'

import { useEffect, useRef } from 'react'
import { loadVersionHistory, clearConfigCache } from '../services/cdnService'
import { setAppVersion, getAppVersion } from '../utils/version'
import { checkAndResetIfNeeded, getStoredVersion } from '../utils/gameStateStorage'

/**
 * 版本初始化组件
 * 在客户端挂载后执行版本检查和数据重置逻辑
 */
export function VersionInitializer() {
  const versionCheckStartedRef = useRef(false)

  useEffect(() => {
    // 防止 StrictMode 重复执行版本检查
    if (versionCheckStartedRef.current) {
      return
    }
    versionCheckStartedRef.current = true

    const initializeVersion = async () => {
      try {
        // 1. 异步加载真实版本号
        const data = await loadVersionHistory()
        if (data?.currentVersion) {
          setAppVersion(data.currentVersion)

          // 2. 加载完成后执行版本检查
          const resetResult = checkAndResetIfNeeded()

          // 3. 如果触发了重置，设置 sessionStorage 标记
          if (resetResult?.wasReset) {
            sessionStorage.setItem('mw_gacha_version_updated', JSON.stringify({
              newVersion: resetResult.newVersion,
              oldVersion: resetResult.oldVersion
            }))
          }
        }
      } catch (error) {
        console.error('Failed to initialize version:', error)
      }
    }

    initializeVersion()

    // 开发者工具：挂载到全局 window 对象，方便调试
    if (process.env.NODE_ENV === 'development') {
      window.__MW_DEBUG__ = {
        getCurrentVersion: () => {
          const info = {
            current: getAppVersion(),
            stored: getStoredVersion()
          }
          console.log('Version Info:', info)
          return info
        },
        refreshVersion: async () => {
          clearConfigCache('version-history')
          clearConfigCache('site-info')
          const data = await loadVersionHistory()
          setAppVersion(data.currentVersion)
          console.log('Refreshed to:', data.currentVersion)
          location.reload()
        },
        forceUpdate: (newVersion) => {
          localStorage.removeItem('mw_gacha_app_version')
          setAppVersion(newVersion)
          checkAndResetIfNeeded()
          location.reload()
        }
      }
    }
  }, [])

  // 这个组件不渲染任何内容
  return null
}
