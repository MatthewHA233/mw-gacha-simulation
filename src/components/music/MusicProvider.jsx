'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { CDN_BASE_URL } from '../../utils/constants'
import { BGM_TRACKS } from './tracks'

/**
 * 背景音乐（2026-10-15 从侧边栏抽出来，挂在根布局）
 *
 * 根布局在路由切换时不会重新挂载，所以 <audio> 放这里，换活动页面音乐不中断、进度不变；
 * 整页刷新时从 localStorage 记下的曲目和位置接着放。侧边栏的频谱和左下角的播放器都从这里取状态。
 * 播放偏好沿用原来侧边栏的 localStorage 键与规则：主动开过才自动播放，暂停超过一天自动恢复为播放。
 * 播放模式三种（默认列表循环），和最近播放的曲目、位置一起记在本地。
 */

const KEY_PLAYING = 'sidebar_music_playing'
const KEY_PAUSED_AT = 'sidebar_music_paused_at'
const KEY_POSITION = 'bgm_position' // { src, t }
const KEY_TRACK = 'bgm_track'
const KEY_MODE = 'bgm_mode'
const ONE_DAY_MS = 24 * 60 * 60 * 1000

// 单曲循环 → 列表循环 → 随机播放 → 单曲循环（点一下换下一种）
export const PLAY_MODES = [
  { id: 'one', label: '单曲循环' },
  { id: 'all', label: '列表循环' },
  { id: 'shuffle', label: '随机播放' },
]
const DEFAULT_MODE = 'all'   // 号主 2026-10-15 定：默认列表循环（本地存过模式的照旧用存的）
const isMode = (value) => PLAY_MODES.some((mode) => mode.id === value)

// 跨域：crossOrigin 的 <audio>（频谱要用）要求响应带跨域头。OSS 只在请求带 Origin 时才回，CDN 又不按 Origin
// 区分缓存，2026-10-15 有一次不带 Origin 的请求让主题曲在 CDN 上缓存成了没有跨域头的版本、浏览器加载失败。
// 当天已在 CDN（assets.lingflow.cn → 节点 HTTP 响应头）统一加 Access-Control-Allow-Origin: *（不允许重复）并刷新了 audio/ 目录。
// CDN 忽略 URL 参数，这个版本号只用来让浏览器丢掉自己缓存的旧响应。
const BGM_URL_VERSION = '2'
const trackSrc = (track) => `${CDN_BASE_URL}/audio/${track.file}?v=${BGM_URL_VERSION}`

const MusicContext = createContext(null)

const storage = {
  get(key) { try { return localStorage.getItem(key) } catch { return null } },
  set(key, value) { try { localStorage.setItem(key, value) } catch { /* 隐私模式等写不了，忽略 */ } },
  remove(key) { try { localStorage.removeItem(key) } catch { /* 同上 */ } },
}

const wantsMusic = () => storage.get(KEY_PLAYING) === 'true'

export function MusicProvider({ children }) {
  const audioRef = useRef(null)
  const contextRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)
  const indexRef = useRef(0)
  const modeRef = useRef(DEFAULT_MODE)
  const [trackIndex, setTrackIndex] = useState(0)
  const [mode, setMode] = useState(DEFAULT_MODE)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  // 频谱分析只建一次（同一个 <audio> 只能接一次 MediaElementSource）
  const ensureGraph = useCallback(() => {
    if (sourceRef.current || !audioRef.current) return
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const context = new AudioCtx()
      const analyser = context.createAnalyser()
      analyser.fftSize = 64
      const source = context.createMediaElementSource(audioRef.current)
      source.connect(analyser)
      analyser.connect(context.destination)
      contextRef.current = context
      analyserRef.current = analyser
      sourceRef.current = source
    } catch {
      // 没有 Web Audio 也能照常播放，只是没有频谱
    }
  }, [])

  // 换曲目只换 src；播放与否由调用方决定。resumeAt 只在整页刷新后接着放时用。
  const loadTrack = useCallback((index, resumeAt = 0) => {
    const audio = audioRef.current
    const track = BGM_TRACKS[index]
    if (!audio || !track) return
    indexRef.current = index
    setTrackIndex(index)
    setFailed(false)
    storage.set(KEY_TRACK, track.id)
    // 没打算放音乐的访客不预载：每首 wav 二三十 MB，全走 CDN 流量
    audio.preload = wantsMusic() ? 'auto' : 'none'
    audio.src = trackSrc(track)
    if (resumeAt > 0) {
      audio.addEventListener('loadedmetadata', () => {
        try { audio.currentTime = resumeAt } catch { /* 时长未知时忽略 */ }
      }, { once: true })
    }
  }, [])

  const play = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return false
    ensureGraph()
    // 上次加载失败（网络 / CDN 缓存坏了）：元素停在出错状态，不重新 load 的话 play() 只会原地失败
    if (audio.error) { setFailed(false); audio.load() }
    storage.set(KEY_PLAYING, 'true')
    storage.remove(KEY_PAUSED_AT)
    try {
      if (contextRef.current?.state === 'suspended') await contextRef.current.resume()
      await audio.play()
      return true
    } catch (error) {
      // NotAllowedError = 浏览器拦了自动播放（等第一次点击）；AbortError = 加载中途换了曲目
      if (error?.name !== 'NotAllowedError' && error?.name !== 'AbortError') console.error('[BGM播放失败]', error)
      return false
    }
  }, [ensureGraph])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    storage.set(KEY_PLAYING, 'false')
    storage.set(KEY_PAUSED_AT, Date.now().toString())
  }, [])

  const toggle = useCallback(() => (isPlaying ? pause() : play()), [isPlaying, pause, play])

  // 在歌单里点哪首就放哪首
  const selectTrack = useCallback((index) => {
    if (index !== indexRef.current) loadTrack(index)
    play()
  }, [loadTrack, play])

  // 单曲循环交给 <audio loop>（无缝，不会触发 ended）；另外两种在放完时换曲
  const applyMode = useCallback((value) => {
    modeRef.current = value
    setMode(value)
    if (audioRef.current) audioRef.current.loop = value === 'one'
  }, [])

  const cycleMode = useCallback(() => {
    const index = PLAY_MODES.findIndex((item) => item.id === modeRef.current)
    const nextMode = PLAY_MODES[(index + 1) % PLAY_MODES.length]
    applyMode(nextMode.id)
    storage.set(KEY_MODE, nextMode.id)
    return nextMode
  }, [applyMode])

  // 下一首：随机模式随机挑一首别的，其余按歌单顺序（单曲循环下点「下一首」也照顺序换）
  const nextIndex = useCallback(() => {
    const count = BGM_TRACKS.length
    if (modeRef.current === 'shuffle' && count > 1) {
      const pick = Math.floor(Math.random() * (count - 1))
      return pick >= indexRef.current ? pick + 1 : pick
    }
    return (indexRef.current + 1) % count
  }, [])

  const next = useCallback(() => selectTrack(nextIndex()), [selectTrack, nextIndex])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = 0.8

    // 暂停超过一天，自动恢复为「播放」偏好（原侧边栏规则）
    const pausedAt = parseInt(storage.get(KEY_PAUSED_AT) || '', 10)
    if (storage.get(KEY_PLAYING) === 'false' && pausedAt && Date.now() - pausedAt > ONE_DAY_MS) {
      storage.set(KEY_PLAYING, 'true')
      storage.remove(KEY_PAUSED_AT)
    }

    // 整页刷新后：上次的播放模式、那首、那个位置
    const savedMode = storage.get(KEY_MODE)
    applyMode(isMode(savedMode) ? savedMode : DEFAULT_MODE)
    const savedId = storage.get(KEY_TRACK)
    const savedIndex = Math.max(0, BGM_TRACKS.findIndex((track) => track.id === savedId))
    let resumeAt = 0
    try {
      const saved = JSON.parse(storage.get(KEY_POSITION) || 'null')
      if (saved && saved.src === trackSrc(BGM_TRACKS[savedIndex]) && saved.t > 0) resumeAt = saved.t
    } catch { /* 坏数据忽略 */ }
    loadTrack(savedIndex, resumeAt)
    if (wantsMusic()) play()

    // 状态跟着 <audio> 自己的事件走：play() 发出后要等数据才真正出声，中间显示加载中
    const onPlay = () => { setIsPlaying(true); setIsLoading(audio.readyState < 3) }
    const onPlaying = () => { setIsPlaying(true); setIsLoading(false) }
    const onPause = () => { setIsPlaying(false); setIsLoading(false) }
    const onWaiting = () => { if (!audio.paused) setIsLoading(true) }
    const onError = () => { setIsPlaying(false); setIsLoading(false); setFailed(true) }
    // 放完：列表循环接下一首（最后一首回到第一首），随机播放随机挑；单曲循环由 loop 处理，这里只是兜底
    const onEnded = () => {
      if (modeRef.current === 'one') {
        audio.currentTime = 0
        play()
        return
      }
      loadTrack(nextIndex())
      play()
    }

    // 浏览器拦了自动播放：等第一次点击 / 触摸再放（只在用户开过音乐时）
    const onFirstInteraction = () => { if (wantsMusic() && audio.paused) play() }
    document.addEventListener('click', onFirstInteraction, { once: true, passive: true })
    document.addEventListener('touchend', onFirstInteraction, { once: true, passive: true })

    // 记播放位置：每 5 秒一次 + 离开页面时
    let lastSaved = 0
    const savePosition = () => storage.set(KEY_POSITION, JSON.stringify({ src: audio.currentSrc || audio.src, t: audio.currentTime }))
    const onTimeUpdate = () => {
      const now = Date.now()
      if (now - lastSaved > 5000) { lastSaved = now; savePosition() }
    }

    const listeners = { play: onPlay, playing: onPlaying, pause: onPause, waiting: onWaiting,
      error: onError, ended: onEnded, timeupdate: onTimeUpdate }
    Object.entries(listeners).forEach(([name, fn]) => audio.addEventListener(name, fn))
    window.addEventListener('pagehide', savePosition)
    return () => {
      Object.entries(listeners).forEach(([name, fn]) => audio.removeEventListener(name, fn))
      document.removeEventListener('click', onFirstInteraction)
      document.removeEventListener('touchend', onFirstInteraction)
      window.removeEventListener('pagehide', savePosition)
    }
  }, [loadTrack, play, applyMode, nextIndex])

  const value = {
    tracks: BGM_TRACKS, track: BGM_TRACKS[trackIndex], trackIndex,
    isPlaying, isLoading, failed, mode,
    play, pause, toggle, selectTrack, next, cycleMode, analyserRef,
  }

  return (
    <MusicContext.Provider value={value}>
      {children}
      <audio ref={audioRef} crossOrigin="anonymous" />
    </MusicContext.Provider>
  )
}

const fallback = {
  tracks: BGM_TRACKS, track: BGM_TRACKS[0], trackIndex: 0, isPlaying: false, isLoading: false, failed: false,
  mode: DEFAULT_MODE,
  play: async () => false, pause: () => {}, toggle: () => {}, selectTrack: () => {}, next: () => {},
  cycleMode: () => PLAY_MODES[0], analyserRef: { current: null },
}

export function useMusic() {
  return useContext(MusicContext) || fallback
}
