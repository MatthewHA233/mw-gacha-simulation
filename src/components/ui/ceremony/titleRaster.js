/**
 * 把页面上（隐藏占位的）标题文字按同样的字体画进离屏画布：
 *   image  上色后的成品（金色 / 白色竖向渐变 + 一圈细描边 + 投影），聚字完成后整张贴到仪式画布上
 *   mask   纯白字形，金箔扫光时当遮罩
 *   points 字形笔画上的采样点（CSS 像素，已加上标题在仪式层里的位置），给聚字粒子当落点
 * 采样和成品出自同一张离屏画布，粒子最终位置和显形的字严丝合缝。
 */

const PAD = 14

const PALETTES = {
  gold: { stops: ['#fff6d6', '#ffd86b', '#e7a42a'], outline: 'rgba(110,68,4,0.7)' },
  white: { stops: ['#ffffff', '#f3efff', '#d9d1f5'], outline: 'rgba(40,30,70,0.55)' },
}

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return canvas
}

function prepare(ctx, style, dpr) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  if ('letterSpacing' in ctx) ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
}

/**
 * @param el     标题元素（inline-block，visibility 占位）
 * @param box    el 在仪式层里的位置 { x, y, w, h }（用 offset 链算的，不受旋转 / 动画影响）
 * @param tone   'gold' | 'white'
 * @param gap    采样间距（CSS 像素）
 * @param max    最多取多少个点（超出随机抽）
 */
export function rasterizeTitle(el, box, { tone = 'gold', gap = 2.4, max = 1400 } = {}) {
  const style = getComputedStyle(el)
  const text = el.textContent
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = box.w + PAD * 2
  const h = box.h + PAD * 2
  const W = Math.ceil(w * dpr)
  const H = Math.ceil(h * dpr)
  const midY = PAD + box.h / 2

  const mask = makeCanvas(W, H)
  const mctx = mask.getContext('2d', { willReadFrequently: true })
  prepare(mctx, style, dpr)
  mctx.fillStyle = '#ffffff'
  mctx.fillText(text, PAD, midY)

  const image = makeCanvas(W, H)
  const ictx = image.getContext('2d')
  prepare(ictx, style, dpr)
  const palette = PALETTES[tone]
  const grad = ictx.createLinearGradient(0, PAD, 0, PAD + box.h)
  palette.stops.forEach((color, i) => grad.addColorStop(i / (palette.stops.length - 1), color))
  ictx.shadowColor = 'rgba(0,0,0,0.5)'
  ictx.shadowBlur = 8
  ictx.shadowOffsetY = 2
  ictx.fillStyle = grad
  ictx.fillText(text, PAD, midY)
  ictx.shadowColor = 'transparent'
  ictx.strokeStyle = palette.outline
  ictx.lineWidth = 0.8
  ictx.strokeText(text, PAD, midY)
  ictx.fillStyle = grad
  ictx.fillText(text, PAD, midY)

  const data = mctx.getImageData(0, 0, W, H).data
  const step = Math.max(1, Math.round(gap * dpr))
  const all = []
  for (let y = 0; y < H; y += step) {
    for (let x = (y / step) % 2 ? Math.floor(step / 2) : 0; x < W; x += step) {
      if (data[(y * W + x) * 4 + 3] > 150) all.push([box.x - PAD + x / dpr, box.y - PAD + y / dpr])
    }
  }
  const points = all.length <= max ? all : all.filter(() => Math.random() < max / all.length)

  return { image, mask, points, x: box.x - PAD, y: box.y - PAD, w, h, fx: makeCanvas(W, H) }
}
