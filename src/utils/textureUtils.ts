import { perlinNoise, simplexNoise, voronoiNoise, generateVoronoiPoints } from './noiseUtils'
import { TEXTURE_CONFIG, TERRAIN_TYPES, TerrainType } from '../config/constants'
import { getCachedNoiseValue } from './noiseCacheUtils'

export type NoiseType = 'perlin' | 'simplex' | 'voronoi'

const voronoiPoints = generateVoronoiPoints(200, 2000, 2000)

/**
 * Middleware function that gets raw noise and applies zoom transformations
 * Does NOT modify the raw noise functions themselves
 */
export const getRawNoiseValue = (x: number, y: number, noiseType: NoiseType): number => {
  let noiseValue: number
  
  switch (noiseType) {
    case 'perlin': {
      const scaledX = x * TEXTURE_CONFIG.NOISE_ZOOM
      const scaledY = y * TEXTURE_CONFIG.NOISE_ZOOM
      noiseValue = (perlinNoise(scaledX, scaledY) + 1) / 2
      break
    }
    case 'simplex': {
      const scaledX = x * TEXTURE_CONFIG.NOISE_ZOOM
      const scaledY = y * TEXTURE_CONFIG.NOISE_ZOOM
      noiseValue = (simplexNoise(scaledX, scaledY) + 1) / 2
      break
    }
    case 'voronoi': {
      // Apply additional zoom out for voronoi
      const scaledX = x * TEXTURE_CONFIG.VORONOI_ZOOM_MULTIPLIER
      const scaledY = y * TEXTURE_CONFIG.VORONOI_ZOOM_MULTIPLIER
      const vNoise = voronoiNoise(scaledX, scaledY, voronoiPoints)
      noiseValue = Math.min(Math.max(Math.abs(vNoise) / 50, 0), 1)
      break
    }
    default:
      noiseValue = 0.5
  }
  
  // Apply contrast enhancement middleware
  const center = 0.5
  const contrasted = center + (noiseValue - center) * TEXTURE_CONFIG.NOISE_CONTRAST
  return Math.max(0, Math.min(1, contrasted))
}

export const pixelateCoordinate = (coord: number, pixelSize: number): number => {
  return Math.floor(coord / pixelSize) * pixelSize
}

export const getPixelatedNoiseValue = (x: number, y: number, noiseType: NoiseType): number => {
  return getCachedNoiseValue(x, y, noiseType)
}

export const clearNoiseCache = (): void => {
  // Noise cache is now managed by noiseCacheUtils
}

/**
 * Converts RGB to HSL for saturation manipulation
 */
const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
  r /= 255
  g /= 255
  b /= 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  
  return { h, s, l }
}

/**
 * Converts HSL back to RGB
 */
const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  let r, g, b
  
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

export const getTerrainColor = (
  noiseValue: number,
  terrainType: TerrainType
): { r: number; g: number; b: number } => {
  const baseColor = TERRAIN_TYPES[terrainType].color
  
  // Convert to HSL for saturation manipulation
  const hsl = rgbToHsl(baseColor.r, baseColor.g, baseColor.b)
  
  // Affect lightness (stronger effect)
  const lightnessVariation = 0.4
  const lightnessFactor = 0.6 + noiseValue * lightnessVariation
  hsl.l = Math.max(0, Math.min(1, hsl.l * lightnessFactor))
  
  // Affect saturation (weaker effect)
  const saturationFactor = 1 - (1 - noiseValue) * TEXTURE_CONFIG.SATURATION_EFFECT
  hsl.s = Math.max(0, Math.min(1, hsl.s * saturationFactor))
  
  // Convert back to RGB
  return hslToRgb(hsl.h, hsl.s, hsl.l)
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