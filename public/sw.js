// Service Worker — 静态资源本地缓存（Cache-First）
// 缓存 /assets/**、/audio/**、/lootbox/** 以及 CDN 域名下的图片/音频
// 不缓存 /api/**、/gacha-configs/**（需实时更新）

const CACHE_NAME = 'mw-gacha-assets-v1'

// 判断请求是否应该走缓存
function shouldCache(url) {
  const { pathname, hostname } = new URL(url)

  // 不缓存 API 和配置文件
  if (pathname.startsWith('/api/') || pathname.startsWith('/gacha-configs/')) {
    return false
  }

  // 本地静态资源
  if (pathname.startsWith('/assets/') || pathname.startsWith('/audio/') || pathname.startsWith('/lootbox/')) {
    return true
  }

  // CDN 域名（图片/音频）
  if (hostname === 'assets.lingflow.cn') {
    return true
  }

  // 外部图片资源（mwstats.info 的预览图/sprites）
  if (hostname === 'mwstats.info' && /\.(png|jpg|jpeg|webp|gif|svg|wav|mp3|ogg)(\?|$)/i.test(pathname)) {
    return true
  }

  return false
}

// install: 立即激活，不做预缓存
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// activate: 清理旧版本缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// fetch: Cache-First 策略
self.addEventListener('fetch', (event) => {
  // 只处理 http/https 请求（排除 chrome-extension:// 等）
  if (!event.request.url.startsWith('http')) return
  if (event.request.method !== 'GET') return
  if (!shouldCache(event.request.url)) return

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached

        return fetch(event.request).then((response) => {
          // 缓存条件：
          // - 200 OK（同源正常响应）
          // - opaque（跨域 CDN 资源，status=0 但内容可用）
          // 排除：206 Partial Content、404 等
          if (response.status === 200 || response.type === 'opaque') {
            cache.put(event.request, response.clone())
          }
          return response
        })
      })
    )
  )
})
