import { useEffect, useRef, useState } from 'react'
import { useMilestoneToast } from '../components/ui/MilestoneToastProvider'
import { getMilestoneByAmount, MILESTONES } from '../data/milestoneConfig'

/**
 * 里程碑追踪Hook
 * 监听氪金总额变化，自动触发里程碑Toast
 * 支持批量触发时按金额从小到大依次弹出（每3秒一个）
 */
export function useMilestoneTracker(totalRmb, storageKey) {
  const { showToast } = useMilestoneToast()
  const [triggeredMilestones, setTriggeredMilestones] = useState(() => {
    // 从localStorage加载已触发的里程碑
    try {
      const saved = localStorage.getItem(`${storageKey}_milestones`)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  const prevRmbRef = useRef(totalRmb)
  const toastQueueRef = useRef([])
  const isProcessingRef = useRef(false)

  // 持久化已触发的里程碑
  useEffect(() => {
    try {
      localStorage.setItem(
        `${storageKey}_milestones`,
        JSON.stringify([...triggeredMilestones])
      )
    } catch (error) {
      console.error('Failed to save triggered milestones:', error)
    }
  }, [triggeredMilestones, storageKey])

  // 处理Toast队列，每3秒弹出一个
  const processToastQueue = async () => {
    if (isProcessingRef.current || toastQueueRef.current.length === 0) {
      return
    }

    isProcessingRef.current = true

    while (toastQueueRef.current.length > 0) {
      const milestone = toastQueueRef.current.shift()

      // 触发Toast
      showToast(milestone, {
        onButtonClick: (milestone, buttonText) => {
          console.log(`[里程碑] 用户选择: "${buttonText}" (¥${milestone.amount})`)
        },
        duration: milestone.buttons ? 10000 : 5000
      })

      // 如果队列还有待处理的Toast，等待3秒
      if (toastQueueRef.current.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }

    isProcessingRef.current = false
  }

  // 监听totalRmb变化
  useEffect(() => {
    // 计算累计消耗量（rmb是负数，需要取绝对值）
    const totalSpent = Math.abs(totalRmb)
    const prevSpent = Math.abs(prevRmbRef.current)
    prevRmbRef.current = totalRmb

    // 只在消耗量增加时检查里程碑
    if (totalSpent <= prevSpent) {
      return
    }

    // 找出所有新达成的里程碑（按金额从小到大排序）
    // 使用函数式更新访问最新的 triggeredMilestones，避免将其加入依赖项
    setTriggeredMilestones(prev => {
      const newMilestones = MILESTONES
        .filter(m =>
          totalSpent >= m.amount &&
          !prev.has(m.amount) &&
          prevSpent < m.amount  // 只触发刚刚达成的（避免重复触发）
        )
        .sort((a, b) => a.amount - b.amount)  // 从小到大排序

      if (newMilestones.length === 0) {
        return prev  // 没有新里程碑，直接返回
      }

      console.log(`[里程碑] 当前累计消耗: ¥${totalSpent}, 达成 ${newMilestones.length} 个新里程碑:`, newMilestones.map(m => `¥${m.amount}`).join(', '))

      // 添加到队列
      toastQueueRef.current.push(...newMilestones)

      // 开始处理队列（只在确实有新里程碑时调用）
      processToastQueue()

      // 更新已触发的里程碑
      const updated = new Set(prev)
      newMilestones.forEach(m => updated.add(m.amount))
      return updated
    })
  }, [totalRmb])  // 只依赖 totalRmb，showToast 在 processToastQueue 闭包中捕获

  // 重置已触发里程碑的函数
  const resetMilestones = () => {
    console.log(`[里程碑] 重置里程碑记录: ${storageKey}`)
    setTriggeredMilestones(new Set())
    toastQueueRef.current = []
    prevRmbRef.current = 0  // 重置累计消费记录
    isProcessingRef.current = false  // 重置队列处理状态
    try {
      localStorage.removeItem(`${storageKey}_milestones`)
    } catch (error) {
      console.error('Failed to reset milestones:', error)
    }
  }

  return {
    triggeredMilestones,
    resetMilestones
  }
}
