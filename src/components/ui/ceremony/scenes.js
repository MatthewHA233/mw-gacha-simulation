import { TAU, pick, rand } from './engine'

/**
 * 每档仪式的粒子分镜。a = 锚点：
 *   w h      仪式层尺寸        bx by bs  徽章中心与边长      land 徽章落定时刻（秒）
 *   k        粒子密度系数（按屏幕面积，手机自动减量）       s 尺寸系数（按短边）
 *   title    聚字用的标题栅格（titleRaster 的结果；只有半神 / 王有）
 * 粒子只在徽章周围、屏幕左右窄带、上方两角出现，中间的抽奖结果不挡。
 */

const SILVER = ['#ffffff', '#e4ecf6', '#b8dcff']
const GOLD = ['#fff3c4', '#ffd86b', '#ffc23d', '#ffffff']
const LAVENDER = ['#efe8ff', '#c9bbf0', '#a993ea']
const GLITCH = ['#4fe3ff', '#ff7ad9', '#ffffff']
const CONFETTI = [['#7ff0b8', '#3fae7d'], ['#ffd166', '#c99a2e'], ['#ff8fb1', '#c95b7d'], ['#8fd0ff', '#4c93c9'], ['#ffffff', '#c9d3e0']]

// 左右两条窄带里随机取一个 x（side: 'L' | 'R' | 不传就随机）
const bandX = (a, side = Math.random() < 0.5 ? 'L' : 'R') => {
  const band = a.w < 900 ? 0.085 : 0.115
  return side === 'L' ? rand(0.004, band) * a.w : a.w - rand(0.004, band) * a.w
}

// 两侧窄带里慢慢升起（或飘落）的细粉，一开始就铺满整条带子
function bandDust(scene, a, { colors, from, to, rate, rise = true, split = false, glint = 0.25 }) {
  scene.emit(from, to, rate * a.k, (s) => {
    const side = Math.random() < 0.5 ? 'L' : 'R'
    s.add('dust', {
      x: bandX(a, side), y: rand(0.08, 1) * a.h,
      vx: rand(-6, 6), vy: rise ? -rand(30, 110) * a.s : rand(12, 45) * a.s, wander: 14,
      r: rand(0.5, 1.5) * a.s, color: split ? pick(side === 'L' ? GOLD : LAVENDER) : pick(colors),
      life: rand(1.8, 3.2), tw: rand(4, 10), ph: rand(0, TAU), glint: Math.random() < glint, alpha: rand(0.6, 1),
    })
  })
}

// 徽章落定：一两圈冲击波 + 一圈火花（split：往左的金、往右的紫）
function landing(scene, a, { colors, sparks = 36, rings = [[1.7, 1.4]], split = false, power = 300 }) {
  scene.at(a.land, (s) => {
    rings.forEach(([scale, width], i) => {
      s.at(a.land + i * 0.08, (s2) => s2.add('ring', {
        x: a.bx, y: a.by, r0: a.bs * 0.5, r1: a.bs * scale, life: 0.75 + i * 0.1, color: colors[i % colors.length], w: width, alpha: 0.9,
      }))
    })
    for (let i = 0; i < sparks * a.k + 8; i += 1) {
      const ang = rand(0, TAU)
      const v = rand(0.4, 1) * power * a.s
      s.add('spark', {
        x: a.bx + Math.cos(ang) * a.bs * rand(0.5, 0.62), y: a.by + Math.sin(ang) * a.bs * rand(0.5, 0.62),
        vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, g: 300, drag: 0.958, life: rand(0.6, 1.1), w: rand(1, 1.6), tail: 0.04,
        color: split ? pick(Math.cos(ang) < 0 ? GOLD : LAVENDER) : pick(colors), crackle: Math.random() < 0.3,
      })
    }
  })
}

// 聚字：粒子从 start(p) 给的位置沿弧线飞向标题笔画，左边的字先到；最后一颗到位后标题整张显形
// （显形时刻 = from + spread + jitter + 最长飞行时间，MilestoneCeremony 的 TEXT_DONE 要和它对上）
function assembleTitle(scene, a, { start, from, spread, jitter, dur, colors, foil = false, sweeps = [] }) {
  const t = a.title
  if (!t) return
  const fadeAt = from + spread + jitter + dur[1] + 0.05
  t.points.forEach(([tx, ty]) => {
    const [sx, sy] = start(tx, ty)
    const lift = rand(30, 140) * a.s
    scene.add('assemble', {
      sx, sy, tx, ty, cx: (sx + tx) / 2 + rand(-70, 70) * a.s, cy: Math.min(sy, ty) - lift, tail: rand(0.015, 0.03),
      t0: from + ((tx - t.x) / t.w) * spread + rand(0, jitter), dur: rand(dur[0], dur[1]),
      color: pick(colors), r: rand(0.9, 1.6) * Math.max(a.s, 0.7), fadeAt, life: fadeAt + 0.6,
    })
  })
  const fxCtx = t.fx.getContext('2d')
  scene.add('title', { image: t.image, mask: t.mask, fx: t.fx, fxCtx, x: t.x, y: t.y, w: t.w, h: t.h, t0: fadeAt - 0.1, foil, sweeps, life: 60 })
}

// 烟花：从窄带底部升空，在上方两角炸开
function firework(scene, a, { at, side, colors, willow = false }) {
  scene.at(at, (s) => {
    const x = bandX(a, side) + (side === 'L' ? 0.06 : -0.06) * a.w
    const top = rand(0.1, 0.24) * a.h
    const y = a.h * 0.72
    s.add('rocket', { x, y, vx: rand(-20, 20), vy: -Math.sqrt(2 * 560 * (y - top) + 70 * 70), g: 560, life: 5, count: Math.round(140 * a.k + 40), power: rand(380, 480) * a.s, colors, willow })
  })
}

export const SCENES = {
  // 四位数俱乐部：银色细粉从徽章往上冒 + 两侧星芒
  silver(scene, a) {
    landing(scene, a, { colors: SILVER, sparks: 30 })
    scene.emit(0.2, 3, 34 * a.k, (s) => s.add('dust', {
      x: a.bx + rand(-0.9, 0.9) * a.bs, y: a.by + rand(-0.2, 0.6) * a.bs, vx: rand(-8, 8), vy: -rand(25, 70) * a.s,
      r: rand(0.5, 1.4) * a.s, color: pick(SILVER), life: rand(1.6, 2.6), tw: rand(5, 11), ph: rand(0, TAU), glint: Math.random() < 0.3, alpha: 0.95,
    }))
    bandDust(scene, a, { colors: SILVER, from: 0.1, to: 3, rate: 26, glint: 0.35 })
  },

  // 满池达成：两个下角喷出彩纸（正反两色、3D 翻面），之后两侧持续飘落
  confetti(scene, a) {
    landing(scene, a, { colors: ['#7ff0b8', '#ffffff'], sparks: 24 })
    const piece = (x, y, vx, vy) => {
      const [color, back] = pick(CONFETTI)
      return { x, y, vx, vy, color, back, w: rand(5, 8) * a.s, h: rand(9, 14) * a.s, rot: rand(0, TAU), vr: rand(-5, 5), flip: rand(0, TAU), vf: rand(6, 13), swa: rand(80, 160), swf: rand(3, 6), term: rand(80, 140) * a.s, life: rand(3, 4.2) }
    }
    scene.at(0.12, (s) => {
      for (let i = 0; i < 70 * a.k + 20; i += 1) {
        s.add('confetti', piece(rand(0, 0.03) * a.w, a.h + 10, rand(30, 230), -a.h * rand(1.2, 1.75)))
        s.add('confetti', piece(a.w - rand(0, 0.03) * a.w, a.h + 10, -rand(30, 230), -a.h * rand(1.2, 1.75)))
      }
    })
    scene.emit(0.5, 2.6, 22 * a.k, (s) => s.add('confetti', piece(bandX(a), -20, rand(-20, 20), rand(40, 90))))
  },

  // 旗舰显卡：两侧 RGB 光流往上冲，颜色随时间循环
  rgb(scene, a) {
    scene.at(a.land, (s) => {
      for (let i = 0; i < 40 * a.k + 10; i += 1) {
        const ang = rand(0, TAU)
        const v = rand(120, 320) * a.s
        s.add('spark', { x: a.bx, y: a.by, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, g: 200, drag: 0.93, life: rand(0.5, 0.9), w: 1.4, tail: 0.04, hue: rand(0, 360) })
      }
      s.add('ring', { x: a.bx, y: a.by, r0: a.bs * 0.5, r1: a.bs * 1.8, life: 0.8, color: '#3dd6ff', w: 1.4, alpha: 0.9 })
    })
    scene.emit(0.15, 3.1, 72 * a.k, (s) => s.add('spark', {
      x: bandX(a), y: a.h + 10, vx: 0, vy: -rand(420, 780) * a.s, g: 0, drag: 1, life: rand(0.9, 1.6), w: rand(1.2, 2.2), tail: rand(0.08, 0.16), hue: rand(0, 360),
    }))
  },

  // 十万（系统强制干预）：徽章像短路一样接连迸出琥珀色火花，往下掉
  alarm(scene, a) {
    const ALARM = ['#ffd166', '#ff9f43', '#ff4d6d', '#fff1c9']
    ;[0.15, 0.55, 0.95, 1.7].forEach((at, n) => scene.at(at, (s) => {
      const side = n % 2 ? 1 : -1
      for (let i = 0; i < 26 * a.k + 8; i += 1) {
        s.add('spark', {
          x: a.bx + side * a.bs * rand(0.3, 0.5), y: a.by + rand(-0.4, 0.2) * a.bs, vx: side * rand(40, 300) * a.s, vy: -rand(80, 380) * a.s,
          g: 950, drag: 0.985, life: rand(0.6, 1.1), w: rand(0.9, 1.4), tail: 0.03, color: pick(ALARM), crackle: true,
        })
      }
    }))
    bandDust(scene, a, { colors: ALARM, from: 0.1, to: 3, rate: 22, glint: 0.1 })
  },

  // 伪神：徽章裂开 → 玻璃碎片带棱光翻滚崩落、青粉色差火花、两侧信号错位条
  fake(scene, a) {
    landing(scene, a, { colors: ['#ff7ad9', '#4fe3ff'], sparks: 26, rings: [[1.5, 1.4], [1.7, 1]] })
    const shatter = (count, power) => (s) => {
      for (let i = 0; i < count; i += 1) {
        const size = rand(5, 13) * (a.bs / 110)
        const pts = [0, 1, 2].flatMap((j) => {
          const ang = (j / 3) * TAU + rand(-0.5, 0.5)
          return [Math.cos(ang) * size * rand(0.6, 1.3), Math.sin(ang) * size * rand(0.6, 1.3)]
        })
        const dir = Math.random() < 0.5 ? -1 : 1
        s.add('shard', {
          x: a.bx + rand(-0.12, 0.12) * a.bs, y: a.by + rand(-0.45, 0.45) * a.bs, vx: dir * rand(60, 260) * power * a.s, vy: -rand(60, 320) * power * a.s,
          g: 900, rot: rand(0, TAU), vr: rand(-9, 9), flip: rand(0, TAU), vf: rand(4, 11), pts, life: rand(1.2, 1.9),
          fill: pick(['rgba(79,227,255,0.55)', 'rgba(255,122,217,0.55)', 'rgba(255,255,255,0.45)']),
        })
      }
    }
    scene.at(0.82, shatter(Math.round(34 * a.k + 12), 1.15))
    scene.at(0.82, (s) => {
      for (let i = 0; i < 40 * a.k + 10; i += 1) {
        const ang = rand(-Math.PI, 0)
        const v = rand(140, 360) * a.s
        s.add('spark', { x: a.bx, y: a.by, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, g: 420, drag: 0.95, life: rand(0.5, 1), w: 1.2, tail: 0.04, color: pick(GLITCH) })
      }
      s.add('ring', { x: a.bx - 2, y: a.by, r0: a.bs * 0.45, r1: a.bs * 1.8, life: 0.7, color: '#4fe3ff', w: 1.2, alpha: 0.8 })
      s.add('ring', { x: a.bx + 2, y: a.by, r0: a.bs * 0.45, r1: a.bs * 1.8, life: 0.7, color: '#ff7ad9', w: 1.2, alpha: 0.8 })
    })
    scene.at(2.1, shatter(8, 0.55))
    scene.emit(0.3, 4, 12, (s) => {
      const near = Math.random() < 0.35
      s.add('blip', {
        x: near ? a.bx + rand(-1.4, 1) * a.bs : bandX(a), y: near ? a.by + rand(-1, 0.6) * a.bs : rand(0.1, 0.95) * a.h,
        w: rand(10, 70) * a.s, h: Math.random() < 0.7 ? 1 : 2, color: pick(GLITCH), life: rand(0.06, 0.2),
      })
    })
    bandDust(scene, a, { colors: GLITCH, from: 0.1, to: 4, rate: 28, glint: 0.2 })
  },

  // 半神：左金右紫两道细粉光柱升腾、落定时金紫分色的火花、粒子从左下就近聚成标题
  demi(scene, a) {
    landing(scene, a, { colors: ['#ffd86b', '#b9a8e6'], sparks: 50, rings: [[1.6, 1.5], [1.8, 1]], split: true, power: 340 })
    bandDust(scene, a, { colors: GOLD, from: 0.1, to: 4.9, rate: 86, split: true, glint: 0.22 })
    scene.emit(0.2, 4.6, 34 * a.k, (s) => {
      const side = Math.random() < 0.5 ? 'L' : 'R'
      s.add('spark', {
        x: bandX(a, side), y: a.h + 10, vx: 0, vy: -rand(220, 460) * a.s, g: 0, drag: 1, life: rand(1.4, 2.6),
        w: rand(0.8, 1.4), tail: rand(0.06, 0.12), color: pick(side === 'L' ? GOLD : LAVENDER),
      })
    })
    scene.emit(0.3, 4.7, 9 * a.k, (s) => {
      const side = Math.random() < 0.5 ? 'L' : 'R'
      s.add('dust', { x: bandX(a, side), y: a.h + 4, vx: 0, vy: -rand(40, 80) * a.s, r: rand(1.5, 2.3) * a.s, color: side === 'L' ? '#ffe9a8' : '#ddd2ff', life: rand(3, 4.5), tw: rand(2, 4), ph: rand(0, TAU), alpha: 0.8 })
    })
    assembleTitle(scene, a, {
      start: (tx, ty) => [tx - rand(40, 180) * a.s, ty + rand(-40, 140) * a.s],
      from: 0.45, spread: 0.35, jitter: 0.25, dur: [0.6, 0.85], colors: ['#ffffff', '#ffe9a8', '#ddd2ff'],
    })
  },

  // 王：金粉如雪、两侧金币雨、徽章砸下时三道冲击波、上方两角六发烟花、上千金色粒子从两侧弧线飞来聚成标题 + 金箔扫光
  king(scene, a) {
    bandDust(scene, a, { colors: GOLD, from: 0, to: 6.4, rate: 110, rise: false, glint: 0.35 })
    scene.emit(0.7, 5.8, 11 * a.k + 2, (s) => s.add('coin', {
      x: bandX(a), y: -30, vx: rand(-12, 12), vy: rand(60, 160), vmax: rand(320, 520) * a.s, r: rand(7, 13) * Math.max(a.s, 0.7),
      spin: rand(0, TAU), vs: rand(5, 13) * (Math.random() < 0.5 ? -1 : 1), tilt: rand(-0.4, 0.4), life: 6,
    }))
    landing(scene, a, { colors: ['#ffd86b', '#ffffff', '#ffc23d'], sparks: 90, rings: [[1.6, 2], [1.4, 1.2], [1.8, 1]], power: 420 })
    assembleTitle(scene, a, {
      start: (tx) => (Math.random() < 0.5 ? [-10, rand(0.68, 1) * a.h] : [rand(-0.3, 1.2) * tx, a.h + 10]),
      from: 0.75, spread: 0.45, jitter: 0.35, dur: [0.85, 1.2], colors: GOLD, foil: true, sweeps: [3, 4.9],
    })
    if (a.title) {
      scene.emit(2.9, 6.6, 9, (s) => {
        const [x, y] = pick(a.title.points)
        s.add('dust', { x, y, r: rand(0.7, 1.3) * a.s, color: pick(['#ffffff', '#fff3c4']), life: rand(0.5, 0.9), tw: rand(8, 12), ph: -Math.PI / 2, glint: true })
      })
    }
    const PALE = ['#fff3c4', '#ffffff', '#ffd86b']
    const ROSE = ['#ffd86b', '#ff9fd0', '#ffffff']
    // 升空约 0.9s，炸开时刻约为 at + 0.9
    firework(scene, a, { at: 0.5, side: 'R', colors: GOLD })
    firework(scene, a, { at: 1.1, side: 'L', colors: PALE })
    firework(scene, a, { at: 1.8, side: 'R', colors: ROSE })
    firework(scene, a, { at: 2.4, side: 'L', colors: GOLD })
    firework(scene, a, { at: 3.2, side: 'R', colors: PALE, willow: true })
    firework(scene, a, { at: 3.7, side: 'L', colors: GOLD, willow: true })
    firework(scene, a, { at: 4.5, side: 'R', colors: ROSE })
    // 「王座已就位」那一下：再一道大冲击波 + 徽章周围一圈闪粉
    scene.at(3.95, (s) => {
      s.add('ring', { x: a.bx, y: a.by, r0: a.bs * 0.55, r1: a.bs * 1.7, life: 1, color: '#ffd86b', w: 1.6, alpha: 0.9 })
      for (let i = 0; i < 40; i += 1) {
        const ang = rand(0, TAU)
        const d = a.bs * rand(0.6, 1.2)
        s.add('dust', { x: a.bx + Math.cos(ang) * d, y: a.by + Math.sin(ang) * d, vx: Math.cos(ang) * 20, vy: Math.sin(ang) * 20 - 15, r: rand(0.6, 1.4) * a.s, color: pick(GOLD), life: rand(1, 1.8), tw: rand(10, 16), ph: rand(0, TAU), glint: true })
      }
    })
  },
}
