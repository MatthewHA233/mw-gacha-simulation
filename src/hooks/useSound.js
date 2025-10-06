import { CDN_BASE_URL } from '../utils/constants'

/**
 * 音效播放 Hook
 * @returns {Function} playSound - 播放音效的函数
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

  return playSound
}
