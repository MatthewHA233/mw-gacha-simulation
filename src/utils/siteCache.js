/**
 * 清掉网站在浏览器里的资源缓存（2026-10-15）
 *
 * public/sw.js 把 CDN 图片 / 音频按「缓存优先」永久存在 Cache Storage 里，换图后老用户一直看到旧图。
 * 版本号变化时调用：删掉全部 Cache Storage，并让 Service Worker 去取最新的 sw.js。
 * 浏览器自己的 HTTP 磁盘缓存 JS 删不了；sw.js 重新取图时用 cache: 'no-cache' 向服务器确认，等效绕过。
 *
 * @returns {Promise<number>} 删掉的缓存个数（0 = 本来就没有，不用刷新页面）
 */
export async function clearSiteCaches() {
  let removed = 0
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys()
      const results = await Promise.all(keys.map((key) => caches.delete(key)))
      removed = results.filter(Boolean).length
    }
  } catch (error) {
    console.error('[清理缓存] Cache Storage 删除失败:', error)
  }
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.update().catch(() => {})))
    }
  } catch (error) {
    console.error('[清理缓存] Service Worker 更新失败:', error)
  }
  return removed
}
