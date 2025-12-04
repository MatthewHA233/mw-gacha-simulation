'use client'

import { useState } from 'react'
import { useMilestoneToast } from '@/components/ui/MilestoneToastProvider'
import { MILESTONES } from '@/data/milestoneConfig'
import { BackgroundBeams } from '@/components/ui/background-beams'

/**
 * 里程碑Toast演示页面
 */
export default function MilestoneToastDemo() {
  const { showToast, closeAll } = useMilestoneToast()
  const [selectedAmount, setSelectedAmount] = useState(null)

  // 按金额档位分组
  const milestonesByLevel = {
    dense: MILESTONES.filter(m => m.level === 'dense'),
    transition: MILESTONES.filter(m => m.level === 'transition'),
    heavy: MILESTONES.filter(m => m.level === 'heavy'),
    extreme: MILESTONES.filter(m => m.level === 'extreme')
  }

  const levelNames = {
    dense: '密集反馈区 (¥100-¥3,000)',
    transition: '过渡区 (¥5,000-¥10,000)',
    heavy: '重度投入区 (¥10,000-¥100,000)',
    extreme: '极限区 (¥100,000+)'
  }

  const levelColors = {
    dense: 'from-emerald-600 to-yellow-600',
    transition: 'from-orange-600 to-amber-600',
    heavy: 'from-red-600 to-rose-700',
    extreme: 'from-purple-900 to-gray-900'
  }

  // 触发Toast
  const triggerToast = (milestone) => {
    setSelectedAmount(milestone.amount)
    showToast(milestone, {
      onButtonClick: (milestone, buttonText) => {
        console.log(`用户点击了按钮: "${buttonText}"，里程碑: ¥${milestone.amount}`)
      },
      duration: milestone.buttons ? 10000 : 5000 // 有按钮的Toast显示更久
    })
  }

  return (
    <div className="fixed inset-0 bg-black overflow-y-auto overflow-x-hidden">
      {/* 背景特效 */}
      <div className="fixed inset-0 pointer-events-none">
        <BackgroundBeams />
      </div>

      {/* 内容 */}
      <div className="relative z-10 container mx-auto px-4 py-8 pb-20">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            氪金里程碑 Toast 演示
          </h1>
          <p className="text-gray-400">
            点击下方按钮体验不同金额档位的成就弹窗效果
          </p>

          {/* 操作按钮 */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => {
                // 连续触发多个Toast测试堆叠效果
                const testMilestones = [
                  MILESTONES.find(m => m.amount === 100),
                  MILESTONES.find(m => m.amount === 500),
                  MILESTONES.find(m => m.amount === 1000)
                ]
                testMilestones.forEach((m, i) => {
                  setTimeout(() => triggerToast(m), i * 500)
                })
              }}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600
                       hover:from-blue-500 hover:to-purple-500
                       rounded-lg text-white font-medium transition-all
                       shadow-lg hover:shadow-xl hover:scale-105"
            >
              测试堆叠效果
            </button>

            <button
              onClick={closeAll}
              className="px-6 py-2 bg-red-600 hover:bg-red-500
                       rounded-lg text-white font-medium transition-all
                       shadow-lg hover:shadow-xl hover:scale-105"
            >
              关闭所有Toast
            </button>
          </div>

          {selectedAmount && (
            <div className="mt-4 inline-block px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <p className="text-sm text-gray-300">
                当前触发: <span className="text-yellow-400 font-bold">¥{selectedAmount.toLocaleString()}</span>
              </p>
            </div>
          )}
        </div>

        {/* 里程碑按钮网格 */}
        <div className="space-y-8 max-w-5xl mx-auto">
          {Object.entries(milestonesByLevel).map(([level, milestones]) => (
            <div key={level} className="space-y-4">
              {/* 分组标题 */}
              <div className="flex items-center gap-3">
                <div className={`h-1 flex-1 bg-gradient-to-r ${levelColors[level]} rounded`} />
                <h2 className="text-xl font-bold text-white whitespace-nowrap">
                  {levelNames[level]}
                </h2>
                <div className={`h-1 flex-1 bg-gradient-to-l ${levelColors[level]} rounded`} />
              </div>

              {/* 里程碑按钮 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {milestones.map((milestone) => (
                  <button
                    key={milestone.amount}
                    onClick={() => triggerToast(milestone)}
                    className={`
                      group relative p-4 rounded-lg
                      bg-gradient-to-br ${levelColors[level]}/20
                      hover:${levelColors[level]}/30
                      border border-white/10 hover:border-white/30
                      transition-all hover:scale-105
                      shadow-lg hover:shadow-xl
                    `}
                  >
                    {/* 金额 */}
                    <div className="text-2xl font-bold text-white mb-1">
                      ¥{milestone.amount.toLocaleString()}
                    </div>

                    {/* 标题 */}
                    <div className="text-xs text-gray-300 line-clamp-1">
                      {milestone.title}
                    </div>

                    {/* 按钮标记 */}
                    {milestone.buttons && (
                      <div className="absolute bottom-2 right-2">
                        <svg
                          className="w-3 h-3 text-white/60"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 使用说明 */}
        <div className="mt-12 max-w-3xl mx-auto bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">📋 使用说明</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p>• <strong>普通Toast</strong>：自动在5秒后消失</p>
            <p>• <strong>带按钮Toast</strong>：显示10秒，点击按钮后关闭</p>
            <p>• <strong>堆叠显示</strong>：最多同时显示3个Toast</p>
            <p>• <strong>手动关闭</strong>：点击Toast右上角的X按钮</p>
            <p>• <strong>视觉效果</strong>：不同金额档位有不同的颜色渐变</p>
          </div>
        </div>

        {/* 集成代码示例 */}
        <div className="mt-8 max-w-3xl mx-auto bg-black/50 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">💻 集成示例</h3>
          <pre className="text-xs text-gray-300 overflow-x-auto">
{`// 1. 在 App.jsx 中包裹 MilestoneToastProvider
import { MilestoneToastProvider } from '@/components/ui/MilestoneToastProvider'

function App() {
  return (
    <MilestoneToastProvider maxToasts={3} position="top-right">
      {/* 你的应用内容 */}
    </MilestoneToastProvider>
  )
}

// 2. 在需要触发Toast的组件中使用
import { useMilestoneToast } from '@/components/ui/MilestoneToastProvider'
import { getMilestoneByAmount } from '@/data/milestoneConfig'

function YourComponent() {
  const { showToast } = useMilestoneToast()
  const [triggeredMilestones, setTriggeredMilestones] = useState(new Set())

  // 当氪金额变化时检查里程碑
  useEffect(() => {
    const milestone = getMilestoneByAmount(totalRmb, triggeredMilestones)
    if (milestone) {
      showToast(milestone, {
        onButtonClick: (milestone, buttonText) => {
          console.log('用户选择:', buttonText)
        }
      })
      setTriggeredMilestones(prev => new Set([...prev, milestone.amount]))
    }
  }, [totalRmb])
}`}
          </pre>
        </div>
      </div>
    </div>
  )
}
