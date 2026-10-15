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
      <span className={`absolute inset-0 rounded-full bg-black/25 pointer-events-none transition-opacity duration-300 ${isPlaying ? 'opacity-0' : 'opacity-100'}`} />
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

// 播放状态只用这三根细音量条表达，不写「正在播放 / 已暂停」：
// 播放时跳动（动画在 src/index.css 的 .bgm-eq-bar，三根节奏错开）；暂停时静止变淡；加载时整体慢慢呼吸。
// 颜色用低饱和的淡丁香色，不用亮紫。
const EQ_BARS = [[0.9, 0, 0.45], [0.7, 0.3, 0.8], [1.1, 0.15, 0.6]]   // 动画时长、错开、静止时的高度

function EqBars({ state, className = 'h-2.5 md:h-3' }) {
  const playing = state === 'playing'
  return (
    <span
      className={`flex items-end gap-[2px] shrink-0 ${playing ? '' : 'opacity-40'} ${state === 'loading' ? 'animate-pulse' : ''} ${className}`}
      aria-hidden="true"
    >
      {EQ_BARS.map(([duration, delay, rest]) => (
        <span
          key={duration}
          className={`w-[2px] h-full rounded-full bg-[#b9a8e6] origin-bottom ${playing ? 'bgm-eq-bar' : ''}`}
          style={playing
            ? { animationDuration: `${duration}s`, animationDelay: `-${delay}s` }
            : { transform: `scaleY(${rest})` }}
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

function Playlist({ tracks, trackIndex, isPlaying, mode, onPick }) {
  return (
    <div className="absolute bottom-full left-0 mb-2 w-44 md:w-52 rounded-xl border border-white/15 bg-[#0e0c15]/95 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between px-2 pt-1 pb-1.5 text-[10px] md:text-[11px] text-white/45">
        <span>背景音乐 · 游戏主界面</span>
        <span className="flex items-center gap-1 text-[#b9a8e6]/80">
          <ModeIcon mode={mode} className="w-3 h-3" />{modeLabel(mode)}
        </span>
      </div>
      {tracks.map((track, index) => {
        const current = index === trackIndex
        return (
          <button
            key={track.id}
            onClick={() => onPick(index)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 md:py-2 rounded-lg text-left text-[11px] md:text-xs transition-colors ${
              current ? 'bg-[#b9a8e6]/[0.12] text-[#ece7f8]' : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <span className={`w-3.5 shrink-0 text-center tabular-nums ${current ? 'text-[#b9a8e6]' : 'text-white/35'}`}>
              {current && isPlaying ? <EqBars state="playing" className="h-3 justify-center" /> : index + 1}
            </span>
            <img src={trackCover(track)} alt="" loading="lazy" draggable={false}
              className={`w-5 h-5 md:w-6 md:h-6 shrink-0 rounded-full object-cover ring-1 ${current ? 'ring-[#b9a8e6]/70' : 'ring-white/15'}`} />
            <span className="truncate">{track.title}</span>
          </button>
        )
      })}
    </div>
  )
}

export function MusicPlayer() {
  const { tracks, track, trackIndex, isPlaying, isLoading, failed, mode, toggle, selectTrack, next, cycleMode } = useMusic()
  const { playButtonClick } = useSound()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  // 点歌单外面收起
  useEffect(() => {
    if (!open) return
    const close = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const eqState = failed ? 'paused' : isLoading ? 'loading' : isPlaying ? 'playing' : 'paused'
  const titleTone = isPlaying && !failed ? 'text-[#ece7f8]' : 'text-white/55'

  return (
    <div ref={rootRef} className="relative">
      {open && (
        <Playlist
          tracks={tracks}
          trackIndex={trackIndex}
          isPlaying={isPlaying}
          mode={mode}
          onPick={(index) => { playButtonClick(); selectTrack(index); setOpen(false) }}
        />
      )}
      <div className="flex items-center gap-1.5 md:gap-2 rounded-full border border-white/15 bg-black/55 backdrop-blur-sm pl-1 pr-1 py-1 shadow-[0_3px_12px_rgba(0,0,0,0.55)]">
        <Disc track={track} isPlaying={isPlaying} isLoading={isLoading} onClick={() => { playButtonClick(); toggle() }} />
        <button
          onClick={() => { playButtonClick(); setOpen((value) => !value) }}
          aria-label="背景音乐歌单"
          className="min-w-0 flex items-center gap-1.5 md:gap-2 pl-0.5 text-left"
        >
          <EqBars state={eqState} />
          <span className={`max-w-[6.5rem] md:max-w-[9rem] truncate text-[11px] md:text-[13px] font-medium transition-colors ${titleTone}`}>
            {track.title}
          </span>
          {failed && <span className="shrink-0 text-[10px] md:text-[11px] text-rose-200/70">放不了</span>}
          <svg className={`w-2.5 h-2.5 shrink-0 text-white/40 transition-transform ${open ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6-6 6 6" /></svg>
        </button>
        <button
          onClick={() => {
            playButtonClick()
            const nextMode = cycleMode()
            toast(nextMode.label, { id: 'bgm-mode', duration: 1200 })
          }}
          aria-label={`播放模式：${modeLabel(mode)}（点一下切换）`}
          className="shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-white/65 hover:text-white hover:bg-white/10"
        >
          <ModeIcon mode={mode} className="w-4 h-4 md:w-[18px] md:h-[18px]" />
        </button>
        <button
          onClick={() => { playButtonClick(); next() }}
          aria-label="下一首"
          className="shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-white/65 hover:text-white hover:bg-white/10"
        >
          <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 5.5v13l9-6.5-9-6.5zM16 5h3v14h-3z" /></svg>
        </button>
      </div>
    </div>
  )
}
