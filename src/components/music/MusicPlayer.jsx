'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { PLAY_MODES, useMusic } from './MusicProvider'
import { trackCover } from './tracks'
import { useSound } from '../../hooks/useSound'

/**
 * 左下角的背景音乐播放器（2026-10-15）：唱片 = 播放/暂停，曲名一直显示（暂停时也显示），
 * 点曲名展开歌单，右边是下一首。状态都在根布局的 MusicProvider，换页面不中断。
 */

// 图片唱片：封面铺满、跟着转；纹路叠在封面上一起转，反光固定不动（光源不跟着唱片转才像真的）
const GROOVES = 'repeating-radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0 1.4px, rgba(0,0,0,0.08) 1.4px 2px)'
const SHEEN = 'conic-gradient(from 200deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0.22) 25deg, rgba(255,255,255,0) 60deg, rgba(255,255,255,0) 180deg, rgba(255,255,255,0.14) 205deg, rgba(255,255,255,0) 240deg)'

function Disc({ track, isPlaying, isLoading, onClick }) {
  const spinning = isPlaying && !isLoading
  return (
    <button
      onClick={onClick}
      aria-label={isPlaying ? '暂停背景音乐' : '播放背景音乐'}
      className="relative shrink-0 w-11 h-11 md:w-14 md:h-14 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
    >
      <span
        className="absolute inset-0 rounded-full overflow-hidden bg-[#17151d]"
        style={{ animation: 'spin 9s linear infinite', animationPlayState: spinning ? 'running' : 'paused' }}
      >
        <img src={trackCover(track)} alt="" draggable={false} className="w-full h-full object-cover select-none" />
        <span className="absolute inset-0" style={{ background: GROOVES }} />
      </span>
      <span className="absolute inset-0 rounded-full pointer-events-none" style={{ background: SHEEN }} />
      {/* 唱片外缘 */}
      <span className="absolute inset-0 rounded-full pointer-events-none ring-2 ring-black/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]" />
      {/* 暂停时整张轻轻压暗 */}
      <span className={`absolute inset-0 rounded-full bg-black/10 pointer-events-none transition-opacity duration-300 ${isPlaying ? 'opacity-0' : 'opacity-100'}`} />
      {/* 中间的标签圆：播放、暂停是同一个圆（大小、描边不变），里面播放时是轴孔、暂停时换成播放三角 */}
      <span className="absolute left-1/2 top-1/2 w-[34%] h-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0d0b12]/85 ring-1 ring-white/30 pointer-events-none">
        <span className={`absolute inset-[34%] rounded-full bg-black ring-1 ring-white/25 transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0'}`} />
        <svg
          className={`absolute inset-[27%] text-white/90 translate-x-[8%] transition-opacity duration-300 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}
          viewBox="0 0 24 24" fill="currentColor"
        >
          <path d="M7 4.5v15l12.5-7.5z" />
        </svg>
      </span>
      {isLoading && (
        <span className="absolute -inset-[3px] rounded-full border-2 border-transparent border-t-[#b9a8e6] animate-spin pointer-events-none" />
      )}
    </button>
  )
}

// 播放器的视觉语言：淡丁香色的细线 + 一截亮色线头。频率线是三根起伏的竖线、顶端亮头；
// 进度条是已播放的实线接未播放的发丝线、接头处一根亮色细针。都是完整线条，不用渐变、不用色块。
const LINE = '#b9a8e6'
const TIP = '#ece7f8'

// 播放状态只用这三根频率线表达，不写「正在播放 / 已暂停」：
// 播放时平滑起伏（动画在 src/index.css 的 .bgm-eq-bar，三根节奏错开）；暂停时停在不同高度并变淡；加载时整体慢慢呼吸。
const EQ_BARS = [[0.9, 0, 0.45], [0.7, 0.3, 0.8], [1.1, 0.15, 0.6]]   // 动画时长、错开、静止时的高度

function EqBars({ state, className = 'h-[11px] md:h-[14px]' }) {
  const playing = state === 'playing'
  return (
    <span
      className={`flex items-end gap-[2px] shrink-0 ${playing ? '' : 'opacity-75'} ${state === 'loading' ? 'animate-pulse' : ''} ${className}`}
      aria-hidden="true"
    >
      {EQ_BARS.map(([duration, delay, rest]) => (
        <span
          key={duration}
          className={`w-[2px] box-border border-t ${playing ? 'bgm-eq-bar' : ''}`}
          style={{
            background: LINE,
            borderTopColor: TIP,
            ...(playing
              ? { animationDuration: `${duration}s`, animationDelay: `-${delay}s` }
              : { height: `${rest * 100}%` }),
          }}
        />
      ))}
    </span>
  )
}

// 播放模式图标：单曲循环（循环箭头 + 1）/ 列表循环 / 随机播放
function ModeIcon({ mode, className }) {
  const common = { className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (mode === 'shuffle') {
    return (
      <svg {...common}>
        <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" /><path d="m18 2 4 4-4 4" />
        <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" /><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" /><path d="m18 14 4 4-4 4" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" />
      {mode === 'one' && <path d="M11 10h1v4" />}
    </svg>
  )
}

const modeLabel = (mode) => PLAY_MODES.find((item) => item.id === mode)?.label || ''

// 曲名宽度固定（胶囊不随曲名变宽变窄）；放不下时来回滚：先停一会，慢慢滚到最右，停一会，再滚回最左，循环。
// 用 Web Animations 按实际超出的像素现算时长，短的超一点就滚得短、长的滚得久，速度一致。
const MARQUEE_SPEED = 28      // 像素 / 秒
const MARQUEE_PAUSE = 1800    // 两端各停多久（毫秒）

function MarqueeTitle({ text, className }) {
  const boxRef = useRef(null)
  const textRef = useRef(null)

  useEffect(() => {
    const box = boxRef.current
    const inner = textRef.current
    if (!box || !inner || typeof inner.animate !== 'function') return undefined
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let animation = null
    let disposed = false

    const start = () => {
      if (disposed) return
      animation?.cancel()
      animation = null
      const distance = inner.scrollWidth - box.clientWidth
      if (distance <= 1 || reduceMotion) return
      const travel = Math.max(1200, (distance / MARQUEE_SPEED) * 1000)
      const total = MARQUEE_PAUSE * 2 + travel * 2
      const at = (ms) => ms / total
      const left = 'translateX(0)'
      const right = `translateX(-${distance}px)`
      animation = inner.animate([
        { transform: left, offset: 0 },
        { transform: left, offset: at(MARQUEE_PAUSE), easing: 'ease-in-out' },
        { transform: right, offset: at(MARQUEE_PAUSE + travel) },
        { transform: right, offset: at(MARQUEE_PAUSE * 2 + travel), easing: 'ease-in-out' },
        { transform: left, offset: 1 },
      ], { duration: total, iterations: Infinity })
    }

    start()
    // 字体晚到、窗口缩放（手机 / 电脑断点切换字号）都会改变超出量，重算
    document.fonts?.ready.then(start)
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(start) : null
    observer?.observe(box)
    return () => {
      disposed = true
      observer?.disconnect()
      animation?.cancel()
    }
  }, [text])

  return (
    <span ref={boxRef} className={`block shrink-0 overflow-hidden whitespace-nowrap ${className}`}>
      <span ref={textRef} className="inline-block will-change-transform">{text}</span>
    </span>
  )
}

// 曲名下面那根进度条：已播放是 2px 实线，未播放是 1px 发丝线，接头处一根亮色细针。
// 直接订阅 <audio> 的事件、只刷新自己，不让整个播放器跟着每秒重渲染。
// 点击 / 拖动区域上下各留几像素；宽度跟着曲名那块走，不把胶囊撑宽。

function ProgressBar({ audioRef, onSeek }) {
  const [fraction, setFraction] = useState(0)
  const [scrubbing, setScrubbing] = useState(false)
  const barRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return undefined
    const update = () => {
      const { currentTime, duration } = audio
      setFraction(Number.isFinite(duration) && duration > 0 ? currentTime / duration : 0)
    }
    update()
    const events = ['timeupdate', 'durationchange', 'emptied', 'seeking']
    events.forEach((name) => audio.addEventListener(name, update))
    return () => events.forEach((name) => audio.removeEventListener(name, update))
  }, [audioRef])

  const fractionAt = (clientX) => {
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return 0
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  }
  const onPointerDown = (event) => {
    event.preventDefault()
    event.stopPropagation()   // 别触发外层的拖动播放器
    event.currentTarget.setPointerCapture(event.pointerId)
    setScrubbing(true)
    const value = fractionAt(event.clientX)
    setFraction(value)
    onSeek(value)
  }
  const onPointerMove = (event) => {
    if (!scrubbing) return
    const value = fractionAt(event.clientX)
    setFraction(value)
    onSeek(value)
  }
  const onPointerUp = () => setScrubbing(false)

  return (
    <div
      ref={barRef}
      role="slider"
      aria-label="播放进度"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fraction * 100)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="group/bar w-full py-[5px] cursor-pointer touch-none select-none"
    >
      <div className="relative h-[2px]">
        {/* 未播放：1px 发丝线 */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/40 group-hover/bar:bg-white/55 transition-colors" />
        {/* 已播放：2px 实线 */}
        <div className="absolute inset-y-0 left-0" style={{ width: `${fraction * 100}%`, background: LINE }} />
        {/* 接头：亮色细针，比线高出上下各 3px */}
        <span
          className={`absolute -top-[3px] -bottom-[3px] w-px -translate-x-1/2 transition-opacity opacity-100`}
          style={{ left: `${fraction * 100}%`, background: TIP }}
        />
      </div>
    </div>
  )
}

// 播放器可以拖到任何位置（FloatingControls），拖完发这个事件，开着的歌单据此重新决定往哪边展开
export const PLAYER_MOVED_EVENT = 'bgm-player-moved'
const LIST_GAP = 8

// 歌单往哪边展开：看播放器在主内容区里的位置——上方空间多就往上、否则往下；
// 列表高度不超过那一侧的剩余空间（手机横屏只有三四百像素高，9 首全展开会顶出屏幕，超出的在列表里滚动）
function playlistPlacement(anchor) {
  const box = anchor?.closest('[data-bgm-box]')
  const parent = box?.offsetParent
  if (!box || !parent) return { above: true, maxHeight: 240 }
  const header = parent.firstElementChild
  const headerHeight = header && header !== box ? header.offsetHeight : 0
  const spaceAbove = box.offsetTop - headerHeight - LIST_GAP * 2
  const spaceBelow = parent.clientHeight - box.offsetTop - box.offsetHeight - LIST_GAP * 2
  const above = spaceAbove >= spaceBelow
  return { above, maxHeight: Math.max(120, above ? spaceAbove : spaceBelow) }
}

// 歌单是播放器向上（或向下）长出来的一截：和胶囊同宽、共用一个外框和同一层封面氛围底色，
// 胶囊在展开时变成这张卡的底栏（自身外框、底色透明）。卡片靠胶囊那一端的圆角半径 = 胶囊高度的一半，轮廓和胶囊重合。
// 底色垫当前曲目封面的大模糊（换歌跟着变）；列表在里面滚，打开时滚到当前那首。
const CARD_RADIUS = 16

// 封面氛围底：当前曲目封面放大 + 大模糊，再压一层半透明灰紫，让底色带上这首歌的色调（换歌跟着变）。
// 收起时垫在胶囊里，展开时垫在整张卡片里，两种状态颜色一致。
function CoverAmbient({ track }) {
  return (
    <>
      <img
        key={track.id}
        src={trackCover(track)} alt="" aria-hidden="true" draggable={false}
        className="absolute inset-0 w-full h-full object-cover scale-150 blur-2xl saturate-[1.6] opacity-90 pointer-events-none select-none"
      />
      <span className="absolute inset-0 bg-[#2e2b3d]/40 pointer-events-none" />
    </>
  )
}

function Playlist({ tracks, trackIndex, isPlaying, placement, pillHeight, onPick }) {
  const currentRef = useRef(null)
  useEffect(() => { currentRef.current?.scrollIntoView({ block: 'nearest' }) }, [])
  const { above } = placement
  const pillRadius = pillHeight / 2
  const currentTrack = tracks[trackIndex]
  return (
    <div
      data-bgm-playlist=""
      className={`absolute inset-x-0 ${above ? 'bottom-0' : 'top-0'} flex flex-col overflow-hidden border border-white/25 bg-[#3a3650] shadow-[0_10px_28px_rgba(0,0,0,0.45)]`}
      style={{
        maxHeight: placement.maxHeight + pillHeight,
        [above ? 'paddingBottom' : 'paddingTop']: pillHeight,
        borderRadius: above
          ? `${CARD_RADIUS}px ${CARD_RADIUS}px ${pillRadius}px ${pillRadius}px`
          : `${pillRadius}px ${pillRadius}px ${CARD_RADIUS}px ${CARD_RADIUS}px`,
      }}
    >
      <CoverAmbient track={currentTrack} />

      <div className={`relative min-h-0 overflow-y-auto overscroll-contain touch-pan-y py-1.5 ${above ? 'border-b' : 'border-t'} border-white/20 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.3)_transparent]`}>
        {tracks.map((track, index) => {
          const current = index === trackIndex
          return (
            <button
              key={track.id}
              ref={current ? currentRef : undefined}
              onClick={() => onPick(index)}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
                current ? 'bg-white/[0.16]' : 'hover:bg-white/[0.09]'
              }`}
            >
              <span className={`w-4 shrink-0 flex justify-center text-[10px] md:text-[11px] tabular-nums ${current ? 'text-[#d6cbf5]' : 'text-white/60'}`}>
                {current && isPlaying ? <EqBars state="playing" className="h-[11px]" /> : String(index + 1).padStart(2, '0')}
              </span>
              <img
                src={trackCover(track)} alt="" loading="lazy" draggable={false}
                className={`w-8 h-8 md:w-9 md:h-9 shrink-0 rounded-[5px] object-cover ring-1 ${current ? 'ring-[#d6cbf5]/80' : 'ring-white/25'}`}
              />
              <span className={`min-w-0 truncate text-[11px] md:text-[13px] transition-colors ${
                current ? 'text-white font-medium' : 'text-white/90 hover:text-white'
              }`}>
                {track.title}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function MusicPlayer() {
  const { tracks, track, trackIndex, isPlaying, isLoading, failed, mode, toggle, selectTrack, next, cycleMode, seek, audioRef } = useMusic()
  const { playButtonClick } = useSound()
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState({ above: true, maxHeight: 240 })
  const [pillHeight, setPillHeight] = useState(52)
  const rootRef = useRef(null)
  const pillRef = useRef(null)

  const measure = () => {
    setPlacement(playlistPlacement(rootRef.current))
    if (pillRef.current) setPillHeight(pillRef.current.offsetHeight)
  }

  const toggleList = () => {
    if (!open) measure()
    setOpen((value) => !value)
  }

  // 开着歌单时拖动了播放器：重新决定展开方向
  useEffect(() => {
    if (!open) return undefined
    const replace = () => measure()
    window.addEventListener(PLAYER_MOVED_EVENT, replace)
    window.addEventListener('resize', replace)
    return () => {
      window.removeEventListener(PLAYER_MOVED_EVENT, replace)
      window.removeEventListener('resize', replace)
    }
  }, [open])

  // 点歌单外面收起
  useEffect(() => {
    if (!open) return
    const close = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const eqState = failed ? 'paused' : isLoading ? 'loading' : isPlaying ? 'playing' : 'paused'
  const titleTone = isPlaying && !failed ? 'text-white' : 'text-white/80'

  return (
    <div ref={rootRef} className="relative">
      {open && (
        <Playlist
          tracks={tracks}
          trackIndex={trackIndex}
          isPlaying={isPlaying}
          placement={placement}
          pillHeight={pillHeight}
          onPick={(index) => { playButtonClick(); selectTrack(index); setOpen(false) }}
        />
      )}
      {/* 展开时胶囊变成歌单卡片的底栏：外框、底色交给卡片，自己透明 */}
      <div
        ref={pillRef}
        className={`relative z-10 flex items-center gap-1.5 rounded-full border pl-1 pr-1 py-1 ${
          open ? 'border-transparent' : 'border-white/25 bg-[#3a3650] shadow-[0_3px_12px_rgba(0,0,0,0.4)]'
        }`}
      >
        {/* 收起时胶囊自己带封面氛围底；展开时由卡片统一垫 */}
        {!open && (
          <span className="absolute inset-0 -z-10 rounded-full overflow-hidden pointer-events-none">
            <CoverAmbient track={track} />
          </span>
        )}
        <Disc track={track} isPlaying={isPlaying} isLoading={isLoading} onClick={() => { playButtonClick(); toggle() }} />
        {/* 曲名一行 + 下面一根进度条，进度条宽度跟着这块走，不改胶囊宽度 */}
        <div className="min-w-0 flex flex-col pl-0.5">
          <button
            onClick={() => { playButtonClick(); toggleList() }}
            aria-label="背景音乐歌单"
            className="min-w-0 flex items-center gap-1.5 text-left"
          >
            <EqBars state={eqState} />
            <MarqueeTitle
              text={track.title}
              className={`w-[4.5rem] md:w-[5.5rem] text-[11px] md:text-[13px] font-medium transition-colors ${titleTone}`}
            />
            {failed && <span className="shrink-0 text-[10px] md:text-[11px] text-rose-200/70">放不了</span>}
            <svg className={`w-2.5 h-2.5 shrink-0 text-white/75 transition-transform ${open ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6-6 6 6" /></svg>
          </button>
          <ProgressBar audioRef={audioRef} onSeek={seek} />
        </div>
        <button
          onClick={() => {
            playButtonClick()
            const nextMode = cycleMode()
            toast(nextMode.label, { id: 'bgm-mode', duration: 1200 })
          }}
          aria-label={`播放模式：${modeLabel(mode)}（点一下切换）`}
          className="shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15"
        >
          <ModeIcon mode={mode} className="w-4 h-4 md:w-[18px] md:h-[18px]" />
        </button>
        <button
          onClick={() => { playButtonClick(); next() }}
          aria-label="下一首"
          className="shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15"
        >
          <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 5.5v13l9-6.5-9-6.5zM16 5h3v14h-3z" /></svg>
        </button>
      </div>
    </div>
  )
}
