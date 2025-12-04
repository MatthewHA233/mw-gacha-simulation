'use client'

import { useEffect, useRef, useState } from 'react'
import { useMilestoneToast } from '../components/ui/MilestoneToastProvider'
import { getMilestoneByAmount, MILESTONES } from '../data/milestoneConfig'

/**
 * 里程碑追踪Hook
 * 监听氪金总额变化，自动触发里程碑Toast
 * 支持批量触发时按金额从小到大依次弹出（每3秒一个）
 */
export function useMilestoneTracker(totalRmb, storageKey) {
  const { showToast, closeAll } = useMilestoneToast()
  const [triggeredMilestones, setTriggeredMilestones] = useState(new Set())
  const [isHydrated, setIsHydrated] = useState(false)

  // 客户端挂载后从 localStorage 加载已触发的里程碑
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_milestones`)
      if (saved) {
        setTriggeredMilestones(new Set(JSON.parse(saved)))
      }
    } catch {
      // ignore
    }
    setIsHydrated(true)
  }, [storageKey])

  const prevRmbRef = useRef(totalRmb)
  const toastQueueRef = useRef([])
  const isProcessingRef = useRef(false)
  const isMountedRef = useRef(true)  // 标记组件是否已挂载
  const processingMilestonesRef = useRef(new Set())  // 正在处理中的里程碑金额集合

  // 组件挂载/卸载生命周期
  useEffect(() => {
    // 组件挂载时确保标记为 true
    isMountedRef.current = true
    console.log(`[里程碑] 组件挂载，storageKey: ${storageKey}`)

    // 只在组件真正卸载时清理
    return () => {
      console.log(`[里程碑] 组件卸载，清除队列和关闭Toast，storageKey: ${storageKey}`)
      isMountedRef.current = false
      toastQueueRef.current = []
      isProcessingRef.current = false
      closeAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // 空依赖数组，只在挂载和卸载时运行

  // 持久化已触发的里程碑
  useEffect(() => {
    if (typeof window === 'undefined' || !isHydrated) return
    try {
      localStorage.setItem(
        `${storageKey}_milestones`,
        JSON.stringify([...triggeredMilestones])
      )
    } catch (error) {
      console.error('Failed to save triggered milestones:', error)
    }
  }, [triggeredMilestones, storageKey, isHydrated])

  // 处理Toast队列，每3秒弹出一个
  const processToastQueue = async () => {
    console.log(`[里程碑] processToastQueue 被调用，队列长度: ${toastQueueRef.current.length}, isProcessing: ${isProcessingRef.current}, isMounted: ${isMountedRef.current}`)

    if (isProcessingRef.current || toastQueueRef.current.length === 0) {
      return
    }

    isProcessingRef.current = true

    while (toastQueueRef.current.length > 0) {
      // 检查组件是否已卸载
      if (!isMountedRef.current) {
        console.log(`[里程碑] 组件已卸载，停止处理队列`)
        toastQueueRef.current = []
        processingMilestonesRef.current.clear()
        isProcessingRef.current = false
        return
      }

      const milestone = toastQueueRef.current.shift()
      console.log(`[里程碑] 准备显示 Toast: ¥${milestone.amount}${milestone.buttons ? ' (带选项，等待用户交互)' : ''}`)

      // 标记为正在处理（防止重复检测）
      processingMilestonesRef.current.add(milestone.amount)

      // 区分有无选项的Toast
      if (milestone.buttons && milestone.buttons.length > 0) {
        // 带选项的Toast：等待用户交互后才继续
        await showToast(milestone, {
          onButtonClick: (milestone, buttonText) => {
            console.log(`[里程碑] 用户选择: "${buttonText}" (¥${milestone.amount})`)
          },
          duration: 15000  // 带选项的延长时间
        })

        console.log(`[里程碑] Toast 已关闭: ¥${milestone.amount}`)

        // Toast 关闭后，从正在处理集合中移除
        processingMilestonesRef.current.delete(milestone.amount)

        // 检查组件是否已卸载
        if (!isMountedRef.current) {
          console.log(`[里程碑] Toast 关闭期间组件已卸载，停止处理队列`)
          toastQueueRef.current = []
          processingMilestonesRef.current.clear()
          isProcessingRef.current = false
          return
        }
      } else {
        // 无选项的Toast：立即显示，不等待关闭
        showToast(milestone, {
          onButtonClick: (milestone, buttonText) => {
            console.log(`[里程碑] 用户选择: "${buttonText}" (¥${milestone.amount})`)
          },
          duration: 5000
        })

        // 如果队列还有待处理的Toast，等待3秒
        if (toastQueueRef.current.length > 0) {
          console.log(`[里程碑] 等待 3 秒...`)
          await new Promise(resolve => setTimeout(resolve, 3000))

          // 等待后再次检查组件是否已卸载
          if (!isMountedRef.current) {
            console.log(`[里程碑] 等待期间组件已卸载，停止处理队列`)
            toastQueueRef.current = []
            processingMilestonesRef.current.clear()
            isProcessingRef.current = false
            return
          }
        }

        // Toast 显示完成，从正在处理集合中移除
        processingMilestonesRef.current.delete(milestone.amount)
      }
    }

    console.log(`[里程碑] 队列处理完成`)
    isProcessingRef.current = false
  }

  // 监听totalRmb变化
  useEffect(() => {
    // 计算累计消耗量（rmb是负数，需要取绝对值）
    const totalSpent = Math.abs(totalRmb)
    const prevSpent = Math.abs(prevRmbRef.current)

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

      // 过滤掉已经在队列中或正在处理中的里程碑（防止重复）
      const queuedAmounts = new Set(toastQueueRef.current.map(m => m.amount))
      const uniqueNewMilestones = newMilestones.filter(m =>
        !queuedAmounts.has(m.amount) &&
        !processingMilestonesRef.current.has(m.amount)  // 关键：也过滤正在处理的
      )

      console.log(`[里程碑] 过滤后剩余: ${uniqueNewMilestones.length} 个，队列中已有: ${queuedAmounts.size} 个，正在处理: ${processingMilestonesRef.current.size} 个`)

      if (uniqueNewMilestones.length > 0) {
        // 添加到队列
        toastQueueRef.current.push(...uniqueNewMilestones)

        // 对整个队列按金额从小到大重新排序（重要！确保顺序正确）
        toastQueueRef.current.sort((a, b) => a.amount - b.amount)

        console.log(`[里程碑] 队列排序后:`, toastQueueRef.current.map(m => `¥${m.amount}`).join(', '))

        // 开始处理队列
        processToastQueue()
      }

      // 更新已触发的里程碑
      const updated = new Set(prev)
      newMilestones.forEach(m => updated.add(m.amount))
      return updated
    })

    // 在检测完成后再更新 prevRmbRef（重要！防止状态更新延迟导致重复检测）
    prevRmbRef.current = totalRmb
  }, [totalRmb])  // 只依赖 totalRmb，showToast 在 processToastQueue 闭包中捕获

  // 重置已触发里程碑的函数
  const resetMilestones = () => {
    console.log(`[里程碑] 重置里程碑记录: ${storageKey}`)
    setTriggeredMilestones(new Set())
    toastQueueRef.current = []
    processingMilestonesRef.current.clear()  // 清空正在处理的集合
    prevRmbRef.current = 0  // 重置累计消费记录
    isProcessingRef.current = false  // 重置队列处理状态
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`${storageKey}_milestones`)
      } catch (error) {
        console.error('Failed to reset milestones:', error)
      }
    }
  }

  return {
    triggeredMilestones,
    resetMilestones
  }
}
