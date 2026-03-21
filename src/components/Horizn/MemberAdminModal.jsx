import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import {
  getAllMembersForAdmin,
  setHullNumber,
  setHullDate,
  setMemberBlacklist,
  setMemberBlacklistDate,
  transferHullNumber,
  subscribeToMemberChanges,
  getBlacklistElse,
  addBlacklistElse,
  updateBlacklistElse,
  deleteBlacklistElse,
  manualBindQQ,
  updateQQLeftAt
} from '@/services/horiznSupabase'

const formatDate = (isoStr) => {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}


const CopyIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

const QQIcon = () => (
  <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 1024 1024" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M671.346939 929.959184c-10.971429 0-22.465306-1.044898-33.436735-2.612245-41.273469-5.22449-78.367347-25.077551-106.057143-55.902041-14.106122 5.746939-29.779592 5.746939-43.885714 0-22.465306 29.779592-64.783673 50.677551-114.416327 55.902041-70.008163 7.314286-145.763265-12.016327-152.555102-58.514286-5.22449-36.04898 39.183673-64.261224 85.681633-79.934694-27.167347-29.779592-45.97551-67.395918-53.812245-107.102041l-0.522449 1.044898c-26.644898 32.914286-43.885714 52.767347-64.261224 52.767347-2.089796 0-4.702041-0.522449-6.791837-1.044898-7.314286-2.612245-13.583673-8.881633-18.285714-19.853061-17.240816-36.04898-9.926531-105.534694 16.195918-158.302041 0 0 0-0.522449 0.522449-0.522449 13.061224-24.032653 29.257143-45.97551 48.065306-65.306122-6.791837-12.016327-10.971429-25.077551-12.538775-38.661225v-3.134694c0.522449-20.37551 10.971429-39.183673 27.689796-49.632653-11.493878-76.8 10.44898-155.167347 61.648979-214.204081C356.310204 124.865306 430.497959 91.95102 509.387755 94.040816h5.22449c68.963265 0 136.359184 27.689796 185.991837 75.755102 51.722449 50.155102 80.979592 118.073469 82.024489 190.693878v7.836735c0.522449 9.926531 0 20.37551-1.044898 30.824489 14.628571 9.404082 22.465306 21.420408 22.465307 50.677551 0 14.628571-1.567347 29.257143-10.44898 37.616327 13.583673 18.808163 30.302041 44.930612 43.363265 66.35102l2.612245 4.179592c21.420408 34.481633 24.555102 78.367347 24.555102 101.355102 0 18.285714-2.089796 61.126531-19.330612 74.187755-3.657143 2.612245-7.836735 4.179592-12.538776 4.179592h-4.70204c-27.167347 0-43.885714-25.077551-61.126531-51.2l-1.567347-2.089796c-9.404082 38.661224-27.689796 74.710204-53.812245 104.489796 28.734694 9.926531 87.24898 33.436735 79.934694 77.322449-4.702041 35.526531-57.469388 63.738776-119.640816 63.738776 0.522449 0 0 0 0 0z m-109.191837-87.24898c20.897959 24.032653 49.632653 39.706122 80.979592 43.363265h1.044898c8.881633 1.567347 18.285714 2.089796 27.689796 2.089796 50.677551 0 77.844898-21.942857 79.412245-28.734694 0.522449-2.089796-8.359184-16.718367-59.559184-33.436734l-23.510204-7.836735c-6.791837-2.089796-12.016327-7.836735-13.583674-14.628571s0-14.628571 5.22449-19.853062l17.240817-17.763265c26.122449-28.212245 43.885714-63.216327 50.677551-101.877551l5.746938-38.661224c1.044898-8.359184 7.836735-15.673469 16.195919-17.240817 8.359184-2.089796 17.240816 1.567347 21.942857 8.881633l30.82449 45.97551 0.522449 0.522449c5.22449 7.836735 12.538776 18.808163 18.285714 25.6 4.179592-25.6 4.702041-76.8-15.673469-109.191837l-2.612245-4.179591c-13.583673-21.942857-30.82449-49.110204-43.885715-66.351021l-9.92653-13.583673c-3.134694-4.179592-4.702041-9.926531-4.179592-15.67347 1.044898-5.746939 3.657143-10.44898 8.359184-13.583673l9.92653-7.314286c0-2.089796 0.522449-5.22449 0.522449-9.926531 0-12.016327-1.567347-14.628571-1.567347-14.628571-0.522449 0-2.612245-1.567347-4.179592-2.612245-0.522449-0.522449-1.044898-0.522449-1.567347-1.044898l-7.836734-5.22449c-6.791837-4.702041-9.926531-12.538776-8.881633-20.37551l1.567347-9.92653c1.044898-8.881633 1.044898-17.763265 1.044898-26.644898V360.489796c-1.044898-60.081633-26.644898-119.118367-69.485714-160.914286-43.885714-42.318367-101.355102-65.306122-161.959184-63.738775h-1.044898c-67.395918-2.089796-130.089796 26.122449-173.97551 76.277551-43.363265 50.677551-62.171429 117.55102-51.2 183.902041l1.567347 9.92653c1.044898 8.359184-2.612245 16.718367-9.404082 20.897959l-8.359183 5.22449c-0.522449 0-1.044898 0.522449-1.044898 0.522449-5.746939 3.134694-9.404082 8.881633-9.926531 15.151021 1.567347 8.881633 4.702041 17.240816 9.404082 25.077551 0.522449 0.522449 0.522449 1.044898 0.522449 1.567346l5.224489 9.926531c4.179592 7.836735 2.612245 17.240816-3.134694 23.510204L261.22449 516.702041l-0.522449 0.522449c-17.240816 17.240816-32.391837 37.093878-43.885714 59.036734-19.330612 39.183673-23.510204 82.546939-19.330613 107.62449 7.836735-8.359184 16.718367-19.853061 22.987755-27.167347l31.869388-39.183673c5.22449-6.791837 14.106122-9.404082 21.942857-6.791837s14.106122 9.404082 14.628572 17.763265l3.657143 36.571429c5.746939 38.138776 23.510204 73.665306 50.155102 100.832653l17.763265 18.285714c5.22449 5.22449 7.314286 12.538776 5.22449 19.853062s-7.314286 12.538776-14.106123 14.628571l-24.555102 7.314286c-44.408163 13.061224-62.693878 31.346939-64.261224 36.571428 2.612245 8.881633 42.318367 29.257143 106.579592 22.465306 39.183673-4.179592 72.097959-20.37551 86.72653-41.273469l4.702041-6.791837c3.657143-5.746939 10.44898-9.404082 17.763265-9.404081h12.016327c3.134694 0 6.269388 0.522449 8.881632 2.089796l4.179592 2.089796c4.179592 2.089796 9.404082 2.089796 13.583674 0l10.971428-5.746939c9.404082-5.22449 20.897959-2.612245 27.167347 5.746939l6.791837 10.971428z m-299.363265 19.853061z m263.314285-11.493877z m290.481633-147.330612z m-49.110204-248.163266z" />
  </svg>
)

const handleCopy = (text, label) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(String(text))
      .then(() => toast.success(`已复制${label}`, { duration: 1500 }))
      .catch(() => toast.error('复制失败'))
  }
}

// 舷号分区定义
const HULL_SECTIONS = [
  {
    id: 'command',
    label: '联队管理层',
    sub: 'COMMAND · No.000 – No.010',
    range: [0, 10],
    accent: 'amber',
    bgOccupied: 'bg-amber-500/25 border-amber-500/60 text-amber-300',
    bgEmpty: 'bg-amber-950/20 border-amber-900/30 text-amber-700/60',
    headerBg: 'from-amber-600/20 to-amber-900/5',
    headerBorder: 'border-amber-700/40',
    icon: (
      <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ),
  },
  {
    id: 'elite',
    label: '杰出贡献者',
    sub: 'ELITE · No.011 – No.100',
    range: [11, 100],
    accent: 'purple',
    bgOccupied: 'bg-purple-500/25 border-purple-500/60 text-purple-300',
    bgEmpty: 'bg-purple-950/20 border-purple-900/30 text-purple-700/60',
    headerBg: 'from-purple-600/20 to-purple-900/5',
    headerBorder: 'border-purple-700/40',
    icon: (
      <svg className="w-3.5 h-3.5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    id: 'honor',
    label: '荣誉舷号',
    sub: 'HONOR · No.101 – No.999',
    range: [101, 999],
    accent: 'cyan',
    bgOccupied: 'bg-cyan-500/25 border-cyan-500/60 text-cyan-300',
    bgEmpty: 'bg-cyan-950/20 border-cyan-900/30 text-cyan-700/60',
    headerBg: 'from-cyan-600/20 to-cyan-900/5',
    headerBorder: 'border-cyan-700/40',
    icon: (
      <svg className="w-3.5 h-3.5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z" />
      </svg>
    ),
  },
]

/** 计算某个分区中有占位的行（从分区起点开始，每10个一行） */
function getSectionRows(start, end, occupancyMap) {
  const rows = []
  for (let r = start; r <= end; r += 10) {
    const cellStart = r
    const cellEnd = Math.min(r + 9, end)
    let hasOccupied = false
    for (let i = cellStart; i <= cellEnd; i++) {
      if (occupancyMap.has(i)) { hasOccupied = true; break }
    }
    if (!hasOccupied) continue
    rows.push({ rowNum: r, cellStart, cellEnd })
  }
  return rows
}

export default function MemberAdminModal({ show, onClose, isMobile }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('hull') // 'hull' | 'blacklist'
  const [hullView, setHullView] = useState('grid') // 'list' | 'grid'
  const [hullSort, setHullSort] = useState('date') // 'date' | 'number'

  // 添加行：搜索
  const [addSearchQuery, setAddSearchQuery] = useState('')
  const [showAddDropdown, setShowAddDropdown] = useState(false)
  const addContainerRef = useRef(null)

  // 舷号编辑
  const [editingHull, setEditingHull] = useState(null) // { playerId, value }

  // 黑名单备注内联编辑: { type: 'member'|'else', id: playerId|elseId, value: string }
  const [editingNote, setEditingNote] = useState(null)

  // 拉黑日期弹窗: { type: 'member'|'else', id: playerId|elseId, value: string (YYYY-MM-DD) }
  const [editingBlacklistDate, setEditingBlacklistDate] = useState(null)

  // 黑名单确认
  const [blacklistNote, setBlacklistNote] = useState('')
  const [confirmingBlacklist, setConfirmingBlacklist] = useState(null)
  const [blacklistQQ, setBlacklistQQ] = useState('')
  const [blacklistQQReadonly, setBlacklistQQReadonly] = useState(false)
  const [blacklistLeftAt, setBlacklistLeftAt] = useState('')

  // 座位图选中
  const [selectedSeat, setSelectedSeat] = useState(null) // number or null
  const [seatSearchQuery, setSeatSearchQuery] = useState('')

  // 舷号确认弹窗
  const [confirmingHullAdd, setConfirmingHullAdd] = useState(null) // { playerId, hullNumber, memberName }
  const [confirmingHullDelete, setConfirmingHullDelete] = useState(null) // { playerId, hullNumber, memberName }

  // 授予日期编辑
  const [editingHullDate, setEditingHullDate] = useState(null) // { playerId, value }
  const hullDateInputRef = useRef(null)

  // 更迭舷号
  const [transferringHull, setTransferringHull] = useState(null) // { oldPlayerId, hullNumber, oldName }
  const [transferSearchQuery, setTransferSearchQuery] = useState('')
  const [confirmingTransfer, setConfirmingTransfer] = useState(null) // { oldPlayerId, newPlayerId, hullNumber, oldName, newName }

  // 外部黑名单
  const [elseBlacklist, setElseBlacklist] = useState([])
  const [loadingElse, setLoadingElse] = useState(false)
  const [elseFormMode, setElseFormMode] = useState(null) // null | 'add' | id(string)
  const [elseFormData, setElseFormData] = useState({ name: '', player_id: '', qq_number: '', note: '' })

  // 批量导入
  const importFileRef = useRef(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importCols, setImportCols] = useState({ id: 'P', name: 'O', qq: 'Q', note: 'R' })
  const [importPreview, setImportPreview] = useState(null) // { rows: [], skipped: number }
  const [importing, setImporting] = useState(false)

  const loadMembers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllMembersForAdmin()
      setMembers(data)
    } catch (err) {
      console.error('[MemberAdminModal] Load failed:', err)
      toast.error('加载成员数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadElseBlacklist = useCallback(async () => {
    setLoadingElse(true)
    try {
      const data = await getBlacklistElse()
      setElseBlacklist(data)
    } catch {
      toast.error('加载外部黑名单失败')
    } finally {
      setLoadingElse(false)
    }
  }, [])

  useEffect(() => {
    if (!show) return
    loadMembers()
  }, [show, loadMembers])

  useEffect(() => {
    if (!show || activeTab !== 'blacklist') return
    loadElseBlacklist()
  }, [show, activeTab, loadElseBlacklist])

  // Realtime
  useEffect(() => {
    if (!show) return
    const unsubscribe = subscribeToMemberChanges((payload) => {
      setMembers(prev => prev.map(m =>
        m.player_id === payload.new.player_id
          ? {
              ...m,
              hull_number: payload.new.hull_number,
              hull_date: payload.new.hull_date,
              is_blacklisted: payload.new.is_blacklisted ?? false,
              blacklist_date: payload.new.blacklist_date,
              blacklist_note: payload.new.blacklist_note
            }
          : m
      ))
    })
    return unsubscribe
  }, [show])

  useEffect(() => {
    setAddSearchQuery('')
    setShowAddDropdown(false)
    setEditingHull(null)
    setSelectedSeat(null)
    setSeatSearchQuery('')
  }, [activeTab])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (addContainerRef.current && !addContainerRef.current.contains(e.target)) {
        setShowAddDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ========== 数据 ==========
  const hullMembers = useMemo(() => {
    return members
      .filter(m => m.hull_number)
      .sort((a, b) => {
        // __pending__ 始终排最前（正在输入舷号的新增项）
        if (a.hull_number === '__pending__') return -1
        if (b.hull_number === '__pending__') return 1
        if (hullSort === 'number') {
          const aNum = parseInt(a.hull_number.replace(/\D/g, ''), 10) || 0
          const bNum = parseInt(b.hull_number.replace(/\D/g, ''), 10) || 0
          return aNum - bNum
        }
        // date: 入群时间降序
        const aDate = a.qq_join_time ? new Date(a.qq_join_time).getTime() : 0
        const bDate = b.qq_join_time ? new Date(b.qq_join_time).getTime() : 0
        if (!aDate && !bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1
        return bDate - aDate
      })
  }, [members, hullSort])

  // 舷号占位 Map：number -> { current: member|null, legacy: member[] }
  const hullOccupancyMap = useMemo(() => {
    const map = new Map()
    for (const m of members) {
      if (!m.hull_number || m.hull_number === '__pending__') continue
      const isLegacy = m.hull_number.startsWith('[旧]')
      const num = parseInt(m.hull_number.replace(/\D/g, ''), 10)
      if (Number.isNaN(num)) continue
      const entry = map.get(num) || { current: null, legacy: [] }
      if (isLegacy) {
        entry.legacy.push(m)
      } else {
        entry.current = m
      }
      map.set(num, entry)
    }
    return map
  }, [members])

  // 月份分组颜色（列表视图用）
  const hullMonthColorMap = useMemo(() => {
    const map = new Map()
    let currentMonth = null
    let colorIndex = 0
    for (const m of hullMembers) {
      const monthKey = m.qq_join_time
        ? new Date(m.qq_join_time).getFullYear() + '-' + String(new Date(m.qq_join_time).getMonth() + 1).padStart(2, '0')
        : '__none__'
      if (monthKey !== currentMonth) {
        if (currentMonth !== null) colorIndex++
        currentMonth = monthKey
      }
      map.set(m.player_id, colorIndex % 2)
    }
    return map
  }, [hullMembers])

  const blacklistMembers = useMemo(() => {
    return members
      .filter(m => m.is_blacklisted)
      .sort((a, b) => {
        // 在队的置顶
        const aActive = a.active ? 1 : 0
        const bActive = b.active ? 1 : 0
        if (bActive !== aActive) return bActive - aActive
        // 同组内按拉黑时间倒序
        return (b.blacklist_date || '').localeCompare(a.blacklist_date || '')
      })
  }, [members])

  const addSuggestions = useMemo(() => {
    if (!addSearchQuery.trim()) return []
    const q = addSearchQuery.trim().toLowerCase()
    const existingIds = new Set(
      activeTab === 'hull'
        ? hullMembers.map(m => m.player_id)
        : blacklistMembers.map(m => m.player_id)
    )
    const results = []
    for (const m of members) {
      if (existingIds.has(m.player_id)) continue
      const name = (m.primary_name || '').toLowerCase()
      const pid = (m.player_id || '').toLowerCase()
      const allNames = (Array.isArray(m.all_names) ? m.all_names.join(' ') : (m.all_names || '')).toLowerCase()
      if (name.includes(q) || pid.includes(q) || allNames.includes(q)) {
        results.push(m)
      }
      if (results.length >= 10) break
    }
    return results
  }, [addSearchQuery, members, activeTab, hullMembers, blacklistMembers])

  // 选中座位的信息 { current, legacy }
  const selectedSeatEntry = useMemo(() => {
    if (selectedSeat === null) return null
    return hullOccupancyMap.get(selectedSeat) || null
  }, [selectedSeat, hullOccupancyMap])
  const selectedSeatMember = selectedSeatEntry?.current || null

  // 座位图空位搜索建议
  const seatSearchSuggestions = useMemo(() => {
    if (!seatSearchQuery.trim()) return []
    const q = seatSearchQuery.trim().toLowerCase()
    const results = []
    for (const m of members) {
      if (m.hull_number && m.hull_number !== '__pending__') continue
      const name = (m.primary_name || '').toLowerCase()
      const pid = (m.player_id || '').toLowerCase()
      const allNames = (Array.isArray(m.all_names) ? m.all_names.join(' ') : (m.all_names || '')).toLowerCase()
      if (name.includes(q) || pid.includes(q) || allNames.includes(q)) {
        results.push(m)
      }
      if (results.length >= 8) break
    }
    return results
  }, [seatSearchQuery, members])

  // ========== 舷号操作 ==========

  // 列表视图：输入舷号后弹确认
  const handleSaveHull = (playerId, rawValue) => {
    const trimmed = rawValue.trim()
    if (!trimmed) { cancelPendingHull(playerId); return }
    const hullNumber = `No.${trimmed.padStart(3, '0')}`
    const m = members.find(mm => mm.player_id === playerId)
    setConfirmingHullAdd({ playerId, hullNumber, memberName: m?.primary_name || playerId })
    setEditingHull(null)
  }

  // 列表视图：搜索添加 → 进入编辑模式
  const handleAddHullMember = (playerId) => {
    setAddSearchQuery('')
    setShowAddDropdown(false)
    setEditingHull({ playerId, value: '' })
    setMembers(prev => prev.map(m =>
      m.player_id === playerId ? { ...m, hull_number: '__pending__' } : m
    ))
  }

  // 座位图：空位搜索选人 → 弹确认
  const handleSeatAssign = (playerId) => {
    if (selectedSeat === null) return
    const hullNumber = `No.${String(selectedSeat).padStart(3, '0')}`
    const m = members.find(mm => mm.player_id === playerId)
    setSeatSearchQuery('')
    setConfirmingHullAdd({ playerId, hullNumber, memberName: m?.primary_name || playerId })
  }

  // 确认添加舷号
  const handleConfirmHullAdd = async () => {
    if (!confirmingHullAdd) return
    const { playerId, hullNumber } = confirmingHullAdd
    const result = await setHullNumber(playerId, hullNumber)
    if (result.success) {
      toast.success(`舷号已设为 ${hullNumber}`, { duration: 1500 })
      setMembers(prev => prev.map(m =>
        m.player_id === playerId ? { ...m, hull_number: hullNumber, hull_date: new Date().toISOString() } : m
      ))
      setSelectedSeat(null)
    } else {
      toast.error(`保存失败: ${result.error}`)
    }
    setConfirmingHullAdd(null)
  }

  // 请求删除舷号 → 弹确认
  const handleRequestDeleteHull = (playerId) => {
    const m = members.find(mm => mm.player_id === playerId)
    setConfirmingHullDelete({
      playerId,
      hullNumber: m?.hull_number || '',
      memberName: m?.primary_name || playerId
    })
  }

  // 确认删除舷号
  const handleConfirmHullDelete = async () => {
    if (!confirmingHullDelete) return
    const { playerId } = confirmingHullDelete
    const result = await setHullNumber(playerId, null)
    if (result.success) {
      toast.success('舷号已删除', { duration: 1500 })
      setMembers(prev => prev.map(m =>
        m.player_id === playerId ? { ...m, hull_number: null, hull_date: null } : m
      ))
      setSelectedSeat(null)
    } else {
      toast.error(`删除失败: ${result.error}`)
    }
    setConfirmingHullDelete(null)
  }

  const cancelPendingHull = (playerId) => {
    setMembers(prev => prev.map(m =>
      m.player_id === playerId && m.hull_number === '__pending__'
        ? { ...m, hull_number: null }
        : m
    ))
    setEditingHull(null)
  }

  // ========== 授予日期编辑 ==========
  const handleOpenDatePicker = (playerId, currentDate) => {
    const dateVal = currentDate ? currentDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
    setEditingHullDate({ playerId, value: dateVal })
    // 下一帧自动打开日历
    setTimeout(() => hullDateInputRef.current?.showPicker?.(), 50)
  }

  const handleSaveHullDate = async (playerId, dateStr) => {
    if (!dateStr) return
    const isoDate = new Date(dateStr + 'T00:00:00').toISOString()
    const result = await setHullDate(playerId, isoDate)
    if (result.success) {
      toast.success('授予日期已更新', { duration: 1500 })
      setMembers(prev => prev.map(m =>
        m.player_id === playerId ? { ...m, hull_date: isoDate } : m
      ))
    } else {
      toast.error(`更新失败: ${result.error}`)
    }
    setEditingHullDate(null)
  }

  // ========== 更迭舷号 ==========

  // 更迭搜索建议
  const transferSuggestions = useMemo(() => {
    if (!transferSearchQuery.trim() || !transferringHull) return []
    const q = transferSearchQuery.trim().toLowerCase()
    const results = []
    for (const m of members) {
      if (m.player_id === transferringHull.oldPlayerId) continue
      const name = (m.primary_name || '').toLowerCase()
      const pid = (m.player_id || '').toLowerCase()
      const allNames = (Array.isArray(m.all_names) ? m.all_names.join(' ') : (m.all_names || '')).toLowerCase()
      if (name.includes(q) || pid.includes(q) || allNames.includes(q)) {
        results.push(m)
      }
      if (results.length >= 8) break
    }
    return results
  }, [transferSearchQuery, members, transferringHull])

  const handleStartTransfer = (playerId) => {
    const m = members.find(mm => mm.player_id === playerId)
    if (!m?.hull_number || m.hull_number === '__pending__') return
    setTransferringHull({
      oldPlayerId: playerId,
      hullNumber: m.hull_number,
      oldName: m.primary_name || playerId
    })
    setTransferSearchQuery('')
  }

  const handleSelectTransferTarget = (newPlayerId) => {
    if (!transferringHull) return
    const newM = members.find(mm => mm.player_id === newPlayerId)
    setConfirmingTransfer({
      oldPlayerId: transferringHull.oldPlayerId,
      newPlayerId,
      hullNumber: transferringHull.hullNumber,
      oldName: transferringHull.oldName,
      newName: newM?.primary_name || newPlayerId
    })
  }

  const handleConfirmTransfer = async () => {
    if (!confirmingTransfer) return
    const { oldPlayerId, newPlayerId, hullNumber } = confirmingTransfer
    const result = await transferHullNumber(oldPlayerId, newPlayerId, hullNumber)
    if (result.success) {
      toast.success(`${hullNumber} 已更迭`, { duration: 1500 })
      // 本地更新：旧持有人变 [旧]，新持有人获得舷号
      setMembers(prev => prev.map(m => {
        if (m.player_id === oldPlayerId) return { ...m, hull_number: `[旧]${hullNumber}` }
        if (m.player_id === newPlayerId) return { ...m, hull_number: hullNumber, hull_date: new Date().toISOString() }
        return m
      }))
      setSelectedSeat(null)
    } else {
      toast.error(`更迭失败: ${result.error}`)
    }
    setConfirmingTransfer(null)
    setTransferringHull(null)
    setTransferSearchQuery('')
  }

  // ========== 黑名单操作 ==========
  const handleAddBlacklistMember = (playerId) => {
    setAddSearchQuery('')
    setShowAddDropdown(false)
    setConfirmingBlacklist(playerId)
    setBlacklistNote('')
    const member = members.find(m => m.player_id === playerId)
    setBlacklistQQ(member?.qq_id ? String(member.qq_id) : '')
    setBlacklistQQReadonly(!!member?.qq_id)
    // 退群时间：优先已有 qq_left_at，其次用 leave_date
    const existingLeftAt = member?.qq_left_at ? member.qq_left_at.slice(0, 10) : ''
    const fallbackDate = member?.leave_date ? member.leave_date.slice(0, 10) : ''
    setBlacklistLeftAt(existingLeftAt || fallbackDate)
  }

  const handleConfirmBlacklist = async () => {
    if (!confirmingBlacklist) return
    const qqTrimmed = blacklistQQ.trim()
    const leftAtValue = blacklistLeftAt.trim() || null

    // 1. 手动输入了 QQ 且原来没绑定 → 插入绑定
    if (qqTrimmed && !blacklistQQReadonly) {
      const bindResult = await manualBindQQ(confirmingBlacklist, Number(qqTrimmed), leftAtValue)
      if (!bindResult.success) {
        toast.error(`QQ绑定失败: ${bindResult.error}`)
        return
      }
      setMembers(prev => prev.map(m =>
        m.player_id === confirmingBlacklist
          ? { ...m, qq_id: Number(qqTrimmed), qq_nickname: null, qq_left_at: leftAtValue }
          : m
      ))
    }
    // 2. 已绑定 QQ，但修改了退群时间 → 更新
    if (qqTrimmed && blacklistQQReadonly) {
      const member = members.find(m => m.player_id === confirmingBlacklist)
      const existingLeftAt = member?.qq_left_at ? member.qq_left_at.slice(0, 10) : ''
      if (leftAtValue !== existingLeftAt) {
        await updateQQLeftAt(Number(qqTrimmed), leftAtValue)
        setMembers(prev => prev.map(m =>
          m.player_id === confirmingBlacklist
            ? { ...m, qq_left_at: leftAtValue }
            : m
        ))
      }
    }

    // 3. 设置黑名单
    const result = await setMemberBlacklist(confirmingBlacklist, true, blacklistNote || null)
    if (result.success) {
      toast.success('已加入黑名单', { duration: 1500 })
      setMembers(prev => prev.map(m =>
        m.player_id === confirmingBlacklist
          ? { ...m, is_blacklisted: true, blacklist_date: new Date().toISOString().slice(0, 10), blacklist_note: blacklistNote || null }
          : m
      ))
    } else {
      toast.error(`操作失败: ${result.error}`)
    }
    setConfirmingBlacklist(null)
    setBlacklistNote('')
    setBlacklistQQ('')
    setBlacklistLeftAt('')
  }

  const handleDeleteBlacklist = async (playerId) => {
    const result = await setMemberBlacklist(playerId, false, null)
    if (result.success) {
      toast.success('已移出黑名单', { duration: 1500 })
      setMembers(prev => prev.map(m =>
        m.player_id === playerId
          ? { ...m, is_blacklisted: false, blacklist_date: null, blacklist_note: null }
          : m
      ))
    } else {
      toast.error(`操作失败: ${result.error}`)
    }
  }

  // ========== 外部黑名单操作 ==========
  const handleOpenElseForm = (mode, entry) => {
    setElseFormMode(mode)
    if (mode === 'add') {
      setElseFormData({ name: '', player_id: '', qq_number: '', note: '' })
    } else {
      setElseFormData({
        name: entry.name || '',
        player_id: entry.player_id || '',
        qq_number: entry.qq_number || '',
        note: entry.note || ''
      })
    }
  }

  const handleSaveElse = async () => {
    if (!elseFormData.name.trim()) { toast.error('名字不能为空'); return }
    if (elseFormMode === 'add') {
      const result = await addBlacklistElse({
        name: elseFormData.name.trim(),
        player_id: elseFormData.player_id.trim() || null,
        qq_number: elseFormData.qq_number.trim() || null,
        note: elseFormData.note.trim() || null
      })
      if (result.success) {
        toast.success('已添加', { duration: 1500 })
        setElseBlacklist(prev => [result.data, ...prev])
        setElseFormMode(null)
      } else {
        toast.error(`添加失败: ${result.error}`)
      }
    } else {
      const result = await updateBlacklistElse(elseFormMode, {
        name: elseFormData.name.trim(),
        player_id: elseFormData.player_id.trim() || null,
        qq_number: elseFormData.qq_number.trim() || null,
        note: elseFormData.note.trim() || null
      })
      if (result.success) {
        toast.success('已更新', { duration: 1500 })
        setElseBlacklist(prev => prev.map(e =>
          e.id === elseFormMode ? { ...e, ...elseFormData, player_id: elseFormData.player_id || null, qq_number: elseFormData.qq_number || null, note: elseFormData.note || null } : e
        ))
        setElseFormMode(null)
      } else {
        toast.error(`更新失败: ${result.error}`)
      }
    }
  }

  const handleDeleteElse = async (id) => {
    const result = await deleteBlacklistElse(id)
    if (result.success) {
      toast.success('已删除', { duration: 1500 })
      setElseBlacklist(prev => prev.filter(e => e.id !== id))
    } else {
      toast.error(`删除失败: ${result.error}`)
    }
  }

  // 保存备注（内联编辑）
  const handleSaveNote = async () => {
    if (!editingNote) return
    const note = editingNote.value.trim() || null
    if (editingNote.type === 'member') {
      const result = await setMemberBlacklist(editingNote.id, true, note)
      if (result.success) {
        setMembers(prev => prev.map(m => m.player_id === editingNote.id ? { ...m, blacklist_note: note } : m))
      } else {
        toast.error(`保存失败: ${result.error}`)
      }
    } else {
      const existing = elseBlacklist.find(e => e.id === editingNote.id)
      if (!existing) return
      const result = await updateBlacklistElse(editingNote.id, {
        name: existing.name,
        player_id: existing.player_id,
        qq_number: existing.qq_number,
        note
      })
      if (result.success) {
        setElseBlacklist(prev => prev.map(e => e.id === editingNote.id ? { ...e, note } : e))
      } else {
        toast.error(`保存失败: ${result.error}`)
      }
    }
    setEditingNote(null)
  }

  const handleSaveBlacklistDate = async () => {
    if (!editingBlacklistDate) return
    const date = editingBlacklistDate.value || null
    if (editingBlacklistDate.type === 'member') {
      const result = await setMemberBlacklistDate(editingBlacklistDate.id, date)
      if (result.success) {
        setMembers(prev => prev.map(m => m.player_id === editingBlacklistDate.id ? { ...m, blacklist_date: date } : m))
        toast.success(date ? '拉黑时间已设置' : '拉黑时间已清除', { duration: 1500 })
      } else {
        toast.error(`保存失败: ${result.error}`)
      }
    } else {
      const existing = elseBlacklist.find(e => e.id === editingBlacklistDate.id)
      if (!existing) return
      const result = await updateBlacklistElse(editingBlacklistDate.id, {
        name: existing.name,
        player_id: existing.player_id,
        qq_number: existing.qq_number,
        note: existing.note,
        blacklist_date: date
      })
      if (result.success) {
        setElseBlacklist(prev => prev.map(e => e.id === editingBlacklistDate.id ? { ...e, blacklist_date: date } : e))
        toast.success(date ? '拉黑时间已设置' : '拉黑时间已清除', { duration: 1500 })
      } else {
        toast.error(`保存失败: ${result.error}`)
      }
    }
    setEditingBlacklistDate(null)
  }

  // ========== 批量导入 ==========
  const VALID_ID_RE = /^[0-9A-Z]{10,20}$/

  // 列字母转 0-based 索引（支持 A-Z, AA-AZ...）
  const colLetterToIndex = (letter) => {
    const s = letter.trim().toUpperCase()
    let idx = 0
    for (let i = 0; i < s.length; i++) {
      idx = idx * 26 + (s.charCodeAt(i) - 64)
    }
    return idx - 1
  }

  const handleImportFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        parseImportRows(raw)
      } catch {
        toast.error('解析 Excel 失败，请检查文件格式')
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const parseImportRows = (raw) => {
    const idIdx   = colLetterToIndex(importCols.id)
    const nameIdx = colLetterToIndex(importCols.name)
    const qqIdx   = colLetterToIndex(importCols.qq)
    const noteIdx = colLetterToIndex(importCols.note)

    const rows = []
    const excluded = []
    for (let rowIdx = 0; rowIdx < raw.length; rowIdx++) {
      const row = raw[rowIdx]
      const id   = String(row[idIdx] || '').trim().toUpperCase()
      const name = String(row[nameIdx] || '').trim()
      const qq   = String(row[qqIdx] || '').trim()
      const note = String(row[noteIdx] || '').trim()
      const validId = VALID_ID_RE.test(id)

      if (!validId && !qq) {
        // 只记录有内容的行，忽略完全空行
        if (id || name || qq || note) {
          const reasons = []
          if (id && !validId) reasons.push(`ID格式无效"${id}"`)
          if (!id) reasons.push('ID为空')
          if (!qq) reasons.push('QQ为空')
          excluded.push({ rowNum: rowIdx + 1, id, name, qq, note, reason: reasons.join('，') })
        }
        continue
      }
      rows.push({
        player_id: validId ? id : null,
        name,
        qq_number: qq,
        note
      })
    }
    setImportPreview({ rows, excluded })
  }

  // 重新解析（列号变更后手动触发）
  const handleReparse = () => {
    if (!importFileRef.current?.files?.[0]) { toast('请先选择文件'); return }
    const file = importFileRef.current.files[0]
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        parseImportRows(raw)
      } catch {
        toast.error('解析失败')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleConfirmImport = async () => {
    if (!importPreview?.rows?.length) return
    setImporting(true)

    // 建立快速查找 map
    const memberMap = new Map(members.map(m => [m.player_id, m]))
    const elseMap   = new Map(elseBlacklist.map(e => [e.player_id, e]))

    let successCount = 0
    let errorCount   = 0
    const newElseEntries  = []
    const updatedMembers  = []
    const updatedElse     = []

    for (const row of importPreview.rows) {
      try {
        if (row.player_id && memberMap.has(row.player_id)) {
          // 在队/历史成员 → 更新 horizn_members 黑名单字段
          const member = memberMap.get(row.player_id)
          const result = await setMemberBlacklist(row.player_id, true, row.note || null)
          if (result.success) {
            // 拉黑时间优先用离队时间
            const blacklistDate = member.leave_date
              ? member.leave_date.slice(0, 10)
              : new Date().toISOString().slice(0, 10)
            if (member.leave_date) {
              await setMemberBlacklistDate(row.player_id, blacklistDate)
            }
            updatedMembers.push({ player_id: row.player_id, note: row.note, blacklist_date: blacklistDate })
            successCount++
          } else {
            errorCount++
          }
        } else if (row.player_id && elseMap.has(row.player_id)) {
          // 已在外部黑名单 → 覆盖更新
          const existing = elseMap.get(row.player_id)
          const result = await updateBlacklistElse(existing.id, {
            name:      row.name || existing.name,
            player_id: row.player_id,
            qq_number: row.qq_number || existing.qq_number,
            note:      row.note || existing.note
          })
          if (result.success) {
            updatedElse.push({ id: existing.id, ...row, name: row.name || existing.name, qq_number: row.qq_number || existing.qq_number, note: row.note || existing.note })
            successCount++
          } else {
            errorCount++
          }
        } else {
          // ID 为空(仅QQ) 或 不在任何表 → 新增外部黑名单
          const result = await addBlacklistElse({
            name:      row.name || (row.qq_number ? `QQ:${row.qq_number}` : row.player_id),
            player_id: row.player_id || null,
            qq_number: row.qq_number || null,
            note:      row.note || null
          })
          if (result.success) {
            newElseEntries.push(result.data)
            successCount++
          } else {
            errorCount++
          }
        }
      } catch {
        errorCount++
      }
    }

    // 批量更新本地 state
    if (updatedMembers.length) {
      setMembers(prev => prev.map(m => {
        const upd = updatedMembers.find(u => u.player_id === m.player_id)
        if (!upd) return m
        return { ...m, is_blacklisted: true, blacklist_date: upd.blacklist_date, blacklist_note: upd.note || null }
      }))
    }
    if (updatedElse.length || newElseEntries.length) {
      setElseBlacklist(prev => {
        let next = prev.map(e => {
          const upd = updatedElse.find(u => u.id === e.id)
          return upd ? { ...e, ...upd } : e
        })
        next = [...newElseEntries, ...next]
        return next
      })
    }

    setImporting(false)
    setShowImportModal(false)
    setImportPreview(null)
    toast.success(`导入完成：成功 ${successCount} 条${errorCount ? `，失败 ${errorCount} 条` : ''}`, { duration: 3000 })
  }

  const confirmingMemberName = useMemo(() => {
    if (!confirmingBlacklist) return ''
    const m = members.find(mm => mm.player_id === confirmingBlacklist)
    return m?.primary_name || confirmingBlacklist
  }, [confirmingBlacklist, members])

  if (!show) return null

  const currentList = activeTab === 'hull' ? hullMembers : blacklistMembers
  const handleAddSelect = activeTab === 'hull' ? handleAddHullMember : handleAddBlacklistMember
  const gradientColor = activeTab === 'hull'
    ? 'from-blue-500 via-cyan-500 to-teal-500'
    : 'from-red-500 via-orange-500 to-yellow-500'

  // ========== 座位图渲染 ==========
  const renderSeatGrid = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
        </div>
      )
    }

    return (
      <div className="p-2 space-y-3">
        {/* 选中座位信息卡 */}
        {selectedSeat !== null && (
          <div className="bg-gray-900/80 rounded-lg border border-gray-600/50 p-2.5 animate-in fade-in">
            {selectedSeatMember ? (
              /* ===== 当前持有者 ===== */
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white font-mono tracking-wider">
                      No.{String(selectedSeat).padStart(3, '0')}
                    </span>
                    <span className="text-sm text-white">{selectedSeatMember.primary_name}</span>
                    {!selectedSeatMember.active && (
                      <span className="text-[11px] text-red-400">
                        已离队{selectedSeatMember.leave_date ? ` ${formatDate(selectedSeatMember.leave_date)}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(selectedSeatMember.player_id, ' ID')}
                      className="p-1 text-gray-400 hover:text-blue-400 hover:bg-blue-500/20 rounded transition-all"
                      title="复制 ID"
                    >
                      <CopyIcon />
                    </button>
                    <button
                      onClick={() => handleRequestDeleteHull(selectedSeatMember.player_id)}
                      className="text-xs px-1.5 py-0.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                    >
                      删除舷号
                    </button>
                    <button
                      onClick={() => handleStartTransfer(selectedSeatMember.player_id)}
                      className="text-xs px-1.5 py-0.5 text-amber-400 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 rounded transition-all"
                    >
                      更迭舷号
                    </button>
                    <button
                      onClick={() => setSelectedSeat(null)}
                      className="text-gray-500 hover:text-white p-0.5 rounded transition-all"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                  <span className="font-mono">{selectedSeatMember.player_id}</span>
                  <span className="text-gray-600">|</span>
                  <button
                    onClick={() => handleOpenDatePicker(selectedSeatMember.player_id, selectedSeatMember.hull_date)}
                    className="inline-flex items-center gap-0.5 hover:text-cyan-300 transition-colors group/date"
                    title="点击修改授予日期"
                  >
                    <span>授予</span>
                    <span className="text-cyan-400/80 group-hover/date:text-cyan-300 border-b border-dashed border-cyan-500/30 group-hover/date:border-cyan-400/60">
                      {selectedSeatMember.hull_date ? formatDate(selectedSeatMember.hull_date) : '未设置'}
                    </span>
                    <svg className="w-2.5 h-2.5 text-gray-600 group-hover/date:text-cyan-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  {selectedSeatMember.qq_id && (
                    <>
                      <span className="text-gray-600">|</span>
                      <span className="inline-flex items-center gap-0.5">
                        <QQIcon />
                        {selectedSeatMember.qq_nickname || 'QQ用户'}
                      </span>
                      <button
                        onClick={() => handleCopy(selectedSeatMember.qq_id, ' QQ')}
                        className="p-0.5 text-gray-500 hover:text-green-400 rounded transition-all"
                      >
                        <CopyIcon />
                      </button>
                      <span className="font-mono">{selectedSeatMember.qq_id}</span>
                    </>
                  )}
                  {selectedSeatMember.qq_join_time && (
                    <>
                      <span className="text-gray-600">|</span>
                      <span>入群 {formatDate(selectedSeatMember.qq_join_time)}</span>
                    </>
                  )}
                </div>
                {/* 旧持有者列表 */}
                {selectedSeatEntry?.legacy?.length > 0 && (
                  <div className="mt-1 pt-1 border-t border-gray-700/30">
                    <span className="text-[10px] text-amber-400/60 mb-0.5 block">旧持有者：</span>
                    {selectedSeatEntry.legacy.map(lm => (
                      <div key={lm.player_id} className="flex items-center gap-2 text-[10px] text-gray-500 pl-1">
                        <span className="text-gray-400">{lm.primary_name}</span>
                        <span className="font-mono">{lm.player_id}</span>
                        {!lm.active && <span className="text-red-400/50">已离队</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ===== 空位（或仅旧持有者）：搜索分配 ===== */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">
                    <span className="font-mono font-bold text-gray-300">No.{String(selectedSeat).padStart(3, '0')}</span>
                    {selectedSeatEntry?.legacy?.length > 0 ? ' — 空位（有旧持有者）' : ' — 空位'}
                  </span>
                  <button
                    onClick={() => { setSelectedSeat(null); setSeatSearchQuery('') }}
                    className="text-gray-500 hover:text-white p-0.5 rounded transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {/* 搜索成员分配到此位 */}
                <div className="relative">
                  <div className="flex items-center gap-1.5 bg-gray-800/80 rounded border border-gray-600/50 px-2 py-1.5">
                    <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      autoFocus
                      value={seatSearchQuery}
                      onChange={(e) => setSeatSearchQuery(e.target.value)}
                      placeholder="搜索成员分配到此位..."
                      className="flex-1 bg-transparent text-white text-xs outline-none placeholder-gray-500"
                    />
                  </div>
                  {seatSearchQuery.trim() && (
                    <div className="mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-[160px] overflow-y-auto custom-scrollbar">
                      {seatSearchSuggestions.length === 0 ? (
                        <div className="px-3 py-2 text-[11px] text-gray-500 text-center">未找到匹配成员</div>
                      ) : (
                        seatSearchSuggestions.map((m) => (
                          <button
                            key={m.player_id}
                            onClick={() => handleSeatAssign(m.player_id)}
                            className="w-full px-2 py-1.5 text-left hover:bg-gray-700 transition-colors flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs text-white truncate">{m.primary_name || m.player_id}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{m.player_id}</span>
                            </div>
                            {!m.active && <span className="text-[9px] text-red-400/70 flex-shrink-0">已离队</span>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {/* 旧持有者列表 */}
                {selectedSeatEntry?.legacy?.length > 0 && (
                  <div className="pt-1 border-t border-gray-700/30">
                    <span className="text-[10px] text-amber-400/60 mb-0.5 block">旧持有者：</span>
                    {selectedSeatEntry.legacy.map(lm => (
                      <div key={lm.player_id} className="flex items-center gap-2 text-[10px] text-gray-500 pl-1">
                        <span className="text-gray-400">{lm.primary_name}</span>
                        <span className="font-mono">{lm.player_id}</span>
                        {!lm.active && <span className="text-red-400/50">已离队</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 分区座位 */}
        {HULL_SECTIONS.map((section) => {
          const [start, end] = section.range
          const rows = getSectionRows(start, end, hullOccupancyMap)
          const sectionOccupied = rows.reduce((sum, row) => {
            for (let i = row.cellStart; i <= row.cellEnd; i++) {
              const e = hullOccupancyMap.get(i)
              if (e?.current) sum++
            }
            return sum
          }, 0)

          return (
            <div key={section.id} className="space-y-1">
              {/* 分区标题 */}
              <div className={`flex items-center justify-between px-2 py-1.5 rounded-md bg-gradient-to-r ${section.headerBg} border ${section.headerBorder}`}>
                <div className="flex items-center gap-1.5">
                  {section.icon}
                  <span className="text-xs font-bold text-white">{section.label}</span>
                  <span className="text-[11px] text-gray-500 font-mono tracking-wide hidden sm:inline">{section.sub}</span>
                </div>
                <span className="text-xs text-gray-400">{sectionOccupied} / {end - start + 1}</span>
              </div>

              {/* 座位网格 */}
              {rows.length === 0 ? (
                <div className="text-center py-2 text-xs text-gray-600">暂无占位</div>
              ) : (
                <div className="space-y-1">
                  {rows.map(({ rowNum, cellStart, cellEnd }) => {
                    // 补齐行首空位对齐到10格
                    const cells = []
                    for (let i = cellStart; i <= cellEnd; i++) {
                      const entry = hullOccupancyMap.get(i)
                      cells.push({ num: i, entry })
                    }
                    return (
                      <div key={rowNum} className="flex gap-1">
                        {cells.map((cell) => {
                          const entry = cell.entry
                          const currentHolder = entry?.current
                          const legacyCount = entry?.legacy?.length || 0
                          const isOccupied = !!currentHolder || legacyCount > 0
                          const isLegacyOnly = !currentHolder && legacyCount > 0
                          const isLeft = currentHolder && !currentHolder.active
                          const isSelected = selectedSeat === cell.num
                          const numStr = String(cell.num).padStart(3, '0')
                          const titleName = currentHolder
                            ? `No.${numStr} — ${currentHolder.primary_name}${isLeft ? ' (已离队)' : ''}${legacyCount ? ` (+${legacyCount}旧)` : ''}`
                            : isLegacyOnly
                              ? `No.${numStr} — 仅旧持有者 ×${legacyCount}`
                              : `No.${numStr}`
                          return (
                            <button
                              key={cell.num}
                              onClick={() => { setSelectedSeat(isSelected ? null : cell.num); setSeatSearchQuery('') }}
                              className={`flex-1 h-8 rounded text-[11px] font-mono font-bold transition-all relative overflow-hidden ${
                                isSelected
                                  ? 'border-2 border-dashed border-white/80 bg-white/10 text-white z-10'
                                  : isLegacyOnly
                                    ? 'border border-dashed border-gray-500/40 bg-gray-700/15 text-gray-500 hover:brightness-125'
                                    : isLeft
                                      ? 'border border-gray-600/50 bg-gray-700/20 text-gray-500 line-through hover:brightness-125'
                                      : isOccupied
                                        ? 'border ' + section.bgOccupied + ' hover:brightness-125 hover:scale-105'
                                        : 'border ' + section.bgEmpty + ' hover:brightness-150'
                              }`}
                              title={titleName}
                            >
                              {/* 占位光效 */}
                              {isOccupied && !isLeft && !isLegacyOnly && (
                                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/[0.06] pointer-events-none" />
                              )}
                              <span className="relative">{numStr}</span>
                              {/* 旧持有者角标 */}
                              {legacyCount > 0 && (
                                <span className="absolute top-0 right-0 text-[7px] leading-none text-amber-400/80 bg-gray-900/60 rounded-bl px-0.5">
                                  {legacyCount}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* 图例 */}
        <div className="flex items-center justify-center gap-3 pt-1 pb-0.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-gray-500/30 border border-gray-500/50"></div>
            <span className="text-[11px] text-gray-500">已占位</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-gray-700/20 border border-gray-600/50">
              <div className="w-full h-1/2 mt-[5px] border-t border-gray-500/60"></div>
            </div>
            <span className="text-[11px] text-gray-500">已离队</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-gray-700/15 border border-dashed border-gray-500/40"></div>
            <span className="text-[11px] text-gray-500">仅[旧]</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-gray-800/50 border border-gray-700/30"></div>
            <span className="text-[11px] text-gray-500">空位</span>
          </div>
        </div>
      </div>
    )
  }

  // ========== 列表渲染 ==========
  const renderList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
        </div>
      )
    }
    if (currentList.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 text-xs">
          {activeTab === 'hull' ? '暂无舷号记录，搜索成员添加' : '暂无黑名单记录，搜索成员添加'}
        </div>
      )
    }
    return (
      <div className="divide-y divide-gray-700/30">
        {currentList.map((m, index) => {
          const monthBg = activeTab === 'hull' && hullSort === 'date'
            ? (hullMonthColorMap.get(m.player_id) === 1 ? 'bg-gray-800/40' : 'bg-gray-900/20')
            : ''
          let monthLabel = null
          if (activeTab === 'hull' && hullSort === 'date') {
            const curMonth = m.qq_join_time
              ? `${new Date(m.qq_join_time).getFullYear()}年${new Date(m.qq_join_time).getMonth() + 1}月`
              : '未知入群时间'
            const prevM = index > 0 ? currentList[index - 1] : null
            const prevMonth = prevM?.qq_join_time
              ? `${new Date(prevM.qq_join_time).getFullYear()}年${new Date(prevM.qq_join_time).getMonth() + 1}月`
              : '未知入群时间'
            if (index === 0 || curMonth !== prevMonth) {
              monthLabel = curMonth
            }
          }
          return (
            <div key={m.player_id}>
              {monthLabel && (
                <div className="px-2 py-1 bg-gray-700/20 border-b border-gray-700/30">
                  <span className="text-[10px] text-gray-400 font-medium">{monthLabel} 入群</span>
                </div>
              )}
              <div className={`px-2 py-1.5 hover:bg-gray-700/40 transition-colors group ${!m.active && activeTab !== 'blacklist' ? 'opacity-60' : ''} ${monthBg}`}>
                {/* 主行 */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-[10px] text-gray-600 w-4 flex-shrink-0">{index + 1}</span>
                    <span className={`text-xs truncate ${activeTab === 'blacklist' && m.active ? 'text-red-400 font-medium' : 'text-white'}`}>
                      {m.primary_name || m.player_id}
                    </span>
                    {activeTab === 'blacklist' && m.active && (
                      <span className="text-[9px] text-red-500/80 flex-shrink-0 font-medium">在队</span>
                    )}
                    {!m.active && (
                      <span className="text-[9px] text-red-400/70 flex-shrink-0">
                        已离队{m.leave_date ? ` ${formatDate(m.leave_date)}` : ''}
                      </span>
                    )}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => handleCopy(m.player_id, ' ID')}
                        className="p-0.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/20 rounded transition-all"
                        title="复制 ID"
                      >
                        <CopyIcon />
                      </button>
                      <span className="text-[10px] text-gray-500 font-mono hidden sm:inline">{m.player_id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {activeTab === 'hull' && (
                      editingHull?.playerId === m.player_id ? (
                        <div className="flex items-center gap-0.5">
                          <span className="text-gray-400 text-[10px]">No.</span>
                          <input
                            type="text"
                            autoFocus
                            maxLength={3}
                            value={editingHull.value}
                            onChange={(e) => setEditingHull({ ...editingHull, value: e.target.value.replace(/\D/g, '') })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                editingHull.value.trim() ? handleSaveHull(m.player_id, editingHull.value) : cancelPendingHull(m.player_id)
                              }
                              if (e.key === 'Escape') cancelPendingHull(m.player_id)
                            }}
                            onBlur={() => editingHull.value.trim() ? handleSaveHull(m.player_id, editingHull.value) : cancelPendingHull(m.player_id)}
                            className="w-10 bg-gray-700 text-white text-xs text-center px-1 py-0.5 rounded border border-blue-500 outline-none"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (m.hull_number?.startsWith('[旧]')) return // 旧持有者不可编辑
                            const current = m.hull_number && m.hull_number !== '__pending__' ? m.hull_number.replace(/\D/g, '') : ''
                            setEditingHull({ playerId: m.player_id, value: current })
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                            m.hull_number?.startsWith('[旧]')
                              ? 'bg-amber-600/10 text-amber-500/70 cursor-default'
                              : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
                          }`}
                        >
                          {m.hull_number === '__pending__' ? '...' : m.hull_number}
                        </button>
                      )
                    )}
                    {activeTab === 'blacklist' && (
                      editingNote?.type === 'member' && editingNote?.id === m.player_id ? (
                        <input
                          autoFocus
                          type="text"
                          value={editingNote.value}
                          onChange={e => setEditingNote({ ...editingNote, value: e.target.value })}
                          onBlur={handleSaveNote}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveNote(); if (e.key === 'Escape') setEditingNote(null) }}
                          className="w-28 text-[10px] bg-gray-700 text-gray-200 px-1 py-0.5 rounded border border-orange-500/60 outline-none"
                          placeholder="输入备注…"
                        />
                      ) : (
                        <button
                          onClick={() => setEditingNote({ type: 'member', id: m.player_id, value: m.blacklist_note || '' })}
                          className="text-[10px] text-gray-400 max-w-[80px] truncate hover:text-orange-300 transition-colors border-b border-dashed border-transparent hover:border-orange-500/40"
                          title={m.blacklist_note || '点击添加备注'}
                        >
                          {m.blacklist_note || <span className="text-gray-600 italic">备注</span>}
                        </button>
                      )
                    )}
                    <button
                      onClick={() => activeTab === 'hull' ? handleRequestDeleteHull(m.player_id) : handleDeleteBlacklist(m.player_id)}
                      className="text-[10px] px-1 py-0.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                    >
                      {activeTab === 'hull' ? '删除' : '移除'}
                    </button>
                    {activeTab === 'hull' && m.hull_number && m.hull_number !== '__pending__' && !m.hull_number.startsWith('[旧]') && (
                      <button
                        onClick={() => handleStartTransfer(m.player_id)}
                        className="text-[10px] px-1.5 py-0.5 text-amber-400 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 rounded transition-all"
                      >
                        更迭
                      </button>
                    )}
                  </div>
                </div>
                {/* 副行 */}
                <div className="flex items-center gap-2 text-[10px] text-gray-500 pl-5 mt-0.5">
                  {m.qq_id ? (
                    <>
                      <span className="inline-flex items-center gap-0.5 text-gray-400">
                        <QQIcon />
                        {m.qq_nickname || 'QQ用户'}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleCopy(m.qq_id, ' QQ')}
                          className="p-0.5 text-gray-500 hover:text-green-400 hover:bg-green-500/20 rounded transition-all"
                          title="复制 QQ 号"
                        >
                          <CopyIcon />
                        </button>
                        <span className="font-mono">{m.qq_id}</span>
                      </div>
                      {m.qq_join_time && (
                        <>
                          <span className="text-gray-600">|</span>
                          <span>入群 <span className="text-gray-400">{formatDate(m.qq_join_time)}</span></span>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-600">未关联 QQ</span>
                  )}
                  {activeTab === 'hull' && (
                    <>
                      <span className="text-gray-600">|</span>
                      <button
                        onClick={() => handleOpenDatePicker(m.player_id, m.hull_date)}
                        className="inline-flex items-center gap-0.5 hover:text-cyan-300 transition-colors group/date"
                        title="点击修改授予日期"
                      >
                        <span>授予</span>
                        <span className="text-cyan-400/70 group-hover/date:text-cyan-300 border-b border-dashed border-cyan-500/20 group-hover/date:border-cyan-400/50">
                          {m.hull_date ? formatDate(m.hull_date) : '未设置'}
                        </span>
                        <svg className="w-2 h-2 text-gray-600 group-hover/date:text-cyan-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </>
                  )}
                  {activeTab === 'blacklist' && (
                    m.blacklist_date ? (
                      <>
                        <span className="text-gray-600">|</span>
                        <button
                          onClick={() => setEditingBlacklistDate({ type: 'member', id: m.player_id, value: m.blacklist_date })}
                          className="inline-flex items-center gap-0.5 hover:text-red-300 transition-colors group/bd"
                          title="点击修改拉黑时间"
                        >
                          <span>拉黑 <span className="text-red-400/70 group-hover/bd:text-red-300 border-b border-dashed border-red-500/20 group-hover/bd:border-red-400/50">{formatDate(m.blacklist_date)}</span></span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditingBlacklistDate({ type: 'member', id: m.player_id, value: '' })}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400/60"
                        title="设置拉黑时间"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const showGrid = activeTab === 'hull' && hullView === 'grid'

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3">
        <div className={`bg-gray-800/95 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl w-full overflow-hidden flex flex-col max-h-[90vh] ${showGrid ? 'max-w-lg' : 'max-w-lg'} ${isMobile ? 'select-none' : ''}`}>
          {/* 顶部装饰条 */}
          <div className={`h-0.5 bg-gradient-to-r ${gradientColor}`}></div>

          {/* 标题栏 */}
          <div className="px-3 py-2.5 border-b border-gray-700/50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('hull')}
                className={`text-xs font-semibold flex items-center gap-1 transition-colors ${
                  activeTab === 'hull' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {/* 船舷/舰船图标 */}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l2.5-1.5C7 14.5 8.5 14 10 14h4c1.5 0 3 .5 4.5 1.5L21 17" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 17v-4a2 2 0 012-2h10a2 2 0 012 2v4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11V6" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6h6" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 20c2 0 3-1 5-1s3 1 5 1 3-1 5-1 3 1 5 1" />
                </svg>
                舷号({hullMembers.length})
              </button>
              <span className="text-gray-600">|</span>
              <button
                onClick={() => setActiveTab('blacklist')}
                className={`text-xs font-semibold flex items-center gap-1 transition-colors ${
                  activeTab === 'blacklist' ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                黑名单({blacklistMembers.length + elseBlacklist.length})
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              {/* 舷号视图切换 */}
              {activeTab === 'hull' && (
                <div className="flex bg-gray-900/50 rounded p-0.5 border border-gray-700/50">
                  <button
                    onClick={() => { setHullView('grid'); setSelectedSeat(null) }}
                    className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-all ${
                      hullView === 'grid' ? 'bg-blue-600/30 text-blue-400' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    {!isMobile && '座位图'}
                  </button>
                  <button
                    onClick={() => setHullView('list')}
                    className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-all ${
                      hullView === 'list' ? 'bg-blue-600/30 text-blue-400' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    {!isMobile && '列表'}
                  </button>
                </div>
              )}
              {/* 列表排序切换 */}
              {activeTab === 'hull' && hullView === 'list' && (
                <button
                  onClick={() => setHullSort(prev => prev === 'date' ? 'number' : 'date')}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-gray-400 hover:text-white bg-gray-900/50 border border-gray-700/50 rounded transition-all"
                  title={hullSort === 'date' ? '当前：按入群时间降序，点击切换为按序号升序' : '当前：按序号升序，点击切换为按入群时间降序'}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {hullSort === 'date'
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4 4m0 0l4-4m-4-4v12" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    }
                  </svg>
                  {!isMobile && (hullSort === 'date' ? '入群时间' : '序号')}
                </button>
              )}
              <button
                onClick={loadMembers}
                disabled={loading}
                className="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                title="刷新"
              >
                {loading
                  ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  : isMobile
                    ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    : '刷新'
                }
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white hover:bg-gray-700/50 rounded p-1 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 批量导入按钮（黑名单 tab） */}
          {activeTab === 'blacklist' && (
            <div className="px-3 pt-2 flex-shrink-0">
              <button
                onClick={() => { setShowImportModal(true); setImportPreview(null) }}
                className="flex items-center gap-1 text-[10px] px-2 py-1 text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded transition-all"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                批量导入 Excel
              </button>
            </div>
          )}

          {/* 搜索添加（仅列表视图或黑名单标签页） */}
          {!showGrid && <div className="px-3 py-2 border-b border-gray-700/50 flex-shrink-0" ref={addContainerRef}>
            <div className="relative">
              <div className="flex items-center gap-1.5 bg-gray-900/50 rounded border border-gray-700/50 px-2 py-1.5">
                <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <input
                  type="text"
                  value={addSearchQuery}
                  onChange={(e) => { setAddSearchQuery(e.target.value); setShowAddDropdown(true) }}
                  onFocus={() => addSearchQuery && setShowAddDropdown(true)}
                  placeholder={activeTab === 'hull' ? '搜索成员添加舷号...' : '搜索成员加入黑名单...'}
                  className="flex-1 bg-transparent text-white text-xs outline-none placeholder-gray-500"
                />
              </div>
              {showAddDropdown && addSearchQuery.trim() && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-30 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {addSuggestions.length === 0 ? (
                    <div className="px-3 py-2 text-[10px] text-gray-500 text-center">未找到匹配成员</div>
                  ) : (
                    addSuggestions.map((m) => (
                      <button
                        key={m.player_id}
                        onClick={() => handleAddSelect(m.player_id)}
                        className="w-full px-2 py-1.5 text-left hover:bg-gray-700 transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs text-white truncate">{m.primary_name || m.player_id}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{m.player_id}</span>
                        </div>
                        {!m.active && <span className="text-[9px] text-red-400/70 flex-shrink-0">已离队</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>}

          {/* 内容区 */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {showGrid ? (
              renderSeatGrid()
            ) : (
              <>
                <div className="bg-gray-900/50 m-2 rounded border border-gray-700/50 overflow-hidden">
                  {renderList()}
                </div>
                {/* 外部黑名单 */}
                {activeTab === 'blacklist' && (
                  <div className="m-2 mt-0 rounded border border-red-900/30 overflow-hidden">
                    {/* 区块标题 */}
                    <div className="flex items-center justify-between px-2 py-1.5 bg-red-950/20 border-b border-red-900/30">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-red-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                        <span className="text-[11px] text-red-400/70 font-medium">外部黑名单</span>
                        <span className="text-[10px] text-gray-600">不在历史成员中的记录</span>
                        {loadingElse && <span className="text-[10px] text-gray-500">...</span>}
                      </div>
                      <button
                        onClick={() => handleOpenElseForm('add', null)}
                        className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded transition-all"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        添加
                      </button>
                    </div>
                    {/* 列表 */}
                    {elseBlacklist.length === 0 && !loadingElse ? (
                      <div className="px-3 py-4 text-center text-[11px] text-gray-600">暂无外部黑名单记录</div>
                    ) : (
                      <div className="divide-y divide-red-900/20">
                        {elseBlacklist.map((entry) => (
                          <div key={entry.id} className="px-2 py-1.5 hover:bg-red-950/10 transition-colors group">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span className="text-xs text-white">{entry.name}</span>
                                {entry.player_id && (
                                  <span className="text-[10px] text-gray-500 font-mono">{entry.player_id}</span>
                                )}
                                {entry.qq_number && (
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      onClick={() => handleCopy(entry.qq_number, ' QQ')}
                                      className="p-0.5 text-gray-600 hover:text-green-400 rounded transition-all"
                                    >
                                      <CopyIcon />
                                    </button>
                                    <span className="text-[10px] text-gray-500 font-mono">{entry.qq_number}</span>
                                  </div>
                                )}
                                {editingNote?.type === 'else' && editingNote?.id === entry.id ? (
                                  <input
                                    autoFocus
                                    type="text"
                                    value={editingNote.value}
                                    onChange={e => setEditingNote({ ...editingNote, value: e.target.value })}
                                    onBlur={handleSaveNote}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveNote(); if (e.key === 'Escape') setEditingNote(null) }}
                                    className="w-28 text-[10px] bg-gray-700 text-gray-200 px-1 py-0.5 rounded border border-orange-500/60 outline-none"
                                    placeholder="输入备注…"
                                  />
                                ) : (
                                  <button
                                    onClick={() => setEditingNote({ type: 'else', id: entry.id, value: entry.note || '' })}
                                    className="text-[10px] text-gray-400 max-w-[100px] truncate hover:text-orange-300 transition-colors border-b border-dashed border-transparent hover:border-orange-500/40"
                                    title={entry.note || '点击添加备注'}
                                  >
                                    {entry.note || <span className="text-gray-600 italic">备注</span>}
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {entry.blacklist_date ? (
                                  <button
                                    onClick={() => setEditingBlacklistDate({ type: 'else', id: entry.id, value: entry.blacklist_date.slice(0, 10) })}
                                    className="text-[10px] text-red-400/50 hover:text-red-300 transition-colors border-b border-dashed border-transparent hover:border-red-400/40"
                                    title="点击修改拉黑时间"
                                  >
                                    {formatDate(entry.blacklist_date)}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setEditingBlacklistDate({ type: 'else', id: entry.id, value: '' })}
                                    className="text-gray-700 hover:text-red-400/60 transition-colors"
                                    title="设置拉黑时间"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenElseForm(entry.id, entry)}
                                  className="text-[10px] px-1 py-0.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all"
                                >
                                  编辑
                                </button>
                                <button
                                  onClick={() => handleDeleteElse(entry.id)}
                                  className="text-[10px] px-1 py-0.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                                >
                                  删除
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 底部 */}
          <div className="px-3 py-2 bg-gray-900/30 border-t border-gray-700/50 flex gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600 text-white text-xs font-medium rounded transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>

      {/* 舷号添加确认弹窗 */}
      {confirmingHullAdd && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => { setConfirmingHullAdd(null); cancelPendingHull(confirmingHullAdd.playerId) }} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="bg-gray-800 rounded-lg shadow-xl border border-gray-600 w-full max-w-sm p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-medium text-white mb-2">分配舷号</h3>
              <p className="text-xs text-gray-400 mb-3">
                确认将 <span className="text-blue-400 font-bold font-mono">{confirmingHullAdd.hullNumber}</span> 分配给{' '}
                <span className="text-white font-medium">{confirmingHullAdd.memberName}</span>？
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setConfirmingHullAdd(null); cancelPendingHull(confirmingHullAdd.playerId) }}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmHullAdd}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
                >
                  确认分配
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 舷号删除确认弹窗 */}
      {confirmingHullDelete && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setConfirmingHullDelete(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="bg-gray-800 rounded-lg shadow-xl border border-gray-600 w-full max-w-sm p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-medium text-white mb-2">删除舷号</h3>
              <p className="text-xs text-gray-400 mb-3">
                确认删除 <span className="text-white font-medium">{confirmingHullDelete.memberName}</span> 的舷号{' '}
                <span className="text-red-400 font-bold font-mono">{confirmingHullDelete.hullNumber}</span>？
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmingHullDelete(null)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmHullDelete}
                  className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-500 transition-colors"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 黑名单确认弹窗 */}
      {confirmingBlacklist && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setConfirmingBlacklist(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="bg-gray-800 rounded-lg shadow-xl border border-gray-600 w-full max-w-sm p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-medium text-white mb-2">加入黑名单</h3>
              <p className="text-xs text-gray-400 mb-3">
                确认将 <span className="text-white font-medium">{confirmingMemberName}</span> 加入黑名单？
              </p>
              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  value={blacklistQQ}
                  onChange={(e) => { if (!blacklistQQReadonly) setBlacklistQQ(e.target.value.replace(/\D/g, '')) }}
                  readOnly={blacklistQQReadonly}
                  placeholder="QQ号（可选）"
                  className={`w-full text-xs px-3 py-2 rounded border outline-none placeholder-gray-500 ${
                    blacklistQQReadonly
                      ? 'bg-gray-700/60 text-gray-400 border-green-600/40 cursor-default'
                      : 'bg-gray-700 text-white border-gray-600 focus:border-red-500'
                  }`}
                  autoFocus={!blacklistQQReadonly}
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 whitespace-nowrap">退群时间</label>
                  <input
                    type="date"
                    value={blacklistLeftAt}
                    onChange={(e) => setBlacklistLeftAt(e.target.value)}
                    className="flex-1 bg-gray-700 text-white text-xs px-3 py-2 rounded border border-gray-600 outline-none focus:border-red-500"
                  />
                </div>
                <input
                  type="text"
                  value={blacklistNote}
                  onChange={(e) => setBlacklistNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmBlacklist() }}
                  placeholder="备注原因（可选）"
                  className="w-full bg-gray-700 text-white text-xs px-3 py-2 rounded border border-gray-600 outline-none focus:border-red-500 placeholder-gray-500"
                  autoFocus={blacklistQQReadonly}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmingBlacklist(null)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmBlacklist}
                  className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-500 transition-colors"
                >
                  确认加入
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 外部黑名单表单弹窗 */}
      {elseFormMode !== null && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setElseFormMode(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="bg-gray-800 rounded-lg shadow-xl border border-red-500/30 w-full max-w-sm p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-medium text-red-400 mb-3">
                {elseFormMode === 'add' ? '添加外部黑名单' : '编辑外部黑名单'}
              </h3>
              <div className="space-y-2 mb-4">
                <input
                  type="text"
                  autoFocus
                  value={elseFormData.name}
                  onChange={(e) => setElseFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="称呼 / 昵称（必填）"
                  className="w-full bg-gray-700 text-white text-xs px-3 py-2 rounded border border-gray-600 outline-none focus:border-red-500 placeholder-gray-500"
                />
                <input
                  type="text"
                  value={elseFormData.player_id}
                  onChange={(e) => setElseFormData(prev => ({ ...prev, player_id: e.target.value }))}
                  placeholder="游戏 ID（可选）"
                  className="w-full bg-gray-700 text-white text-xs px-3 py-2 rounded border border-gray-600 outline-none focus:border-red-500 placeholder-gray-500"
                />
                <input
                  type="text"
                  value={elseFormData.qq_number}
                  onChange={(e) => setElseFormData(prev => ({ ...prev, qq_number: e.target.value }))}
                  placeholder="QQ 号（可选）"
                  className="w-full bg-gray-700 text-white text-xs px-3 py-2 rounded border border-gray-600 outline-none focus:border-red-500 placeholder-gray-500"
                />
                <input
                  type="text"
                  value={elseFormData.note}
                  onChange={(e) => setElseFormData(prev => ({ ...prev, note: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveElse() }}
                  placeholder="备注原因（可选）"
                  className="w-full bg-gray-700 text-white text-xs px-3 py-2 rounded border border-gray-600 outline-none focus:border-red-500 placeholder-gray-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setElseFormMode(null)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveElse}
                  className="px-3 py-1.5 text-xs bg-red-700 text-white rounded hover:bg-red-600 transition-colors"
                >
                  {elseFormMode === 'add' ? '确认添加' : '保存修改'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 批量导入弹窗 */}
      {showImportModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => { if (!importing) setShowImportModal(false) }} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="bg-gray-800 rounded-lg shadow-xl border border-orange-500/30 w-full max-w-lg p-4 flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-medium text-orange-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                批量导入黑名单
              </h3>

              {/* 列号配置 */}
              <div className="mb-3">
                <p className="text-[11px] text-gray-400 mb-2">指定各字段对应的列（填字母，如 A、B、AA）：</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'id',   label: '游戏 ID *' },
                    { key: 'name', label: '成员名' },
                    { key: 'qq',   label: 'QQ 号' },
                    { key: 'note', label: '备注' }
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-[10px] text-gray-500 block mb-0.5">{label}</label>
                      <input
                        type="text"
                        value={importCols[key]}
                        onChange={(e) => setImportCols(prev => ({ ...prev, [key]: e.target.value.toUpperCase() }))}
                        maxLength={3}
                        className="w-full bg-gray-700 text-white text-xs text-center px-2 py-1 rounded border border-gray-600 outline-none focus:border-orange-500 uppercase"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-600 mt-1.5">
                  ID 符合格式（10-20位大写十六进制）或 QQ 号不为空的行会被处理，其余跳过。<br/>
                  在队/历史成员 → 更新黑名单字段；其余（含仅有QQ号的行）→ 写入外部黑名单表。
                </p>
              </div>

              {/* 文件选择 */}
              <div className="flex items-center gap-2 mb-3">
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImportFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => importFileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors border border-gray-600"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  选择文件 (.xlsx / .xls / .csv)
                </button>
                {importPreview && (
                  <button
                    onClick={handleReparse}
                    className="text-[11px] text-gray-400 hover:text-white underline transition-colors"
                  >
                    重新解析
                  </button>
                )}
              </div>

              {/* 预览 */}
              {importPreview && (
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] text-green-400">有效行 {importPreview.rows.length} 条</span>
                    {importPreview.excluded?.length > 0 && (
                      <span className="text-[11px] text-yellow-500">排除 {importPreview.excluded.length} 行</span>
                    )}
                  </div>
                  {importPreview.rows.length === 0 ? (
                    <p className="text-[11px] text-gray-500 py-3 text-center">未找到符合格式的 ID，请检查列号配置</p>
                  ) : (
                    <div className="overflow-y-auto custom-scrollbar border border-gray-700 rounded text-[10px]">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-gray-800 border-b border-gray-700">
                          <tr>
                            <th className="text-left px-2 py-1 text-gray-400 font-normal">游戏 ID</th>
                            <th className="text-left px-2 py-1 text-gray-400 font-normal">名字</th>
                            <th className="text-left px-2 py-1 text-gray-400 font-normal">QQ</th>
                            <th className="text-left px-2 py-1 text-gray-400 font-normal">备注</th>
                            <th className="text-left px-2 py-1 text-gray-400 font-normal">目标</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.rows.map((row, i) => {
                            const inMembers = row.player_id && members.some(m => m.player_id === row.player_id)
                            const inElse    = row.player_id && elseBlacklist.some(e => e.player_id === row.player_id)
                            const targetLabel = inMembers ? '成员黑名单' : inElse ? '外部(更新)' : '外部(新增)'
                            const targetColor = inMembers ? 'text-blue-400' : inElse ? 'text-yellow-400' : 'text-red-400'
                            return (
                              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                                <td className="px-2 py-1 font-mono text-gray-300">{row.player_id}</td>
                                <td className="px-2 py-1 text-white">{row.name || <span className="text-gray-600">-</span>}</td>
                                <td className="px-2 py-1 text-gray-400">{row.qq_number || <span className="text-gray-600">-</span>}</td>
                                <td className="px-2 py-1 text-gray-400 max-w-[80px] truncate">{row.note || <span className="text-gray-600">-</span>}</td>
                                <td className={`px-2 py-1 ${targetColor}`}>{targetLabel}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 被排除的行 */}
                  {importPreview.excluded?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[11px] text-yellow-500 mb-1">被排除的行（ID 无效且 QQ 为空）：</p>
                      <div className="overflow-y-auto custom-scrollbar border border-yellow-700/30 rounded text-[10px] max-h-[120px]">
                        <table className="w-full">
                          <thead className="sticky top-0 bg-gray-800 border-b border-gray-700">
                            <tr>
                              <th className="text-left px-2 py-1 text-gray-400 font-normal w-8">行</th>
                              <th className="text-left px-2 py-1 text-gray-400 font-normal">ID</th>
                              <th className="text-left px-2 py-1 text-gray-400 font-normal">名字</th>
                              <th className="text-left px-2 py-1 text-gray-400 font-normal">QQ</th>
                              <th className="text-left px-2 py-1 text-gray-400 font-normal">原因</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.excluded.map((row, i) => (
                              <tr key={i} className="border-b border-gray-700/30 bg-yellow-900/5">
                                <td className="px-2 py-1 text-gray-500">{row.rowNum}</td>
                                <td className="px-2 py-1 font-mono text-gray-500">{row.id || <span className="text-gray-700">-</span>}</td>
                                <td className="px-2 py-1 text-gray-500">{row.name || <span className="text-gray-700">-</span>}</td>
                                <td className="px-2 py-1 text-gray-500">{row.qq || <span className="text-gray-700">-</span>}</td>
                                <td className="px-2 py-1 text-yellow-600">{row.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-end gap-2 mt-3 flex-shrink-0">
                <button
                  onClick={() => { setShowImportModal(false); setImportPreview(null) }}
                  disabled={importing}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={!importPreview?.rows?.length || importing}
                  className="px-4 py-1.5 text-xs bg-orange-600 text-white rounded hover:bg-orange-500 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  {importing && <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />}
                  {importing ? '导入中...' : `确认导入 ${importPreview?.rows?.length || 0} 条`}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 更迭舷号搜索弹窗 */}
      {transferringHull && !confirmingTransfer && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => { setTransferringHull(null); setTransferSearchQuery('') }} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="bg-gray-800 rounded-lg shadow-xl border border-amber-500/40 w-full max-w-sm p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-medium text-amber-400 mb-1 flex items-center gap-2">
                更迭舷号
                <span className="text-white font-mono">{transferringHull.hullNumber}</span>
              </h3>
              <p className="text-xs text-gray-400 mb-3">
                当前持有者：<span className="text-white">{transferringHull.oldName}</span>
                <br />
                <span className="text-amber-400/60">更迭后将标记为 [旧]{transferringHull.hullNumber}</span>
              </p>
              <div className="relative">
                <div className="flex items-center gap-1.5 bg-gray-700/80 rounded border border-gray-600/50 px-2 py-1.5">
                  <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    autoFocus
                    value={transferSearchQuery}
                    onChange={(e) => setTransferSearchQuery(e.target.value)}
                    placeholder="搜索新持有者 (ID/名字)..."
                    className="flex-1 bg-transparent text-white text-xs outline-none placeholder-gray-500"
                  />
                </div>
                {transferSearchQuery.trim() && (
                  <div className="mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-[200px] overflow-y-auto">
                    {transferSuggestions.length === 0 ? (
                      <div className="px-3 py-2 text-[11px] text-gray-500 text-center">未找到匹配成员</div>
                    ) : (
                      transferSuggestions.map((m) => (
                        <button
                          key={m.player_id}
                          onClick={() => handleSelectTransferTarget(m.player_id)}
                          className="w-full px-3 py-2 text-left hover:bg-amber-500/10 transition-colors flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs text-white truncate">{m.primary_name || m.player_id}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{m.player_id}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {m.hull_number && <span className="text-[9px] text-cyan-400/70">{m.hull_number}</span>}
                            {!m.active && <span className="text-[9px] text-red-400/70">已离队</span>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-3">
                <button
                  onClick={() => { setTransferringHull(null); setTransferSearchQuery('') }}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 更迭确认弹窗 */}
      {confirmingTransfer && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[80]" onClick={() => setConfirmingTransfer(null)} />
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div
              className="bg-gray-800 rounded-lg shadow-xl border border-amber-500/50 w-full max-w-sm p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-medium text-amber-400 mb-2">确认更迭舷号</h3>
              <div className="text-xs text-gray-400 mb-3 space-y-1">
                <p>
                  将 <span className="text-amber-400 font-bold font-mono">{confirmingTransfer.hullNumber}</span> 从{' '}
                  <span className="text-white font-medium">{confirmingTransfer.oldName}</span> 更迭给{' '}
                  <span className="text-white font-medium">{confirmingTransfer.newName}</span>
                </p>
                <p className="text-amber-400/60">
                  {confirmingTransfer.oldName} 将标记为 [旧]{confirmingTransfer.hullNumber}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmingTransfer(null)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmTransfer}
                  className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-500 transition-colors"
                >
                  确认更迭
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 授予日期选择弹窗 */}
      {editingHullDate && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setEditingHullDate(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="bg-gray-800 rounded-lg shadow-xl border border-cyan-500/40 w-full max-w-xs p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-medium text-cyan-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                设置授予日期
              </h3>
              <input
                ref={hullDateInputRef}
                type="date"
                value={editingHullDate.value}
                onChange={(e) => setEditingHullDate({ ...editingHullDate, value: e.target.value })}
                className="w-full bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 outline-none focus:border-cyan-500 mb-3 [color-scheme:dark]"
                autoFocus
              />
              <div className="flex justify-between items-center">
                <button
                  onClick={async () => {
                    const result = await setHullDate(editingHullDate.playerId, null)
                    if (result.success) {
                      toast.success('授予日期已清除', { duration: 1500 })
                      setMembers(prev => prev.map(m =>
                        m.player_id === editingHullDate.playerId ? { ...m, hull_date: null } : m
                      ))
                    } else {
                      toast.error(`清除失败: ${result.error}`)
                    }
                    setEditingHullDate(null)
                  }}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  清除日期
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingHullDate(null)}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleSaveHullDate(editingHullDate.playerId, editingHullDate.value)}
                    className="px-3 py-1.5 text-xs bg-cyan-600 text-white rounded hover:bg-cyan-500 transition-colors"
                  >
                    确认
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 拉黑日期选择弹窗 */}
      {editingBlacklistDate && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setEditingBlacklistDate(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="bg-gray-800 rounded-lg shadow-xl border border-red-500/40 w-full max-w-xs p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                设置拉黑时间
              </h3>
              <input
                type="date"
                autoFocus
                value={editingBlacklistDate.value}
                onChange={(e) => setEditingBlacklistDate({ ...editingBlacklistDate, value: e.target.value })}
                className="w-full bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 outline-none focus:border-red-500 mb-3 [color-scheme:dark]"
              />
              <div className="flex justify-between items-center">
                <button
                  onClick={async () => {
                    const cleared = { ...editingBlacklistDate, value: '' }
                    setEditingBlacklistDate(cleared)
                    // 直接用 cleared 状态保存，避免异步 state 时序问题
                    const date = null
                    if (cleared.type === 'member') {
                      const r = await setMemberBlacklistDate(cleared.id, date)
                      if (r.success) {
                        setMembers(prev => prev.map(m => m.player_id === cleared.id ? { ...m, blacklist_date: null } : m))
                        toast.success('拉黑时间已清除', { duration: 1500 })
                      } else toast.error(`清除失败: ${r.error}`)
                    } else {
                      const existing = elseBlacklist.find(e => e.id === cleared.id)
                      if (existing) {
                        const r = await updateBlacklistElse(cleared.id, { name: existing.name, player_id: existing.player_id, qq_number: existing.qq_number, note: existing.note, blacklist_date: null })
                        if (r.success) {
                          setElseBlacklist(prev => prev.map(e => e.id === cleared.id ? { ...e, blacklist_date: null } : e))
                          toast.success('拉黑时间已清除', { duration: 1500 })
                        } else toast.error(`清除失败: ${r.error}`)
                      }
                    }
                    setEditingBlacklistDate(null)
                  }}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  清除时间
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingBlacklistDate(null)}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveBlacklistDate}
                    className="px-3 py-1.5 text-xs bg-red-700 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    确认
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
