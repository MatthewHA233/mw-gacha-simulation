'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MusicPlayer, PLAYER_MOVED_EVENT } from '../music/MusicPlayer'
import { useAutoFullscreen } from '../../hooks/useAutoFullscreen'

/**
 * 底部悬浮控件（2026-10-15）：背景音乐播放器。顺带挂上手机自动全屏横屏（没有按钮，见 useAutoFullscreen）。
 * 放在抽卡页的旋转容器里（伪横屏时跟着一起转）；音乐状态在根布局的 MusicProvider，换页面不中断。
 *
 * 默认在左侧 10%、贴底（号主定）；按住拖动可以换位置（移动超过 6px 才算拖，不影响点按钮），松手后按「在可移动范围里的比例」
 * 记在本地，换屏幕尺寸、横竖切换后还在同样的相对位置，也不会跑出屏幕。拖动范围是主内容区里顶部栏以下。
 * 伪横屏时页面整体转了 90°，手指在屏幕上的位移要按祖先元素的变换矩阵换算回页面里的方向。
 */
const POS_KEY = 'bgm_player_pos'   // { fx, fy }，0~1
const DRAG_THRESHOLD = 6

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

// 屏幕上的位移 → 本元素所在坐标系里的位移（抵消祖先的旋转 / 缩放）
function screenToLocal(el) {
  let matrix = new DOMMatrix()
  for (let node = el.parentElement; node; node = node.parentElement) {
    const transform = getComputedStyle(node).transform
    if (transform && transform !== 'none') matrix = new DOMMatrix(transform).multiply(matrix)
  }
  const inverse = matrix.inverse()
  const origin = inverse.transformPoint({ x: 0, y: 0 })
  return (dx, dy) => {
    const point = inverse.transformPoint({ x: dx, y: dy })
    return { x: point.x - origin.x, y: point.y - origin.y }
  }
}

// 可移动范围：主内容区内、顶部栏（主内容区第一个子元素）以下
function bounds(el) {
  const parent = el.offsetParent
  if (!parent) return null
  const header = parent.firstElementChild
  const minTop = header && header !== el ? header.offsetHeight : 0
  return {
    maxLeft: Math.max(0, parent.clientWidth - el.offsetWidth),
    minTop,
    maxTop: Math.max(minTop, parent.clientHeight - el.offsetHeight),
  }
}

function readStoredPos() {
  try {
    const value = JSON.parse(localStorage.getItem(POS_KEY) || 'null')
    if (value && Number.isFinite(value.fx) && Number.isFinite(value.fy)) {
      return { fx: clamp(value.fx, 0, 1), fy: clamp(value.fy, 0, 1) }
    }
  } catch { /* 坏数据 / 存储不可用：用默认位置 */ }
  return null
}

export function FloatingControls() {
  useAutoFullscreen()
  const boxRef = useRef(null)
  const dragRef = useRef(null)
  const justDraggedRef = useRef(false)
  const [pos, setPos] = useState(null)        // 存下的比例；null = 默认位置
  const [pixels, setPixels] = useState(null)  // 实际摆放的 left / top

  useEffect(() => { setPos(readStoredPos()) }, [])

  // 比例 → 像素；窗口、侧边栏、横竖变化时重算
  useLayoutEffect(() => {
    const el = boxRef.current
    const parent = el?.offsetParent
    if (!el || !parent || !pos) { setPixels(null); return undefined }
    const place = () => {
      const b = bounds(el)
      if (b) setPixels({ left: b.maxLeft * pos.fx, top: b.minTop + (b.maxTop - b.minTop) * pos.fy })
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(parent)
    observer.observe(el)
    return () => observer.disconnect()
  }, [pos])

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    // 在歌单里按下（拖滚动条、滑列表）不拖播放器，否则播放器会跟着手走
    if (event.target.closest?.('[data-bgm-playlist]')) return
    const el = boxRef.current
    const b = bounds(el)
    if (!b) return
    justDraggedRef.current = false
    dragRef.current = {
      id: event.pointerId, startX: event.clientX, startY: event.clientY,
      left: el.offsetLeft, top: el.offsetTop, toLocal: screenToLocal(el), bounds: b, moved: false, last: null,
    }
  }

  const onPointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return
    const { x, y } = drag.toLocal(event.clientX - drag.startX, event.clientY - drag.startY)
    if (!drag.moved) {
      if (Math.hypot(x, y) < DRAG_THRESHOLD) return
      drag.moved = true
      boxRef.current.setPointerCapture?.(event.pointerId)
    }
    const { maxLeft, minTop, maxTop } = drag.bounds
    drag.last = { left: clamp(drag.left + x, 0, maxLeft), top: clamp(drag.top + y, minTop, maxTop) }
    setPixels(drag.last)
  }

  const endDrag = (event) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return
    dragRef.current = null
    if (!drag.moved || !drag.last) return
    justDraggedRef.current = true
    const { maxLeft, minTop, maxTop } = drag.bounds
    const next = {
      fx: maxLeft > 0 ? drag.last.left / maxLeft : 0,
      fy: maxTop > minTop ? (drag.last.top - minTop) / (maxTop - minTop) : 1,
    }
    setPos(next)
    try { localStorage.setItem(POS_KEY, JSON.stringify(next)) } catch { /* 存不了就只在这次有效 */ }
    window.dispatchEvent(new Event(PLAYER_MOVED_EVENT))   // 歌单开着的话重新决定往哪边展开
  }

  // 拖完松手那一下不算点击（不切歌、不暂停）
  const onClickCapture = (event) => {
    if (!justDraggedRef.current) return
    justDraggedRef.current = false
    event.stopPropagation()
    event.preventDefault()
  }

  return (
    <div
      ref={boxRef}
      data-bgm-box=""
      className={`absolute z-30 touch-none select-none ${pixels ? '' : 'left-[10%] bottom-3 md:bottom-6'}`}
      style={pixels ? { left: pixels.left, top: pixels.top } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
    >
      <MusicPlayer />
    </div>
  )
}
