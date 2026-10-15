import { ADMIN_CODE_HEADER, ADMIN_DEVICE_HEADER } from '@lib/admin/adminAuth'

/**
 * 管理后台调 /api/admin/* 一律走这里（2026-10-15）：接口在服务端核对管理员身份，
 * 每个请求都要带上当前登录的通行证密钥和设备 ID（与 useAuth 用同一组 localStorage 键）。
 */
export function adminFetch(url, options = {}) {
    let code = ''
    let deviceId = ''
    try {
        code = localStorage.getItem('mw_activation_code') || ''
        deviceId = localStorage.getItem('mw_device_id') || ''
    } catch { /* 存储不可用：接口会返回未登录 */ }
    return fetch(url, {
        ...options,
        headers: { ...(options.headers || {}), [ADMIN_CODE_HEADER]: code, [ADMIN_DEVICE_HEADER]: deviceId },
    })
}
