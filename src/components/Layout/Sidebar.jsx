import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useActivityList } from '../../hooks/useActivityList'
import { buildWidgetUrl, getGachaTypePath } from '../../services/cdnService'
import './Sidebar.css'

/**
 * 侧边栏组件
 * 显示活动列表并支持切换
 */
export function Sidebar({ isOpen, onClose, onOpenSponsor, isMobile = false }) {
  const { activities, loading, error } = useActivityList()
  const navigate = useNavigate()
  const { activityId: currentActivityId } = useParams()

  const handleActivityClick = (activity) => {
    const typePath = getGachaTypePath(activity.gacha_type)
    navigate(`/gacha/${typePath}/${activity.id}`)
    onClose()
  }

  return (
    <motion.div
      initial={false}
      animate={{ width: isOpen ? (isMobile ? '210px' : '420px') : '0px' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="relative flex-shrink-0 bg-black overflow-hidden"
      style={{ maxWidth: isOpen ? (isMobile ? '42.5vw' : '85vw') : '0' }}
    >
      <div className="w-[210px] md:w-[420px] max-w-[42.5vw] md:max-w-[85vw] h-full flex flex-col">
        {/* 顶部网站标题 */}
        <div className="py-3 md:py-4 px-4 border-b border-white/10 bg-gradient-to-b from-black to-black/90">
          <div className="flex items-center gap-2 md:gap-3">
            <img
              src="/MW.png"
              alt="现代战舰"
              className="w-8 h-8 md:w-12 md:h-12 object-contain"
            />
            <div className="flex-1">
              <h1 className="text-white text-xs md:text-lg font-bold">现代战舰抽奖模拟器</h1>
              <p className="text-cyan-400 text-[8px] md:text-xs">Modern Warships Gacha Simulator</p>
            </div>
          </div>
        </div>

        {/* 活动列表 - 可滚动 */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 custom-scrollbar">
          {loading && (
            <div className="text-white text-center text-xs md:text-sm">加载中...</div>
          )}
          {error && (
            <div className="text-red-400 text-center text-xs md:text-sm">加载失败</div>
          )}
          {activities.map((activity) => {
            const widgetUrl = buildWidgetUrl(activity)
            const isActive = activity.id === currentActivityId

            return (
              <motion.div
                key={activity.id}
                className="relative w-full cursor-pointer overflow-hidden group"
                onClick={() => handleActivityClick(activity)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                {/* 固定尺寸容器 */}
                <div className="relative w-full h-[100px] md:h-[200px] overflow-hidden rounded-lg shadow-lg">
                  {/* 图片（裁切填充） */}
                  <img
                    src={widgetUrl}
                    alt={activity.name}
                    className="w-full h-full object-cover"
                  />

                  {/* 选中状态：简洁发光边框 */}
                  {isActive && (
                    <div className="absolute inset-0 ring-2 ring-cyan-400 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.6)]" />
                  )}

                  {/* Hover状态：淡淡的白色边框 */}
                  <div className="absolute inset-0 ring-1 ring-white/0 group-hover:ring-white/30 rounded-lg transition-all duration-300" />

                  {/* 类别标签 - 左上角 */}
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-1.5 md:px-2 py-0.5 rounded text-[7px] md:text-[10px] font-medium text-white/80 border border-white/10">
                    {activity.gacha_type.replace('类', '')}
                  </div>

                  {/* 文本覆盖层 - 底部 */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                    <div className="space-y-0.5">
                      <h2 className="text-white text-[10px] md:text-base font-bold truncate">{activity.name}</h2>
                      <p className="text-white/80 text-[8px] md:text-sm truncate">{activity.formattedDate}</p>
                    </div>
                  </div>

                  {/* 当前活动标识 */}
                  {isActive && (
                    <div className="absolute top-2 right-2 bg-cyan-400 text-black text-[8px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 rounded shadow-lg">
                      当前
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* 底部署名 */}
        <div
          className="py-3 px-4 cursor-pointer hover:bg-white/5 transition-all border-t border-white/10 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation()
            onOpenSponsor()
          }}
        >
          <p className="text-white/60 text-[9px] md:text-sm text-center">
            Made by <span className="text-cyan-400 font-semibold">HORIZN地平线-CHanGO</span>
          </p>
        </div>
      </div>
    </motion.div>
  )
}
