'use client'

/**
 * 认证状态管理（Context 模式）
 *
 * 所有组件共享同一份认证状态，登录/注销时全局同步更新。
 *
 * 用法:
 *   1. 在 App 顶层包裹 <AuthProvider>
 *   2. 任意组件中 const { isMember, activate, ... } = useAuth()
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ACTIVATION_CODE_KEY = 'mw_activation_code'
const DEVICE_ID_KEY = 'mw_device_id'
const MEMBERSHIP_KEY = 'mw_membership'
const USER_KEY = 'mw_user'
const ALL_MEMBERSHIPS_KEY = 'mw_all_memberships'

function getOrCreateDeviceId() {
  if (typeof window === 'undefined') return ''
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    // crypto.randomUUID() 仅在安全上下文(HTTPS/localhost)可用，需 fallback
    try {
      deviceId = crypto.randomUUID()
    } catch {
      deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
      })
    }
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  return deviceId
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [membership, setMembership] = useState(null)
  const [userAccount, setUserAccount] = useState(null) // { login_id, user_id }
  const [allMemberships, setAllMemberships] = useState([])
  const [loading, setLoading] = useState(true)
  const [deviceId, setDeviceId] = useState('')

  const isActivated = !!membership?.activation_code
  // isMember: 任意一个激活码未过期即可
  const isMember = isActivated && membership?.is_active && (
    allMemberships.length > 0
      ? allMemberships.some(m => m.remaining_days > 0)
      : !membership?.is_expired
  )
  const totalRemainingDays = allMemberships.reduce((sum, m) => sum + (m.remaining_days || 0), 0)

  // 初始化：客户端挂载后从 localStorage 恢复
  useEffect(() => {
    try {
      // 初始化设备ID（SSR 阶段为空，客户端挂载后设置）
      setDeviceId(getOrCreateDeviceId())

      const savedCode = localStorage.getItem(ACTIVATION_CODE_KEY)
      const savedMembership = localStorage.getItem(MEMBERSHIP_KEY)
      const savedUser = localStorage.getItem(USER_KEY)

      if (savedCode && savedMembership) {
        const cached = JSON.parse(savedMembership)
        const isExpired = cached.membership_expire_at
          ? new Date(cached.membership_expire_at) < new Date()
          : true
        setMembership({ ...cached, is_expired: isExpired })

        // 恢复 allMemberships（串行计算贡献天数，与后端一致）
        const savedAllMemberships = localStorage.getItem(ALL_MEMBERSHIPS_KEY)
        if (savedAllMemberships) {
          try {
            const parsed = JSON.parse(savedAllMemberships)
            const now = new Date()
            const sorted = [...parsed].sort(
              (a, b) => new Date(a.membership_expire_at) - new Date(b.membership_expire_at)
            )
            let cursor = now
            const refreshed = sorted.map(m => {
              const expireAt = m.membership_expire_at ? new Date(m.membership_expire_at) : now
              const start = cursor > now ? cursor : now
              const contribution = Math.max(0, Math.ceil((expireAt - start) / (1000 * 60 * 60 * 24)))
              if (expireAt > cursor) cursor = expireAt
              return { ...m, remaining_days: contribution }
            })
            setAllMemberships(refreshed)
          } catch { /* ignore */ }
        }

        // 异步后台验证（不阻塞）
        verifyInBackground(savedCode)
      }

      if (savedUser) {
        setUserAccount(JSON.parse(savedUser))
      }
    } catch (error) {
      console.error('[useAuth] 恢复失败:', error)
      localStorage.removeItem(ACTIVATION_CODE_KEY)
      localStorage.removeItem(MEMBERSHIP_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(ALL_MEMBERSHIPS_KEY)
    } finally {
      setLoading(false)
    }
  }, [])

  const verifyInBackground = async (code) => {
    try {
      const dId = localStorage.getItem(DEVICE_ID_KEY) || ''
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activation_code: code, device_id: dId })
      })

      if (!response.ok) {
        if (response.status === 404) {
          localStorage.removeItem(ACTIVATION_CODE_KEY)
          localStorage.removeItem(MEMBERSHIP_KEY)
          setMembership(null)
        }
        return
      }

      const result = await response.json()
      if (result.success && result.data.valid) {
        localStorage.setItem(MEMBERSHIP_KEY, JSON.stringify(result.data))
        setMembership(result.data)

        if (result.data.all_memberships) {
          localStorage.setItem(ALL_MEMBERSHIPS_KEY, JSON.stringify(result.data.all_memberships))
          setAllMemberships(result.data.all_memberships)
        }
      }
    } catch (err) {
      console.error('[useAuth] 后台验证失败:', err)
    }
  }

  /**
   * 用序列号激活
   */
  const activate = useCallback(async (code, password) => {
    // 直接从 localStorage 读取 deviceId，避免 SSR 闭包问题
    const dId = getOrCreateDeviceId()
    const response = await fetch('/api/auth/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activation_code: code.toUpperCase().trim(),
        password: password || undefined,
        device_id: dId
      })
    })
    const result = await response.json()
    if (!response.ok) throw result

    const data = result.data
    localStorage.setItem(ACTIVATION_CODE_KEY, data.activation_code)
    localStorage.setItem(MEMBERSHIP_KEY, JSON.stringify(data))
    setMembership(data)

    if (data.all_memberships) {
      localStorage.setItem(ALL_MEMBERSHIPS_KEY, JSON.stringify(data.all_memberships))
      setAllMemberships(data.all_memberships)
    }

    // 如果返回了用户信息，也保存
    if (data.user_account) {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user_account))
      setUserAccount(data.user_account)
    }

    return data
  }, [])

  /**
   * 用账号密码登录
   */
  const loginByAccount = useCallback(async (loginId, password) => {
    const dId = getOrCreateDeviceId()
    const response = await fetch('/api/auth/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login_id: loginId.trim(),
        password,
        device_id: dId
      })
    })
    const result = await response.json()
    if (!response.ok) throw result

    const data = result.data
    localStorage.setItem(ACTIVATION_CODE_KEY, data.activation_code)
    localStorage.setItem(MEMBERSHIP_KEY, JSON.stringify(data))
    setMembership(data)

    if (data.all_memberships) {
      localStorage.setItem(ALL_MEMBERSHIPS_KEY, JSON.stringify(data.all_memberships))
      setAllMemberships(data.all_memberships)
    }

    if (data.user_account) {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user_account))
      setUserAccount(data.user_account)
    }

    return data
  }, [])

  /**
   * 支付后自动激活（带重试）
   */
  const activateAfterPayment = useCallback(async (code) => {
    for (let i = 0; i < 5; i++) {
      try {
        return await activate(code)
      } catch (err) {
        if (err.error === '该通行证密钥尚未完成支付') {
          await new Promise(r => setTimeout(r, 2000))
          continue
        }
        throw err
      }
    }
    throw new Error('登录超时，请手动输入通行证密钥')
  }, [activate])

  /**
   * 绑定新通行证到已有账号
   */
  const bindPass = useCallback(async (newCode) => {
    const dId = getOrCreateDeviceId()
    const currentCode = localStorage.getItem(ACTIVATION_CODE_KEY)
    if (!currentCode) throw new Error('请先登录')

    const response = await fetch('/api/auth/bind-pass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_activation_code: currentCode,
        new_activation_code: newCode.toUpperCase().trim(),
        device_id: dId
      })
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || '绑定失败')

    if (result.data?.all_memberships) {
      localStorage.setItem(ALL_MEMBERSHIPS_KEY, JSON.stringify(result.data.all_memberships))
      setAllMemberships(result.data.all_memberships)
    }

    return result
  }, [])

  /**
   * 绑定账号（创建/关联用户）
   */
  const bindAccount = useCallback(async (loginId, password) => {
    if (!membership?.activation_code) throw new Error('请先登录')

    const response = await fetch('/api/auth/bind-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activation_code: membership.activation_code,
        login_id: loginId.trim(),
        password
      })
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || '绑定失败')

    const account = { login_id: loginId.trim(), user_id: result.data.user_id }
    localStorage.setItem(USER_KEY, JSON.stringify(account))
    setUserAccount(account)

    return result
  }, [membership])

  /**
   * 注销
   */
  const deactivate = useCallback(() => {
    localStorage.removeItem(ACTIVATION_CODE_KEY)
    localStorage.removeItem(MEMBERSHIP_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(ALL_MEMBERSHIPS_KEY)
    setMembership(null)
    setUserAccount(null)
    setAllMemberships([])
  }, [])

  /**
   * 手动刷新验证
   */
  const verify = useCallback(async () => {
    const code = localStorage.getItem(ACTIVATION_CODE_KEY)
    if (code) await verifyInBackground(code)
  }, [])

  const value = {
    // 状态
    isActivated,
    isMember,
    membership,
    userAccount,
    allMemberships,
    totalRemainingDays,
    loading,
    deviceId,

    // 兼容旧代码
    isPremium: isMember,
    user: membership ? { username: membership.activation_code, ...membership } : null,
    isLoggedIn: isActivated,

    // 方法
    activate,
    loginByAccount,
    activateAfterPayment,
    bindAccount,
    bindPass,
    deactivate,
    verify,

    // 兼容
    logout: deactivate
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// SSR / 未包裹 AuthProvider 时的安全默认值
const defaultValue = {
  isActivated: false,
  isMember: false,
  membership: null,
  userAccount: null,
  allMemberships: [],
  totalRemainingDays: 0,
  loading: true,
  deviceId: '',
  isPremium: false,
  user: null,
  isLoggedIn: false,
  activate: async () => {},
  loginByAccount: async () => {},
  activateAfterPayment: async () => {},
  bindAccount: async () => {},
  bindPass: async () => {},
  deactivate: () => {},
  verify: async () => {},
  logout: () => {}
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  return ctx || defaultValue
}
