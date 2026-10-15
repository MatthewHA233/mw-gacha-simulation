/**
 * 里程碑仪式的 Canvas 粒子引擎（MilestoneCeremony 用）。
 *
 * 每种粒子 = 一个 kind：update 推进物理、draw 画一帧。分两层画：solid（金币 / 彩纸 / 碎片 / 标题，正常叠加）
 * 和 light（火花 / 金粉 / 冲击波 / 聚字粒子，lighter 叠加出发光感，但都是清晰的线和点，不靠模糊）。
 * 每帧要动上千个粒子，这里刻意原地改粒子对象（不走不可变拷贝），否则 GC 抖动会掉帧。
 * 坐标都是 CSS 像素，时间单位是秒。
 */

export const TAU = Math.PI * 2
export const rand = (min, max) => min + Math.random() * (max - min)
export const pick = (list) => list[Math.floor(Math.random() * list.length)]
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const easeOutCubic = (p) => 1 - (1 - p) ** 3
export const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2)

// 生命周期包络：前 a 段淡入、后 b 段淡出
const envelope = (p, a = 0.12, b = 0.35) => (p < a ? p / a : p > 1 - b ? Math.max(0, (1 - p) / b) : 1)

const mixHex = (a, b, t) => {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (shift) => Math.round(((pa >> shift) & 255) + (((pb >> shift) & 255) - ((pa >> shift) & 255)) * t)
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`
}

const KINDS = {
  // 细粉：慢慢飘，正弦闪烁；glint 的在闪到最亮时出一个十字星芒
  dust: {
    layer: 'light',
    update(p, dt) {
      p.ph += dt * p.tw
      p.vx += Math.sin(p.ph * 0.6 + p.seed) * p.wander * dt
      p.vy += p.g * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
    },
    draw(ctx, p) {
      const s = Math.sin(p.ph)
      const a = envelope(p.age / p.life) * (0.5 + 0.5 * s) * p.alpha
      if (a < 0.02) return
      ctx.globalAlpha = a
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, TAU)
      ctx.fill()
      if (p.glint && s > 0.86) {
        const len = p.r * 7 * (s - 0.86) / 0.14
        ctx.strokeStyle = p.color
        ctx.lineWidth = 0.7
        ctx.beginPath()
        ctx.moveTo(p.x - len, p.y); ctx.lineTo(p.x + len, p.y)
        ctx.moveTo(p.x, p.y - len); ctx.lineTo(p.x, p.y + len)
        ctx.stroke()
      }
    },
  },

  // 火花：速度 + 重力 + 空气阻力，按速度方向拖一条尾巴；crackle 的在末段噼啪闪烁；hue 的按时间循环变色（显卡 RGB）
  spark: {
    layer: 'light',
    update(p, dt) {
      const k = p.drag ** (dt * 60)
      p.vx *= k
      p.vy = p.vy * k + p.g * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
    },
    draw(ctx, p, t) {
      const q = p.age / p.life
      let a = (1 - q) ** 1.3
      if (p.crackle && q > 0.55) a *= Math.random() < 0.55 ? 1 : 0.1
      if (a < 0.02) return
      ctx.globalAlpha = a
      ctx.strokeStyle = p.hue == null ? p.color : `hsl(${(p.hue + t * 160) % 360} 100% 66%)`
      ctx.lineWidth = p.w
      ctx.beginPath()
      ctx.moveTo(p.x - p.vx * p.tail, p.y - p.vy * p.tail)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
    },
  },

  // 烟花弹：往上飞、沿途掉火星，速度降下来就炸（炸开由 scene.burst 处理）
  rocket: {
    layer: 'light',
    update(p, dt, scene) {
      p.vy += p.g * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (Math.random() < 0.9) {
        scene.add('spark', { x: p.x, y: p.y, vx: rand(-18, 18), vy: rand(20, 70), g: 140, drag: 0.94, life: rand(0.25, 0.5), color: '#ffe6a8', w: 1, tail: 0.025 })
      }
      if (p.vy > -70) {
        p.dead = true
        scene.burst(p)
      }
    },
    draw(ctx, p) {
      ctx.globalAlpha = 1
      ctx.fillStyle = '#fff6da'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 1.8, 0, TAU)
      ctx.fill()
    },
  },

  // 冲击波：一圈清晰的细线往外扩，越扩越细越淡
  ring: {
    layer: 'light',
    keep: true,
    draw(ctx, p) {
      const q = p.age / p.life
      const e = easeOutCubic(q)
      ctx.globalAlpha = (1 - q) ** 1.6 * p.alpha
      ctx.strokeStyle = p.color
      ctx.lineWidth = p.w * (1 - q) + 0.4
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * e, 0, TAU)
      ctx.stroke()
    },
  },

  // 玻璃碎片：三角形，带 3D 翻滚（纵向按 cos 压扁），白色描边当棱光
  shard: {
    layer: 'solid',
    update(p, dt) {
      p.vy += p.g * dt
      p.vx *= 0.992
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
      p.flip += p.vf * dt
    },
    draw(ctx, p) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.scale(1, Math.cos(p.flip))
      ctx.globalAlpha = envelope(p.age / p.life, 0.02, 0.4)
      ctx.beginPath()
      ctx.moveTo(p.pts[0], p.pts[1]); ctx.lineTo(p.pts[2], p.pts[3]); ctx.lineTo(p.pts[4], p.pts[5])
      ctx.closePath()
      ctx.fillStyle = p.fill
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'
      ctx.lineWidth = 0.9
      ctx.stroke()
      ctx.restore()
    },
  },

  // 金币：立体翻转（宽度按 cos 压缩 + 侧边厚度 + 正反面明暗）、正面有内圈和 ¥、顶上一道高光
  coin: {
    layer: 'solid',
    update(p, dt) {
      p.vy = Math.min(p.vy + 900 * dt, p.vmax)
      p.vx += Math.sin(p.age * 2.2 + p.seed) * 10 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.spin += p.vs * dt
    },
    draw(ctx, p) {
      const c = Math.cos(p.spin)
      const sx = Math.max(Math.abs(c), 0.06)
      const r = p.r
      const edge = r * 0.17 * Math.sin(p.spin)
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.tilt)
      ctx.globalAlpha = envelope(p.age / p.life, 0.04, 0.15)
      // 侧边厚度
      ctx.fillStyle = '#9a6a0c'
      ctx.beginPath()
      ctx.ellipse(edge, 0, sx * r, r, 0, 0, TAU)
      ctx.fill()
      ctx.fillRect(Math.min(0, edge), -r, Math.abs(edge), r * 2)
      // 正面 / 背面：朝向光源越正越亮
      const light = c > 0 ? 0.45 + 0.55 * c : 0.25 + 0.35 * sx
      ctx.fillStyle = mixHex('#b9821a', '#ffe7a0', light)
      ctx.beginPath()
      ctx.ellipse(0, 0, sx * r, r, 0, 0, TAU)
      ctx.fill()
      if (sx > 0.3) {
        ctx.strokeStyle = 'rgba(120,76,6,0.8)'
        ctx.lineWidth = Math.max(0.6, r * 0.09)
        ctx.beginPath()
        ctx.ellipse(0, 0, sx * r * 0.72, r * 0.72, 0, 0, TAU)
        ctx.stroke()
        ctx.scale(sx, 1)
        ctx.fillStyle = 'rgba(120,76,6,0.9)'
        ctx.font = `800 ${r * 1.05}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('¥', 0, r * 0.06)
        ctx.scale(1 / sx, 1)
      }
      ctx.strokeStyle = 'rgba(255,251,230,0.9)'
      ctx.lineWidth = Math.max(0.7, r * 0.1)
      ctx.beginPath()
      ctx.ellipse(0, 0, sx * r * 0.86, r * 0.86, 0, -2.5, -1.4)
      ctx.stroke()
      ctx.restore()
    },
  },

  // 纸屑：矩形纸片，3D 翻面（正反两色）、左右飘摆、慢慢落
  confetti: {
    layer: 'solid',
    update(p, dt) {
      p.vx += Math.sin(p.age * p.swf + p.seed) * p.swa * dt
      p.vx *= 0.975 ** (dt * 60)
      p.vy += (p.term - p.vy) * Math.min(1, dt * 2.4)
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
      p.flip += p.vf * dt
    },
    draw(ctx, p) {
      const f = Math.cos(p.flip)
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.scale(1, f)
      ctx.globalAlpha = envelope(p.age / p.life, 0.03, 0.2)
      ctx.fillStyle = f > 0 ? p.color : p.back
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    },
  },

  // 数据错位条：一闪而过的水平细线（伪神的「信号不稳」）
  blip: {
    layer: 'light',
    draw(ctx, p) {
      if (Math.random() < 0.35) return
      ctx.globalAlpha = 0.85 * (1 - p.age / p.life)
      ctx.fillStyle = p.color
      ctx.fillRect(p.x, p.y, p.w, p.h)
    },
  },

  // 聚字粒子：沿二次贝塞尔从起点飞到标题笔画上的目标点，带一小段拖尾；到位后随标题显形淡出
  // 上千颗，Scene.draw 里走 drawAssembleBatch 批量画；这个单颗版本留作参考 / 调试
  assemble: {
    layer: 'light',
    keep: true,
    batch: true,
    draw(ctx, p, t) {
      const q = clamp01((t - p.t0) / p.dur)
      if (q <= 0) return
      const at = (e) => {
        const u = 1 - e
        return [u * u * p.sx + 2 * u * e * p.cx + e * e * p.tx, u * u * p.sy + 2 * u * e * p.cy + e * e * p.ty]
      }
      const [x, y] = at(easeInOutCubic(q))
      const [x2, y2] = at(easeInOutCubic(clamp01(q - p.tail)))
      let a = q < 1 ? 0.75 : 0.7 + 0.3 * Math.sin(t * 9 + p.seed)
      if (t > p.fadeAt) a *= 1 - clamp01((t - p.fadeAt) / 0.45)
      if (a < 0.02) return
      // 飞行中：一根很细的淡尾巴 + 亮点头；到位后只剩亮点闪烁
      if (q < 1) {
        ctx.globalAlpha = a * 0.45
        ctx.strokeStyle = p.color
        ctx.lineWidth = p.r * 0.55
        ctx.beginPath()
        ctx.moveTo(x2, y2)
        ctx.lineTo(x, y)
        ctx.stroke()
      }
      ctx.globalAlpha = a
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(x, y, p.r * 0.75, 0, TAU)
      ctx.fill()
    },
  },

  // 画布上的标题：聚字完成后显形；foil 的再来几道金箔扫光（只扫在字形内）
  title: {
    layer: 'solid',
    keep: true,
    draw(ctx, p, t) {
      const q = clamp01((t - p.t0) / 0.45)
      if (q <= 0) return
      ctx.globalAlpha = q
      ctx.drawImage(p.image, p.x, p.y, p.w, p.h)
      if (!p.foil) return
      const s = p.sweeps.map((at) => (t - at) / 1.1).find((v) => v > 0 && v < 1)
      if (s == null) return
      const fx = p.fxCtx
      const W = p.fx.width
      const H = p.fx.height
      fx.globalCompositeOperation = 'source-over'
      fx.clearRect(0, 0, W, H)
      fx.drawImage(p.mask, 0, 0)
      fx.globalCompositeOperation = 'source-in'
      const bx = -0.25 * W + easeInOutCubic(s) * 1.5 * W
      const grad = fx.createLinearGradient(bx - H * 0.6, 0, bx + H * 0.6, H)
      grad.addColorStop(0, 'rgba(255,255,255,0)')
      grad.addColorStop(0.5, 'rgba(255,255,255,0.95)')
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      fx.fillStyle = grad
      fx.fillRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'
      ctx.drawImage(p.fx, p.x, p.y, p.w, p.h)
      ctx.globalCompositeOperation = 'source-over'
    },
  },
}

// 聚字粒子批量画：同色的尾巴并成一条路径一次描完，头部用 fillRect；整体透明度按统一的淡出时刻算
function drawAssembleBatch(ctx, list, t) {
  if (!list.length) return
  const fade = 1 - clamp01((t - list[0].fadeAt) / 0.45)
  if (fade <= 0) return
  const groups = new Map()
  list.forEach((p) => {
    const q = clamp01((t - p.t0) / p.dur)
    if (q <= 0) return
    const e = easeInOutCubic(q)
    const u = 1 - e
    const x = u * u * p.sx + 2 * u * e * p.cx + e * e * p.tx
    const y = u * u * p.sy + 2 * u * e * p.cy + e * e * p.ty
    let g = groups.get(p.color)
    if (!g) {
      g = { tails: [], heads: [] }
      groups.set(p.color, g)
    }
    if (q < 1) {
      const e2 = easeInOutCubic(clamp01(q - p.tail))
      const u2 = 1 - e2
      g.tails.push(u2 * u2 * p.sx + 2 * u2 * e2 * p.cx + e2 * e2 * p.tx, u2 * u2 * p.sy + 2 * u2 * e2 * p.cy + e2 * e2 * p.ty, x, y)
    }
    g.heads.push(x, y, p.r * 0.75)
  })
  groups.forEach((g, color) => {
    ctx.strokeStyle = color
    ctx.fillStyle = color
    if (g.tails.length) {
      ctx.globalAlpha = 0.34 * fade
      ctx.lineWidth = 0.8
      ctx.beginPath()
      for (let i = 0; i < g.tails.length; i += 4) {
        ctx.moveTo(g.tails[i], g.tails[i + 1])
        ctx.lineTo(g.tails[i + 2], g.tails[i + 3])
      }
      ctx.stroke()
    }
    ctx.globalAlpha = 0.8 * fade
    for (let i = 0; i < g.heads.length; i += 3) {
      const r = g.heads[i + 2]
      ctx.fillRect(g.heads[i] - r, g.heads[i + 1] - r, r * 2, r * 2)
    }
  })
}

const DEFAULTS = {
  dust: { vx: 0, vy: 0, g: 0, r: 1, alpha: 1, tw: 6, ph: 0, wander: 0, seed: 0, glint: false, color: '#fff' },
  spark: { g: 0, drag: 1, w: 1.2, tail: 0.04, color: '#fff', hue: null, crackle: false },
}

/** 一场仪式的粒子场景：add 加粒子、at 定时事件、emit 持续发射、burst 烟花炸开 */
export class Scene {
  constructor(width, height) {
    this.w = width
    this.h = height
    this.t = 0
    this.items = []
    this.spawned = []
    this.events = []
    this.emitters = []
  }

  add(kind, props) {
    this.spawned.push({ ...DEFAULTS[kind], ...props, kind, age: 0, life: props.life ?? 1, seed: props.seed ?? Math.random() * 100 })
  }

  at(time, fn) {
    this.events.push({ time, fn, done: false })
  }

  emit(from, to, rate, spawn) {
    this.emitters.push({ from, to, rate, spawn, acc: 0 })
  }

  // 烟花炸开：一圈火花（带噼啪）+ 一圈慢落的金粉 + 一道小冲击波
  burst(p) {
    const n = p.count
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * TAU + rand(-0.05, 0.05)
      const v = p.power * rand(0.45, 1)
      const d = rand(2, 7)
      this.add('spark', {
        x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: p.willow ? 90 : 150, drag: p.willow ? 0.972 : 0.962,
        life: rand(0.9, 1.5) * (p.willow ? 1.6 : 1), color: pick(p.colors), w: rand(1, 1.6), tail: p.willow ? 0.07 : 0.045, crackle: Math.random() < 0.35,
      })
    }
    for (let i = 0; i < n * 0.5; i += 1) {
      const a = rand(0, TAU)
      const v = p.power * rand(0.1, 0.5)
      this.add('dust', { x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 40, r: rand(0.6, 1.3), color: pick(p.colors), life: rand(1.2, 2), tw: rand(10, 18), glint: Math.random() < 0.3 })
    }
  }

  step(dt) {
    this.t += dt
    this.events.forEach((e) => {
      if (!e.done && this.t >= e.time) {
        e.done = true
        e.fn(this)
      }
    })
    this.emitters.forEach((em) => {
      if (this.t < em.from || this.t > em.to) return
      em.acc += em.rate * dt
      while (em.acc >= 1) {
        em.acc -= 1
        em.spawn(this)
      }
    })
    const { w, h } = this
    const alive = []
    this.items.forEach((p) => {
      p.age += dt
      KINDS[p.kind].update?.(p, dt, this)
      const inside = KINDS[p.kind].keep || (p.x > -120 && p.x < w + 120 && p.y > -160 && p.y < h + 120)
      if (!p.dead && p.age < p.life && inside) alive.push(p)
    })
    this.items = alive.concat(this.spawned)
    this.spawned = []
  }

  draw(ctx) {
    ctx.lineCap = 'round'
    this.items.forEach((p) => KINDS[p.kind].layer === 'solid' && KINDS[p.kind].draw(ctx, p, this.t))
    ctx.globalCompositeOperation = 'lighter'
    const batch = []
    this.items.forEach((p) => {
      const kind = KINDS[p.kind]
      if (kind.batch) batch.push(p)
      else if (kind.layer === 'light') kind.draw(ctx, p, this.t)
    })
    drawAssembleBatch(ctx, batch, this.t)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  }

  get idle() {
    return this.items.length === 0 && this.spawned.length === 0 && this.emitters.every((em) => this.t > em.to) && this.events.every((e) => e.done)
  }
}
