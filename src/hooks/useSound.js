import { CDN_BASE_URL } from '../utils/constants'

/**
 * 音效播放 Hook
 * @returns {Object} 音效播放函数集合
 */
export function useSound() {
  const playSound = (soundName) => {
    try {
      const audio = new Audio(`${CDN_BASE_URL}/audio/${soundName}`)
      audio.volume = 0.5
      audio.play().catch(err => {
        console.warn('Failed to play sound:', err)
      })
    } catch (error) {
      console.error('Error creating audio:', error)
    }
  }

  // 普通按钮点击音效
  const playButtonClick = () => {
    playSound('Button_01_UI.Button_01_UI.wav')
  }

  // 抽卡按钮点击音效
  const playGachaClick = () => {
    playSound('Button_02_UI.Button_02_UI.wav')
  }

  return { playSound, playButtonClick, playGachaClick }
}
