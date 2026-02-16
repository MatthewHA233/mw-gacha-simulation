/**
 * Supabase 浏览器端客户端（惰性单例）
 *
 * 使用 anon key，仅在客户端组件中使用（Realtime 订阅等）。
 * 环境变量缺失时返回 null。
 */

import { createClient } from '@supabase/supabase-js'

let _supabase = null
let _initialized = false

/**
 * 获取 Supabase 浏览器端客户端
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
export function getBrowserSupabase() {
  if (_initialized) return _supabase

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    console.warn('[Supabase Browser] 环境变量未配置 (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)')
    _initialized = true
    return null
  }

  _supabase = createClient(url, anonKey)
  _initialized = true
  return _supabase
}
