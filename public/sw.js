// Service Worker — 静态资源本地缓存（Cache-First）
// 缓存 /assets/**、/audio/**、/lootbox/** 以及 CDN 域名下的图片/音频
// 不缓存 /api/**、/gacha-configs/**（需实时更新）

// 改名 = 新 SW 激活时把旧缓存整个删掉（activate 里只留当前这个名字）。
// v2（2026-10-15）：v1 期间换过的图（结果弹窗背景等）老用户一直看到旧的，升版本一次性清掉
const CACHE_NAME = 'mw-gacha-assets-v2'

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

// 去网络取一份能放进缓存的响应。
// - CDN（assets.lingflow.cn 统一带 Access-Control-Allow-Origin: *）改用 cors 模式取：能看到真实状态码。
//   原先 <img> 发的是 no-cors，拿到的是「不透明响应」看不出成败，连 404 也被当成好图永久缓存（2026-10-15 新封面上传前被请求了一次，
//   之后一直是裂图）。
// - 缓存里没有才走网络，向服务器确认（no-cache，没变就是 304），不从浏览器 HTTP 磁盘缓存里拿旧图回来填缓存。
// - 音频是分段请求（Range），原样转发、不缓存。
async function fetchFromNetwork(request) {
  if (request.headers.has('range')) return { response: await fetch(request), cacheable: false }
  const { hostname } = new URL(request.url)
  if (hostname === 'assets.lingflow.cn' && request.mode === 'no-cors') {
    try {
      const response = await fetch(new Request(request.url, { mode: 'cors', credentials: 'omit', cache: 'no-cache' }))
      return { response, cacheable: response.ok }
    } catch {
      // 万一某个文件没带跨域头：退回原请求，照常显示但不缓存
      return { response: await fetch(request), cacheable: false }
    }
  }
  const response = await fetch(new Request(request, { cache: 'no-cache' }))
  // 只缓存看得见状态码的成功响应；不透明响应（外站图片）不缓存——看不出成败，而且 Chrome 按每条约 7MB 计入配额
  return { response, cacheable: response.ok && response.type !== 'opaque' }
}

// fetch: Cache-First 策略
self.addEventListener('fetch', (event) => {
  // 只处理 http/https 请求（排除 chrome-extension:// 等）
  if (!event.request.url.startsWith('http')) return
  if (event.request.method !== 'GET') return
  if (!shouldCache(event.request.url)) return

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request)
      if (cached) return cached
      const { response, cacheable } = await fetchFromNetwork(event.request)
      if (cacheable && response.status === 200) cache.put(event.request, response.clone())
      return response
    })
  )
})
