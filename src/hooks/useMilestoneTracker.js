'use client'

import { useEffect, useRef, useState } from 'react'
import { useMilestoneToast } from '../components/ui/MilestoneToastProvider'
import { MILESTONES } from '../data/milestoneConfig'
import { raiseCrownTier } from '../utils/crownTier'

const QUEUE_GAP_MS = 3000        // 一次跨过多个里程碑时，相邻两个之间隔多久
const PLAIN_DURATION_MS = 5000   // 普通成就停留时长
const CHOICE_DURATION_MS = 15000 // 带选项的成就停留时长（等玩家选）
// 一口气连续弹 3 个及以上时，除最后一个外都按 5 倍速过（停留和间隔都缩到 1/5），最后一个恢复常规速度
const BURST_MIN = 3
const BURST_SPEEDUP = 5

/**
 * 里程碑追踪：氪金总额每跨过一个里程碑弹一次成就，一次跨过多个就按金额从小到大、每 3 秒一个；
 * 一口气 3 个及以上时前面的按 5 倍速过（停留 1 秒、间隔 0.6 秒），最后一个恢复常规速度。
 *
 * 2026-10-15 修「同一个成就弹两次」：
 * 原先把入队、弹窗写在 setTriggeredMilestones(prev => …) 的更新函数里。React 严格模式（next.config reactStrictMode）
 * 在开发环境会故意把更新函数调两次，并发渲染下生产环境也可能重放；第一次调用里普通成就已同步弹出并移出「处理中」，
 * 第二次调用的 prev 还是旧值，于是又弹一次。以前多条成就叠在同一个位置，两条完全重合看不出来。
 * 现在「已触发」以 triggeredRef 为准：检测到就先同步记进去再弹，任何重入都看得到；更新函数里不再有副作用。
 *
 * 同日修「花到 100 万不弹 100 万」：已触发记录按活动存在 `<类型>_<活动>_milestones`，版本更新重置只清了一个不存在的键，
 * 氪金额归零了记录却还在，以前到过的档位再跨过就不弹。现在已触发记录始终和当前累计金额对齐：
 * 累计金额低于某档时，那一档自动回到「未触发」（读档就绪时、金额回落时都校正），任何重置方式都不用再单独清记录。
 * 组件的存档是挂载后异步读进来的（先默认 0 再跳到存档金额），所以要 ready（存档已读入）：
 * 就绪那一刻只把读进来的金额当基线、校正记录，不弹；之后的增加才算花钱。
 *
 * @param {number} totalRmb 当前人民币余额（负数 = 已花）
 * @param {string} storageKey 例如 chip_ag109
 * @param {boolean} ready 该活动的存档是否已读入（默认 true，不读档的场景直接用）
 * @param {{ awardCrown?: boolean }} options awardCrown=false 时不升顶栏王冠（/test/toasts 展示页用，免得一点就「作弊」）
 */
export function useMilestoneTracker(totalRmb, storageKey, ready = true, { awardCrown = true } = {}) {
  const { showToast, closeAll } = useMilestoneToast()
  const storageName = `${storageKey}_milestones`
  const triggeredRef = useRef(new Set())
  const [triggeredMilestones, setTriggeredMilestones] = useState(() => new Set())
  const prevRmbRef = useRef(totalRmb)
  const queueRef = useRef([])
  const processingRef = useRef(false)
  const mountedRef = useRef(true)
  const readyRef = useRef(false)

  const persist = () => {
    try {
      localStorage.setItem(storageName, JSON.stringify([...triggeredRef.current]))
    } catch (error) {
      console.error('[里程碑] 保存已触发记录失败:', error)
    }
  }

  // 已触发记录和当前累计金额对齐：高于当前金额的档位视为没到过（重置后能重新触发）。有变动才写回
  const alignWithSpent = (spent) => {
    const kept = [...triggeredRef.current].filter((amount) => amount <= spent)
    if (kept.length === triggeredRef.current.size) return
    triggeredRef.current = new Set(kept)
    persist()
    setTriggeredMilestones(new Set(triggeredRef.current))
  }

  // 客户端挂载后（及切换活动时）读回已触发的里程碑；按金额校正放到存档就绪那一刻
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageName) || '[]')
      triggeredRef.current = new Set(Array.isArray(saved) ? saved : [])
    } catch {
      triggeredRef.current = new Set()
    }
    setTriggeredMilestones(new Set(triggeredRef.current))
    // 顶栏王冠彩蛋补登：这个功能上线前就达成过的 20 / 50 / 100 万也算
    if (awardCrown && triggeredRef.current.size > 0) raiseCrownTier(Math.max(...triggeredRef.current))
  }, [storageName])

  // 卸载（换活动页）时清掉队列、收起正在显示的成就
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      queueRef.current = []
      processingRef.current = false
      closeAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 依次弹出队列：普通成就弹完隔 3 秒弹下一个；带选项的等玩家选完（或超时关掉）再继续。
  // 这一轮连续弹的总数（已弹 + 当前 + 还在排队）达到 3 个时，不是最后一个的都按 5 倍速；中途又跨过新里程碑也算进这一轮
  const processQueue = async () => {
    if (processingRef.current) return
    processingRef.current = true
    let shownInRun = 0
    while (queueRef.current.length > 0 && mountedRef.current) {
      const milestone = queueRef.current.shift()
      const hasChoices = milestone.buttons?.length > 0
      const isLast = queueRef.current.length === 0
      const fast = !isLast && shownInRun + 1 + queueRef.current.length >= BURST_MIN
      const speed = fast ? BURST_SPEEDUP : 1
      shownInRun += 1
      const closed = showToast(milestone, { duration: (hasChoices ? CHOICE_DURATION_MS : PLAIN_DURATION_MS) / speed })
      if (hasChoices) {
        await closed
      } else if (queueRef.current.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, QUEUE_GAP_MS / speed))
      }
    }
    if (!mountedRef.current) queueRef.current = []
    processingRef.current = false
  }

  // 氪金总额增加时检查新跨过的里程碑（rmb 是负数，取绝对值）
  useEffect(() => {
    if (!ready) {
      readyRef.current = false
      prevRmbRef.current = totalRmb
      return
    }
    if (!readyRef.current) {
      // 存档刚读入：读进来的金额只当基线，顺便把高于它的「已触发」记录清掉，不弹
      readyRef.current = true
      prevRmbRef.current = totalRmb
      alignWithSpent(Math.abs(totalRmb))
      return
    }
    const totalSpent = Math.abs(totalRmb)
    const prevSpent = Math.abs(prevRmbRef.current)
    prevRmbRef.current = totalRmb
    if (totalSpent < prevSpent) {
      alignWithSpent(totalSpent)   // 金额回落（重置、读到旧档等）：高于它的档位重新可触发
      return
    }
    if (totalSpent === prevSpent) return

    const fresh = MILESTONES
      .filter((m) => totalSpent >= m.amount && prevSpent < m.amount && !triggeredRef.current.has(m.amount))
      .sort((a, b) => a.amount - b.amount)
    if (fresh.length === 0) return

    // 先登记再弹：之后任何重入都看得到它已经触发过
    fresh.forEach((m) => triggeredRef.current.add(m.amount))
    if (awardCrown) raiseCrownTier(fresh[fresh.length - 1].amount)   // 顶栏王冠彩蛋：跨过 20 / 50 / 100 万就升档（只升不降）
    persist()
    setTriggeredMilestones(new Set(triggeredRef.current))

    queueRef.current = [...queueRef.current, ...fresh].sort((a, b) => a.amount - b.amount)
    processQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalRmb, ready])

  const resetMilestones = () => {
    triggeredRef.current = new Set()
    setTriggeredMilestones(new Set())
    queueRef.current = []
    processingRef.current = false
    prevRmbRef.current = 0
    try {
      localStorage.removeItem(storageName)
    } catch (error) {
      console.error('[里程碑] 清除已触发记录失败:', error)
    }
  }

  return { triggeredMilestones, resetMilestones }
}
