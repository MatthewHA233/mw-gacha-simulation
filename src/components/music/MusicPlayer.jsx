'use client'

import { useEffect, useRef, useState } from 'react'
import { useMusic } from './MusicProvider'
import { useSound } from '../../hooks/useSound'

/**
 * 左下角的背景音乐播放器（2026-10-15）：唱片 = 播放/暂停，曲名一直显示（暂停时也显示），
 * 点曲名展开歌单，右边是下一首。状态都在根布局的 MusicProvider，换页面不中断。
 */

// 唱片纹路（同心细纹）
const VINYL = 'repeating-radial-gradient(circle at 50% 50%, #17151d 0 1.5px, #24212c 1.5px 3px)'

function Disc({ isPlaying, isLoading, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={isPlaying ? '暂停背景音乐' : '播放背景音乐'}
      className="relative shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/25"
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: VINYL, animation: 'spin 6s linear infinite', animationPlayState: isPlaying && !isLoading ? 'running' : 'paused' }}
      />
      {isLoading && (
        <span className="absolute -inset-[3px] rounded-full border-2 border-transparent border-t-violet-400 animate-spin" />
      )}
      {/* 中心标签：播放中是紫色标签 + 音符，暂停时灰色 + 播放三角 */}
      <span
        className={`absolute inset-[30%] rounded-full flex items-center justify-center ${isPlaying ? 'bg-violet-500' : 'bg-slate-500'}`}
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)' }}
      >
        {isPlaying ? (
          <svg className="w-2 h-2 md:w-2.5 md:h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" /></svg>
        ) : (
          <svg className="w-2 h-2 md:w-2.5 md:h-2.5 text-white translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        )}
      </span>
    </button>
  )
}

function Playlist({ tracks, trackIndex, isPlaying, onPick }) {
  return (
    <div className="absolute bottom-full left-0 mb-2 w-44 md:w-52 rounded-xl border border-white/15 bg-[#0e0c15]/95 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
      <div className="px-2 pt-1 pb-1.5 text-[10px] md:text-[11px] text-white/45">背景音乐 · 游戏主界面</div>
      {tracks.map((track, index) => {
        const current = index === trackIndex
        return (
          <button
            key={track.id}
            onClick={() => onPick(index)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 md:py-2 rounded-lg text-left text-[11px] md:text-xs transition-colors ${
              current ? 'bg-violet-500/20 text-violet-100' : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <span className={`w-3.5 shrink-0 text-center tabular-nums ${current ? 'text-violet-300' : 'text-white/35'}`}>
              {current && isPlaying ? (
                <svg className="w-3 h-3 inline" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" /></svg>
              ) : index + 1}
            </span>
            <span className="truncate">{track.title}</span>
          </button>
        )
      })}
    </div>
  )
}

export function MusicPlayer() {
  const { tracks, track, trackIndex, isPlaying, isLoading, failed, toggle, selectTrack, next } = useMusic()
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

  const status = failed ? '暂时放不了' : isLoading ? '加载中…' : isPlaying ? '正在播放' : '已暂停'

  return (
    <div ref={rootRef} className="relative">
      {open && (
        <Playlist
          tracks={tracks}
          trackIndex={trackIndex}
          isPlaying={isPlaying}
          onPick={(index) => { playButtonClick(); selectTrack(index); setOpen(false) }}
        />
      )}
      <div className="flex items-center gap-1.5 md:gap-2 rounded-full border border-white/15 bg-black/55 backdrop-blur-sm pl-1 pr-1 py-1 shadow-[0_3px_12px_rgba(0,0,0,0.55)]">
        <Disc isPlaying={isPlaying} isLoading={isLoading} onClick={() => { playButtonClick(); toggle() }} />
        <button
          onClick={() => { playButtonClick(); setOpen((value) => !value) }}
          aria-label="背景音乐歌单"
          className="min-w-0 flex flex-col items-start text-left leading-tight"
        >
          <span className={`text-[9px] md:text-[10px] ${failed ? 'text-rose-300/80' : 'text-white/45'}`}>{status}</span>
          <span className="flex items-center gap-1 text-[11px] md:text-[13px] font-medium text-white/90">
            <span className="max-w-[6.5rem] md:max-w-[9rem] truncate">{track.title}</span>
            <svg className={`w-2.5 h-2.5 text-white/50 transition-transform ${open ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6-6 6 6" /></svg>
          </span>
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
