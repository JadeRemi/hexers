import { perlinNoise, simplexNoise, voronoiNoise, generateVoronoiPoints } from './noiseUtils'
import { TEXTURE_CONFIG, TERRAIN_TYPES, TerrainType } from '../config/constants'

export type NoiseType = 'perlin' | 'simplex' | 'voronoi'

const voronoiPoints = generateVoronoiPoints(200, 2000, 2000)

const noiseCache = new Map<string, number>()

export const getRawNoiseValue = (x: number, y: number, noiseType: NoiseType): number => {
  const scaledX = x * TEXTURE_CONFIG.NOISE_ZOOM
  const scaledY = y * TEXTURE_CONFIG.NOISE_ZOOM
  
  switch (noiseType) {
    case 'perlin':
      return (perlinNoise(scaledX, scaledY) + 1) / 2
    case 'simplex':
      return (simplexNoise(scaledX, scaledY) + 1) / 2
    case 'voronoi': {
      const vNoise = voronoiNoise(x, y, voronoiPoints)
      return Math.min(Math.max(Math.abs(vNoise) / 50, 0), 1)
    }
    default:
      return 0.5
  }
}

export const pixelateCoordinate = (coord: number, pixelSize: number): number => {
  return Math.floor(coord / pixelSize) * pixelSize
}

export const getPixelatedNoiseValue = (x: number, y: number, noiseType: NoiseType): number => {
  const pixelSize = TEXTURE_CONFIG.PIXELATION_SIZE
  const pixelX = pixelateCoordinate(x, pixelSize)
  const pixelY = pixelateCoordinate(y, pixelSize)
  
  const cacheKey = `${noiseType}-${pixelX}-${pixelY}`
  
  if (noiseCache.has(cacheKey)) {
    return noiseCache.get(cacheKey)!
  }
  
  const noiseValue = getRawNoiseValue(pixelX, pixelY, noiseType)
  const quantizedValue = Math.floor(noiseValue * 8) / 8
  
  noiseCache.set(cacheKey, quantizedValue)
  return quantizedValue
}

export const clearNoiseCache = (): void => {
  noiseCache.clear()
}

export const getTerrainColor = (
  noiseValue: number,
  terrainType: TerrainType
): { r: number; g: number; b: number } => {
  const baseColor = TERRAIN_TYPES[terrainType].color
  const variation = 0.3
  
  const factor = 0.7 + noiseValue * variation
  
  return {
    r: Math.floor(baseColor.r * factor),
    g: Math.floor(baseColor.g * factor),
    b: Math.floor(baseColor.b * factor)
  }
}

export const isPointInHexagon = (
  px: number,
  py: number,
  centerX: number,
  centerY: number,
  size: number
): boolean => {
  const dx = Math.abs(px - centerX)
  const dy = Math.abs(py - centerY)
  const sqrt3 = Math.sqrt(3)
  
  if (dx > size * sqrt3 / 2 || dy > size) {
    return false
  }
  
  return dy <= size - dx / sqrt3
}

export const renderHexagonTexture = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  noiseType: NoiseType,
  terrainType: TerrainType
): void => {
  const pixelSize = TEXTURE_CONFIG.PIXELATION_SIZE
  const hexWidth = Math.sqrt(3) * size
  
  ctx.save()
  ctx.imageSmoothingEnabled = false
  
  // Calculate bounds to cover the entire hexagon
  const startX = Math.floor((centerX - hexWidth / 2) / pixelSize) * pixelSize
  const endX = Math.ceil((centerX + hexWidth / 2) / pixelSize) * pixelSize
  const startY = Math.floor((centerY - size) / pixelSize) * pixelSize
  const endY = Math.ceil((centerY + size) / pixelSize) * pixelSize
  
  for (let px = startX; px <= endX; px += pixelSize) {
    for (let py = startY; py <= endY; py += pixelSize) {
      // Check if pixel center is inside hexagon
      const checkX = px + pixelSize / 2
      const checkY = py + pixelSize / 2
      
      if (isPointInHexagon(checkX, checkY, centerX, centerY, size)) {
        const noiseValue = getPixelatedNoiseValue(px, py, noiseType)
        const color = getTerrainColor(noiseValue, terrainType)
        
        ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
        ctx.fillRect(px, py, pixelSize, pixelSize)
      }
    }
  }
  
  ctx.restore()
}