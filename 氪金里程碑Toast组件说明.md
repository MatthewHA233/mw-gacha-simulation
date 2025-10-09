# 氪金里程碑 Toast 组件使用说明

## 🎯 功能概述

这是一个类似Steam成就弹出效果的Toast通知组件，专门用于展示氪金里程碑成就。

**核心特性：**
- ✨ Steam风格的滑入/滑出动画
- 🎨 根据金额档位自动切换颜色和特效
- 📚 支持多个Toast堆叠显示（最多3个）
- ⏱️ 自动倒计时消失（带进度条）
- 🎮 支持交互式按钮选项
- 🔊 预留音效接口

---

## 📂 文件结构

```
src/
├── data/
│   └── milestoneConfig.js              # 里程碑配置数据
├── components/
│   └── ui/
│       ├── MilestoneToast.jsx          # Toast组件本身
│       └── MilestoneToastProvider.jsx  # Toast管理器 + Hook
└── pages/
    └── MilestoneToastDemo.jsx          # 演示页面
```

---

## 🚀 快速开始

### 1. 在App.jsx中添加Provider

```jsx
import { MilestoneToastProvider } from '@/components/ui/MilestoneToastProvider'

function App() {
  return (
    <MilestoneToastProvider maxToasts={3} position="top-right">
      {/* 你的应用内容 */}
    </MilestoneToastProvider>
  )
}
```

**Provider参数：**
- `maxToasts` - 最多同时显示的Toast数量（默认3）
- `position` - Toast位置：`'top-right'` | `'top-left'` | `'bottom-right'` | `'bottom-left'`

---

### 2. 在组件中使用Toast

```jsx
import { useMilestoneToast } from '@/components/ui/MilestoneToastProvider'
import { getMilestoneByAmount } from '@/data/milestoneConfig'
import { useState, useEffect } from 'react'

function YourGachaComponent() {
  const { showToast } = useMilestoneToast()
  const [totalRmb, setTotalRmb] = useState(0)
  const [triggeredMilestones, setTriggeredMilestones] = useState(new Set())

  // 监听氪金总额变化
  useEffect(() => {
    // 检查是否达到新的里程碑
    const milestone = getMilestoneByAmount(totalRmb, triggeredMilestones)

    if (milestone) {
      // 触发Toast
      showToast(milestone, {
        // 按钮点击回调（可选）
        onButtonClick: (milestone, buttonText) => {
          console.log(`用户选择: ${buttonText}`)
          // 这里可以添加统计、日志等逻辑
        },
        // 自定义显示时长（可选，默认5秒）
        duration: milestone.buttons ? 10000 : 5000
      })

      // 标记为已触发，避免重复
      setTriggeredMilestones(prev => new Set([...prev, milestone.amount]))
    }
  }, [totalRmb, showToast, triggeredMilestones])

  return (
    // 你的组件UI
  )
}
```

---

## 📊 里程碑配置

### 配置文件：`src/data/milestoneConfig.js`

**主要配置项：**

```javascript
export const MILESTONES = [
  {
    amount: 100,           // 金额（元）
    title: '首战告捷！',   // 标题
    content: '恭喜！...',  // 内容文本
    level: 'dense',        // 档位：dense | transition | heavy | extreme
    specialEffect: 'golden', // 特殊效果（可选）
    buttons: ['按钮1', '按钮2'] // 按钮选项（可选）
  }
]
```

**金额档位分级：**

| 档位 | 金额范围 | 视觉风格 | 说明 |
|------|---------|---------|------|
| `dense` | ¥100 - ¥3,000 | 绿色/黄色 | 密集反馈区，普通池子覆盖 |
| `transition` | ¥5,000 - ¥10,000 | 橙色 | 过渡区，开始警示 |
| `heavy` | ¥10,000 - ¥100,000 | 红色 | 重度投入区，严肃警告 |
| `extreme` | ¥100,000+ | 紫色/灰色 | 极限区，哲学释然 |

---

## 🎨 视觉配置

### 自定义样式

在 `milestoneConfig.js` 中修改 `LEVEL_STYLES`：

```javascript
export const LEVEL_STYLES = {
  dense: {
    bgGradient: 'from-emerald-600/20 to-yellow-600/20',
    borderColor: 'border-yellow-500/50',
    iconBg: 'bg-yellow-500/20',
    iconColor: 'text-yellow-400',
    glowColor: 'shadow-yellow-500/50',
    sound: 'celebration' // 音效标识
  }
}
```

---

## 🔧 API 参考

### Hook: `useMilestoneToast()`

```javascript
const { showToast, closeToast, closeAll } = useMilestoneToast()
```

**方法：**

- `showToast(milestone, options)` - 显示Toast
  - `milestone` - 里程碑配置对象
  - `options.onButtonClick` - 按钮点击回调
  - `options.duration` - 显示时长（毫秒）

- `closeToast(id)` - 关闭指定Toast

- `closeAll()` - 关闭所有Toast

### 工具函数: `getMilestoneByAmount()`

```javascript
import { getMilestoneByAmount } from '@/data/milestoneConfig'

const milestone = getMilestoneByAmount(totalAmount, triggeredMilestones)
```

**参数：**
- `totalAmount` - 当前氪金总额
- `triggeredMilestones` - 已触发的里程碑金额集合（Set）

**返回值：**
- 返回最大的未触发里程碑配置，如果没有则返回 `null`

---

## 🎬 演示页面

访问 `/test/milestone-toast` 查看完整演示。

演示页面功能：
- 查看所有24个里程碑
- 测试单个Toast效果
- 测试堆叠显示效果
- 查看集成代码示例

---

## 💡 最佳实践

### 1. 存储已触发的里程碑

```javascript
// 使用 localStorage 持久化
const [triggeredMilestones, setTriggeredMilestones] = useState(() => {
  const saved = localStorage.getItem('triggeredMilestones')
  return saved ? new Set(JSON.parse(saved)) : new Set()
})

useEffect(() => {
  localStorage.setItem(
    'triggeredMilestones',
    JSON.stringify([...triggeredMilestones])
  )
}, [triggeredMilestones])
```

### 2. 防止重复触发

使用 `Set` 数据结构记录已触发的里程碑金额，避免刷新页面后重复弹出。

### 3. 按钮点击统计

```javascript
showToast(milestone, {
  onButtonClick: (milestone, buttonText) => {
    // 发送统计数据
    analytics.track('milestone_button_click', {
      amount: milestone.amount,
      button: buttonText
    })
  }
})
```

### 4. 音效集成

在 `useSound` hook 中添加对应的音效文件，根据 `LEVEL_STYLES[level].sound` 播放。

---

## 📝 里程碑列表

| 金额 | 标题 | 特殊效果 | 按钮 |
|------|------|---------|------|
| ¥100 | 首战告捷！ | - | - |
| ¥328 | 一份"大餐"的投入 | - | - |
| ¥500 | 半千里程碑 | - | - |
| ¥648 | 经典一步！ | - | - |
| ¥1,000 | 四位数俱乐部 | - | - |
| ¥1,314 | 微小的"一生一世" | - | - |
| ¥1,500 | 咬咬牙的金额 | - | - |
| ¥1,680 | "一路发"的起点 | - | - |
| ¥2,000 | 一台Switch的离去 | - | - |
| ¥2,500 | 两个半"648" | - | - |
| **¥3,000** | **满池达成！** | - | 见好就收 / 我还要更多 |
| ¥5,000 | 跨越常规 | - | - |
| ¥8,000 | 接近万元 | - | - |
| **¥10,000** | **五位数の壁** | - | - |
| ¥20,000 - ¥90,000 | ... | - | - |
| **¥100,000** | **十万！为什么？！** | - | 是爱 / 我乐意 |
| **¥200,000** | **万氪之王·伪神** | - | 过程本身就是奖励 / 闭嘴，我还能氪！ |
| **¥1,000,000** | **万氪之王** | - | 一切都是虚空 / 我，无悔！ |

共 **24个** 里程碑

---

## 🐛 故障排除

### Toast没有显示

1. 检查是否包裹了 `MilestoneToastProvider`
2. 确认 `showToast` 被正确调用
3. 查看控制台是否有错误

### 重复触发

确保使用 `Set` 记录已触发的里程碑，并在触发后添加到集合中。

### 样式异常

检查 Tailwind CSS 配置是否正确，确保所有动态类名都在安全列表中。

---

## 🎯 未来扩展

- [ ] 添加特效动画（粒子、光效、脉冲等）
- [ ] 支持自定义Toast模板
- [ ] 添加音效播放（集成 useSound hook）

---

## 📄 许可证

本组件为项目内部使用，遵循项目整体许可证。
