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
  // 2026-10-15 补 150 / 250 / 400 / 800 / 880 / 2200 / 3500，并改写 100 / 328 / 500 / 1000 / 2000：很多年轻人一直想做、却一直没去做的事，带点「这钱本该花在……」的亏欠感（号主：小众但有共鸣，别写养家）
  {
    amount: 100,
    title: '全场最靓的仔',
    content: '一张红彤彤的百元大钞。它要是掉在地上，绝对是全场最靓的仔——可惜它没掉在地上，掉进了卡池。',
    level: 'dense'
  },
  {
    amount: 150,
    title: '欢迎回来，主人~',
    content: '一次女仆咖啡厅的钱。“欢迎回来，主人~”这句话，您在视频里听了无数遍，现场一次都没听过。',
    level: 'dense'
  },
  {
    amount: 250,
    title: '那把木吉他',
    content: '一把入门木吉他的钱。抱着它在篝火旁弹唱那首歌的画面，您在脑子里排练过一百遍。',
    level: 'dense'
  },
  {
    amount: 328,
    title: '帝王蟹自由',
    content: '够吃一顿五星酒店海鲜自助：帝王蟹腿、刺身、生蚝、哈根达斯随便拿。您说“等发了工资就去”，工资已经发了好几回了。',
    level: 'dense'
  },
  {
    amount: 400,
    title: '一副降噪耳机',
    content: '一副降噪耳机的钱。室友外放的短视频、楼上装修的电钻，您已经硬扛了一整年——结果钱充进了游戏，现在唯一能盖过它们的，是您中奖后的欢呼。',
    level: 'dense'
  },
  {
    amount: 500,
    title: '没去成的迪士尼',
    content: '一张迪士尼平日门票，剩下的钱还够买个米奇发箍。城堡上的烟花，您在短视频里看了一百遍。',
    level: 'dense'
  },
  {
    amount: 648,
    title: '经典一步！',
    content: '标志性的【648】已达成！这是通往欧洲大陆的船票，还是……下次剁手前习惯性的热身？',
    level: 'dense'
  },
  {
    amount: 800,
    title: '一台拍立得',
    content: '一台拍立得，再加两盒相纸。想拍的人、想去的地方都有了，就是一张都还没拍。',
    level: 'dense'
  },
  {
    amount: 880,
    title: '期待他的演唱会',
    content: '一张他的演唱会门票。他来您的城市开唱，您说下次一定。',
    level: 'dense'
  },
  {
    amount: 1000,
    title: '四位数俱乐部',
    content: '一张健身房年卡的钱。说好今年要练出腹肌的，现在每天练得最勤的，是点「抽奖」的那根手指。',
    level: 'dense',
    buttons: ['明天就去办卡', '手指也是肌肉']
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
    title: '任劳任怨的廉价劳动力',
    content: '够雇一个刚毕业的大学生实习一个月。任劳任怨、随叫随到，加班还不要加班费。',
    level: 'dense'
  },
  {
    amount: 2200,
    title: '一台Switch的离去',
    content: '一台崭新的游戏机已从您的生活中蒸发。但没关系，这个游戏不就是您的"全能游戏机"吗？',
    level: 'dense'
  },
  {
    amount: 2500,
    title: '快四个"648"',
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

  // 过渡区：深入投入 (￥4,000 - ￥10,000)
  // 2026-10-15：5000 连解锁前要密（筹码 / 货物类约 ¥2,300 解锁，旗舰宝箱约 ¥21,000），补 4000 / 6480 / 12000 / 14000
  {
    amount: 3500,
    title: '一台全景相机',
    content: '一台影石全景相机的钱。骑行、旅行、第一人称 vlog 您都想好了——结果钱充进了游戏，现在您唯一的第一人称视角，是盯着抽卡动画的那双眼睛。',
    level: 'transition'
  },
  {
    amount: 4000,
    title: '主机全家桶',
    content: '继那台Switch之后，一台PS5也悄悄离开了您。主机全家桶，这下真的“全”了——全在卡池里。',
    level: 'transition'
  },
  {
    amount: 5000,
    title: '跨越常规',
    content: '5000元。您已经超越了99%的普通玩家。沉没成本的声音越来越清晰了，对吗？',
    level: 'transition'
  },
  {
    amount: 6480,
    title: '十连648',
    content: '十个【648】。如果每一次都是“最后一次”，那您已经说了十次“最后一次”。',
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
    amount: 12000,
    title: '口袋里的顶配',
    content: '一万二，刚好够买一台顶配的最新款手机。而您用来抽卡的，可能还是三年前那台。',
    level: 'heavy'
  },
  {
    amount: 14000,
    title: '说走就走的旅行',
    content: '一万四，够一次说走就走的欧洲七日游。您也确实出发了，只不过目的地是卡池。',
    level: 'heavy'
  },
  // 原先 ¥1000 的显卡文案号主觉得好，挪到真实的旗舰显卡价格：RTX 5090 国行首发价 ¥16,499（2025-01）
  {
    amount: 16499,
    title: '一张旗舰显卡',
    content: '一张旗舰显卡的价格。它本可以让您在 3A 大作里把画质拉满，现在成了卡池里的一串数据流。帧率？哪有抽卡时的虹光重要！',
    level: 'heavy',
    buttons: ['退钱，我要显卡', '虹光才是最高画质']
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
    title: '一台复古机车',
    content: '四万，够提一台复古机车，周末骑着它环青海湖，风从头盔缝里灌进来——结果钱充进了游戏，现在您唯一会"压弯"的，是看到账单时的腰。',
    level: 'heavy'
  },
  {
    amount: 50000,
    title: '冰岛的极光',
    content: '五万，够飞去冰岛住几晚玻璃屋，躺在床上等一场绿色的极光——结果钱充进了游戏，您等到的唯一一道彩光，是出金时的那道光。',
    level: 'heavy'
  },
  {
    amount: 60000,
    title: '一架立式钢琴',
    content: '六万，够在客厅摆一架立式钢琴，把小时候没学成的《致爱丽丝》补上——结果钱充进了游戏，现在您唯一练熟的指法，是双击快进。',
    level: 'heavy'
  },
  {
    amount: 70000,
    title: '去南极看企鹅',
    content: '七万，够订一张去南极的船票，在冰山之间看企鹅一摇一摆地走——结果钱充进了游戏，现在您离企鹅最近的一次，是登录 QQ 的时候。',
    level: 'heavy'
  },
  {
    amount: 80000,
    title: '一匹自己的马',
    content: '八万，够在马场养下一匹属于自己的马，周末骑着它在草地上慢慢走——结果钱充进了游戏，现在您唯一的坐骑，是那艘还没出货的战舰。',
    level: 'heavy'
  },
  {
    amount: 90000,
    title: '北海道的一整个雪季',
    content: '九万，够在北海道住满一整个雪季，每天早上推开门就是粉雪道——结果钱充进了游戏，现在每天一路往下滑的，只有您的余额。',
    level: 'heavy'
  },

  // 极限区 (￥100,000+)：每个整十万都有自己的里程碑，另有 15 万（2026-10-15 补 15 / 30 / 50 / 70 万；2026-10-16 补 40 / 60 / 80 / 90 万，50 万去掉「首付」）
  {
    amount: 100000,
    title: '十万！为什么？！',
    content: '系统强制干预！请回答这个终极问题：驱使您到达这里的，是热爱，是习惯，还是那个"全图鉴"的执念？\n\n（系统提示：一辆家用轿车从您的账户里开了出去）',
    level: 'extreme',
    buttons: ['是爱', '我乐意']
  },
  {
    amount: 150000,
    title: '一年白干',
    content: '十五万，差不多是一线城市普通上班族一整年的税前工资。这一年里的每一个早高峰、每一次加班，都换成了这里的一串数字。',
    level: 'extreme'
  },
  {
    amount: 200000,
    title: '【万氪之王 · 伪神】',
    content: '二十万！您用金钱铸造了属于您的传说，成为了服务器里的一座丰碑。但请允许我们最后一次询问：这一切，真的值得吗？',
    level: 'extreme',
    buttons: ['过程本身就是奖励', '闭嘴，我还能氪！']
  },
  {
    amount: 300000,
    title: '私人飞行执照',
    content: '三十万，够去考一本私人飞行执照：握着操纵杆，开着小飞机钻进云层，从上面看一眼自己住的城市——结果钱充进了游戏，现在唯一一飞冲天的，是您的氪金总额。',
    level: 'extreme'
  },
  {
    amount: 400000,
    title: '开一家自己的小店',
    content: '四十万，够在一条安静的小街上盘下一间铺子，开一家只卖手冲咖啡和旧书的小店，门口挂一块"营业中"的木牌——结果钱充进了游戏，现在每天准时开门营业的，只有这个卡池。',
    level: 'extreme'
  },
  {
    amount: 500000,
    title: '【万氪之王 · 半神】',
    content: '五十万。换成一元硬币一枚枚摞起来，比上海中心大厦还高出近三百米。\n\n站在这座硬币塔的塔尖上，您已走完通往王座的一半路程——剩下的一半，没有人会拦您。',
    level: 'extreme',
    buttons: ['停在半山腰', '王座就在前面']
  },
  {
    amount: 600000,
    title: '一台自己的房车',
    content: '六十万，够买一台像样的房车：开去川西看雪山，开去新疆看星星，开到海边就停下来过夜——结果钱充进了游戏，现在您唯一的"在路上"，是在去充值页的路上。',
    level: 'extreme'
  },
  {
    amount: 700000,
    title: '凝视深渊',
    content: '七十万。当您凝视深渊的时候，深渊正在给您弹里程碑。它说：再往前一点，就能看见王座了。',
    level: 'extreme'
  },
  {
    amount: 800000,
    title: '海外录取通知书',
    content: '八十万，差不多是出国读两年硕士的学费加生活费，那封写着"Congratulations"的录取邮件本该躺在您的收件箱里——结果钱充进了游戏，您在这里自学修完了《概率论》的全部学分。',
    level: 'extreme'
  },
  {
    amount: 900000,
    title: '躺平基金',
    content: '九十万。按"4% 法则"每年能安全取出三万六，够在小城租一间带阳台的房子，从此不用上班——结果钱充进了游戏，现在您每天能安全领取的，只有每日登录奖励。',
    level: 'extreme'
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
