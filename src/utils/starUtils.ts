import { perlinNoise } from './noiseUtils'
import { CANVAS_CONFIG, STARS_CONFIG } from '../config/constants'
import { Star } from './canvasDrawUtils'

export const generateStars = (): Star[] => {
  const stars: Star[] = []
  for (let i = 0; i < STARS_CONFIG.STAR_COUNT; i++) {
    const noise = perlinNoise(i * 0.1, i * 0.2)
    const x = Math.random() * CANVAS_CONFIG.WIDTH
    const y = Math.random() * CANVAS_CONFIG.HEIGHT
    const size = STARS_CONFIG.MIN_SIZE + 
      (Math.abs(noise) * (STARS_CONFIG.MAX_SIZE - STARS_CONFIG.MIN_SIZE))
    stars.push({ x, y, size })
  }
  return stars
}