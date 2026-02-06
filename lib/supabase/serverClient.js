/**
 * Supabase 服务端客户端（惰性初始化）
 *
 * 使用 service_role key，仅在服务端 API 路由中使用。
 * 环境变量缺失时返回 null 而非抛异常，避免阻塞启动。
 */

import { createClient } from '@supabase/supabase-js'

let _supabase = null
let _initialized = false

/**
 * 获取 Supabase 服务端客户端
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
export function getSupabase() {
  if (_initialized) return _supabase

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  if (!url || !serviceKey) {
    console.warn('[Supabase] 环境变量未配置 (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY)')
    _initialized = true
    return null
  }

  _supabase = createClient(url, serviceKey, {
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
    }
  })
  _initialized = true
  return _supabase
}
