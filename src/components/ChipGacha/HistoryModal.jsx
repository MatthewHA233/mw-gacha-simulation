import { getRarityText, getRarityClass, getRarityBgClass } from '../../utils/rarityHelpers'

/**
 * 所有抽奖记录弹窗组件
 */
export function HistoryModal({ isOpen, onClose, history }) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800/95 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-cyan-500/30 animate-modalFadeIn"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
          <h3 className="text-3xl font-bold text-cyan-400">所有抽奖记录</h3>
          <button
            onClick={onClose}
            className="text-4xl text-gray-400 hover:text-white transition-colors"
          >
            &times;
          </button>
        </div>

        <div className="space-y-2">
          {history.map((item, index) => (
            <div
              key={index}
              className="p-3 bg-slate-900/60 rounded-lg flex items-center gap-3 animate-slideIn"
            >
              <div className={`w-2 h-10 rounded ${getRarityBgClass(item.rarity)}`}></div>
              <div className="flex-1">
                <div className="font-bold">{item.name}</div>
                <div className="text-sm text-slate-400">{item.type}</div>
              </div>
              <div className={`text-sm px-3 py-1 rounded-full ${getRarityClass(item.rarity)}`}>
                {getRarityText(item.rarity)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
