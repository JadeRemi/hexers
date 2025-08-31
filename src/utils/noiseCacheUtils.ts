import { NoiseType, getRawNoiseValue, pixelateCoordinate } from './textureUtils'
import { TEXTURE_CONFIG, CANVAS_CONFIG } from '../config/constants'

export interface NoiseCache {
  perlin: Uint8Array
  simplex: Uint8Array
  voronoi: Uint8Array
}

const CACHE_WIDTH = Math.ceil(CANVAS_CONFIG.WIDTH / TEXTURE_CONFIG.PIXELATION_SIZE)
const CACHE_HEIGHT = Math.ceil(CANVAS_CONFIG.HEIGHT / TEXTURE_CONFIG.PIXELATION_SIZE)
const CACHE_SIZE = CACHE_WIDTH * CACHE_HEIGHT

let noiseCache: NoiseCache | null = null

const generateNoiseArray = (noiseType: NoiseType): Uint8Array => {
  const array = new Uint8Array(CACHE_SIZE)
  
  for (let y = 0; y < CACHE_HEIGHT; y++) {
    for (let x = 0; x < CACHE_WIDTH; x++) {
      const pixelX = x * TEXTURE_CONFIG.PIXELATION_SIZE
      const pixelY = y * TEXTURE_CONFIG.PIXELATION_SIZE
      
      const noiseValue = getRawNoiseValue(pixelX, pixelY, noiseType)
      const quantizedValue = Math.floor(noiseValue * 255)
      
      const index = y * CACHE_WIDTH + x
      array[index] = quantizedValue
    }
  }
  
  return array
}

export const initializeNoiseCache = (): void => {
  console.log('Initializing noise cache...')
  const startTime = performance.now()
  
  noiseCache = {
    perlin: generateNoiseArray('perlin'),
    simplex: generateNoiseArray('simplex'),
    voronoi: generateNoiseArray('voronoi')
  }
  
  const endTime = performance.now()
  console.log(`Noise cache initialized in ${(endTime - startTime).toFixed(2)}ms`)
}

export const getCachedNoiseValue = (x: number, y: number, noiseType: NoiseType): number => {
  if (!noiseCache) {
    initializeNoiseCache()
  }
  
  const pixelX = pixelateCoordinate(x, TEXTURE_CONFIG.PIXELATION_SIZE)
  const pixelY = pixelateCoordinate(y, TEXTURE_CONFIG.PIXELATION_SIZE)
  
  const cacheX = Math.floor(pixelX / TEXTURE_CONFIG.PIXELATION_SIZE)
  const cacheY = Math.floor(pixelY / TEXTURE_CONFIG.PIXELATION_SIZE)
  
  if (cacheX < 0 || cacheX >= CACHE_WIDTH || cacheY < 0 || cacheY >= CACHE_HEIGHT) {
    return 0.5
  }
  
  const index = cacheY * CACHE_WIDTH + cacheX
  const value = noiseCache![noiseType][index]
  
  return value / 255
}

export const getNoiseCache = (): NoiseCache | null => noiseCache

export const clearNoiseCache = (): void => {
  noiseCache = null
}