/**
 * 氪金里程碑配置
 * 根据氪金总额里程碑文案.md整理
 */

/**
 * 获取里程碑等级（用于视觉效果）
 * @param {number} amount - 金额（元）
 * @returns {'dense'|'transition'|'heavy'|'extreme'} 等级
 */
export function getMilestoneLevel(amount) {
  if (amount <= 3000) return 'dense'       // 密集反馈区
  if (amount <= 10000) return 'transition' // 过渡区
  if (amount <= 100000) return 'heavy'     // 重度投入区
  return 'extreme'                         // 极限区
}

/**
 * 里程碑配置数据
 * 每个里程碑包含：金额、标题、内容、按钮选项（可选）
 */
export const MILESTONES = [
  // 密集反馈区：普通池子覆盖 (￥100 - ￥3,000)
  {
    amount: 100,
    title: '首战告捷！',
    content: '恭喜！您已解锁【初级冒险家】称号！这仅仅是伟大旅程的第一步，下一发可能就是传说！',
    level: 'dense'
  },
  {
    amount: 328,
    title: '一份"大餐"的投入',
    content: '您已氪入一个豪华双人套餐的金额。是虚拟的饱腹感更持久，还是现实的美食更诱人？（肚子咕咕叫了吗？）',
    level: 'dense'
  },
  {
    amount: 500,
    title: '半千里程碑',
    content: '500元！您已经跨过了"试试水"的阶段。现在的您，是认真的。',
    level: 'dense'
  },
  {
    amount: 648,
    title: '经典一步！',
    content: '标志性的【648】已达成！这是通往欧洲大陆的船票，还是……下次剁手前习惯性的热身？',
    level: 'dense'
  },
  {
    amount: 1000,
    title: '四位数俱乐部',
    content: '欢迎来到四位数氪金俱乐部！您的手指切3A大作的顶级显卡,现已成功转化为卡池里的一串数据流。帧率？那有抽卡时的虹光重要！',
    level: 'dense'
  },
  {
    amount: 1314,
    title: '微小的"一生一世"',
    content: '您已许下价值【1314】的诺言。请问，这份诺言是给那艘梦想战舰的，还是给"下次一定出货"的自己的？',
    level: 'dense'
  },
  {
    amount: 1500,
    title: '咬咬牙的金额',
    content: '1500元。这是多数人"咬咬牙"的上限。您已经越过了这条线。祝贺您，也提醒您：前方，可没有刹车了。',
    level: 'dense'
  },
  {
    amount: 1680,
    title: '"一路发"的起点',
    content: '检测到您的财富正以"一路发"的趋势向外流动。这只是一个开始。',
    level: 'dense'
  },
  {
    amount: 2000,
    title: '一台Switch的离去',
    content: '一台崭新的游戏机已从您的生活中蒸发。但没关系，这个游戏不就是您的"全能游戏机"吗？',
    level: 'dense'
  },
  {
    amount: 2500,
    title: '两个半"648"',
    content: '您已经氪了接近4个首充档位的金额。系统想问：如果时光倒流，您会选择另一条路吗？',
    level: 'dense'
  },
  {
    amount: 3000,
    title: '满池达成！',
    content: '恭喜！您已达到常规池子的"毕业"金额！大多数玩家的旅程到此结束。而您，是继续前进，还是就此收手？',
    level: 'dense',
    buttons: ['见好就收', '我还要更多']
  },

  // 过渡区：深入投入 (￥5,000 - ￥10,000)
  {
    amount: 5000,
    title: '跨越常规',
    content: '5000元。您已经超越了99%的普通玩家。沉没成本的声音越来越清晰了，对吗？',
    level: 'transition'
  },
  {
    amount: 8000,
    title: '接近万元',
    content: '距离五位数只差一步之遥。您的钱包正在倒计时。要不要……就此打住？',
    level: 'transition'
  },

  // 重度投入区：每万元一个里程碑 (￥10,000+)
  {
    amount: 10000,
    title: '五位数の壁',
    content: '第一个万元户！沉没成本正式成为您的终身旅伴。它将在每个深夜，轻声问你："下一单，会不会就出货?"',
    level: 'heavy'
  },
  {
    amount: 20000,
    title: '双倍"喜悦"',
    content: '两个【五位数の壁】叠加在一起，并不会产生双倍的快乐，但可能会产生双倍的焦虑。恭喜您，解锁了【焦虑叠加】成就！',
    level: 'heavy'
  },
  {
    amount: 30000,
    title: '回忆杀',
    content: '这是一个成年人一年的零花钱。您还记得小时候，5块钱就能让自己开心一整天的时光吗？现在……3万元只能让您获得"下一抽可能更好"的期待。',
    level: 'heavy'
  },
  {
    amount: 40000,
    title: '四万の坎',
    content: '一台高配笔记本电脑的价格。但在这里，它只是您通往"全图鉴"路上的一个数字。',
    level: 'heavy'
  },
  {
    amount: 50000,
    title: '次元穿越者',
    content: '您的一半灵魂似乎已经永久定居在了服务器里。现实世界的空气，还记得是什么味道吗？',
    level: 'heavy'
  },
  {
    amount: 60000,
    title: '六万之重',
    content: '这笔钱，够支付一个三线城市打工人大半年的房租了。但在虚拟世界里，它只是一串闪光的代码。',
    level: 'heavy'
  },
  {
    amount: 70000,
    title: '七万里路',
    content: '您已经走了七万"里"。前方还有多远？您自己也不知道了，对吗？',
    level: 'heavy'
  },
  {
    amount: 80000,
    title: '接近极限',
    content: '八万元。这是武库舰池子的常见"毕业"金额。如果您还在继续，说明……您已经不是为了"毕业"了。',
    level: 'heavy'
  },
  {
    amount: 90000,
    title: '九万之巅',
    content: '您距离六位数仅一步之遥。回头看看，那是一座用钞票堆砌的高山。您站在山顶，感觉如何？',
    level: 'heavy'
  },

  // 极限区 (￥100,000+)
  {
    amount: 100000,
    title: '十万！为什么？！',
    content: '系统强制干预！请回答这个终极问题：驱使您到达这里的，是热爱，是习惯，还是那个"全图鉴"的执念？\n\n（系统提示：一辆家用轿车从您的账户里开了出去）',
    level: 'extreme',
    buttons: ['是爱', '我乐意']
  },
  {
    amount: 200000,
    title: '【万氪之王 · 伪神】',
    content: '二十万！您用金钱铸造了属于您的传说，成为了服务器里的一座丰碑。但请允许我们最后一次询问：这一切，真的值得吗？',
    level: 'extreme',
    buttons: ['过程本身就是奖励', '闭嘴，我还能氪！']
  },
  {
    amount: 1000000,
    title: '【万氪之王】',
    content: '一百万。言语已无法形容。您已超越了一切玩家，成为了这个模拟器本身的一个传说。系统将为您永久点亮【万氪之王】的徽章。\n\n现在，请您回答最后一个问题：这一切，值得吗？',
    level: 'extreme',
    buttons: ['一切都是虚空', '我，无悔！']
  }
]

/**
 * 根据金额获取最近的里程碑配置
 * @param {number} totalAmount - 当前总氪金额
 * @param {Set<number>} triggeredMilestones - 已触发的里程碑金额集合
 * @returns {object|null} 里程碑配置对象，如果没有新里程碑则返回null
 */
export function getMilestoneByAmount(totalAmount, triggeredMilestones = new Set()) {
  // 找到所有达到但未触发的里程碑
  const untriggeredMilestones = MILESTONES.filter(
    m => totalAmount >= m.amount && !triggeredMilestones.has(m.amount)
  )

  // 返回最大的未触发里程碑
  if (untriggeredMilestones.length === 0) return null

  return untriggeredMilestones.reduce((max, current) =>
    current.amount > max.amount ? current : max
  )
}

/**
 * 视觉配置映射
 */
export const LEVEL_STYLES = {
  dense: {
    bgGradient: 'from-emerald-600/20 to-yellow-600/20',
    borderColor: 'border-yellow-500/50',
    iconBg: 'bg-yellow-500/20',
    iconColor: 'text-yellow-400',
    glowColor: 'shadow-yellow-500/50',
    sound: 'celebration' // 清脆的庆祝音效
  },
  transition: {
    bgGradient: 'from-orange-600/20 to-amber-600/20',
    borderColor: 'border-orange-500/50',
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
    glowColor: 'shadow-orange-500/50',
    sound: 'warning' // 轻度警告音
  },
  heavy: {
    bgGradient: 'from-red-600/20 to-rose-700/20',
    borderColor: 'border-red-500/50',
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
    glowColor: 'shadow-red-500/50',
    sound: 'alert' // 沉重的警报声
  },
  extreme: {
    bgGradient: 'from-purple-900/30 to-gray-900/30',
    borderColor: 'border-purple-500/50',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
    glowColor: 'shadow-purple-500/50',
    sound: 'epic' // 史诗级音效
  }
}
