/**
 * 管理员账号（login_id）只存在服务端环境变量 ADMIN_LOGIN_ID 里，不进源码、不发给前端。
 * 前端判断是否管理员一律问 GET /api/admin/whoami。
 */
export const ADMIN_LOGIN_ID = process.env.ADMIN_LOGIN_ID || ''

/** 前端发给管理员接口的身份头（值取自 localStorage 里当前登录的通行证密钥和设备 ID） */
export const ADMIN_CODE_HEADER = 'x-mw-activation-code'
export const ADMIN_DEVICE_HEADER = 'x-mw-device-id'

/**
 * 服务端确认调用者是管理员（2026-10-15）。
 *
 * /admin 页面原先只在前端比对 localStorage 里的账号，/api/admin/* 本身不校验 —— 能发会员的接口不能这样。
 * 做法同 /api/auth/bind-pass：请求带上当前登录的通行证密钥 + 设备 ID，设备必须在这把密钥的 devices 里，
 * 密钥绑定的账号 login_id 必须是管理员。
 *
 * @returns {Promise<{ ok: true, loginId: string } | { ok: false, status: number, error: string }>}
 */
export async function requireAdmin(request, supabase) {
  const code = (request.headers.get(ADMIN_CODE_HEADER) || '').toUpperCase().trim()
  const deviceId = (request.headers.get(ADMIN_DEVICE_HEADER) || '').trim()
  if (!code || !deviceId) return { ok: false, status: 401, error: '未登录' }

  const { data: membership, error } = await supabase
    .from('memberships')
    .select('user_id, devices')
    .eq('activation_code', code)
    .maybeSingle()
  if (error) throw error
  if (!membership?.user_id) return { ok: false, status: 403, error: '无权限' }

  const devices = Array.isArray(membership.devices) ? membership.devices : []
  if (!devices.some((d) => d.device_id === deviceId)) return { ok: false, status: 403, error: '设备验证失败' }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('login_id')
    .eq('id', membership.user_id)
    .maybeSingle()
  if (userError) throw userError
  if (!ADMIN_LOGIN_ID || user?.login_id !== ADMIN_LOGIN_ID) return { ok: false, status: 403, error: '无权限' }

  return { ok: true, loginId: user.login_id }
}
