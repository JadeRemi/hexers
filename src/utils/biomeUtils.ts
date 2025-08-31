import { TerrainType, TERRAIN_TYPES, BIOME_CONFIG } from '../config/constants'
import { simplexNoise } from './noiseUtils'
import { SeededRandom } from './seedUtils'

// Order of terrain types for biome distribution
const BIOME_ORDER: TerrainType[] = ['water', 'sand', 'grass', 'dirt', 'snow']

/**
 * Get terrain type for a hexagon based on biome noise
 * Uses multiple octaves of noise for more natural biome distribution
 */
export const getBiomeTerrainType = (
  gridRow: number,
  gridCol: number,
  seed: string
): TerrainType => {
  // Use seed to offset noise
  const rng = new SeededRandom(seed)
  const offsetX = rng.nextFloat(0, 1000)
  const offsetY = rng.nextFloat(0, 1000)
  
  // Sample noise at biome scale
  const x = gridCol * BIOME_CONFIG.SCALE + offsetX
  const y = gridRow * BIOME_CONFIG.SCALE + offsetY
  
  // Use multiple octaves for more interesting patterns
  let noiseValue = 0
  let amplitude = 1
  let frequency = 1
  let maxValue = 0
  
  for (let i = 0; i < 3; i++) {
    noiseValue += simplexNoise(x * frequency, y * frequency) * amplitude
    maxValue += amplitude
    amplitude *= 0.5
    frequency *= 2
  }
  
  // Normalize to 0-1
  noiseValue = (noiseValue / maxValue + 1) / 2
  
  // Apply smoothstep for smoother transitions
  noiseValue = smoothstep(0, 1, noiseValue)
  
  // Map to terrain types
  const index = Math.floor(noiseValue * BIOME_ORDER.length)
  const clampedIndex = Math.max(0, Math.min(BIOME_ORDER.length - 1, index))
  
  return BIOME_ORDER[clampedIndex]
}

/**
 * Smoothstep function for smoother biome transitions
 */
const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * Check if a position is near a biome border (for special effects if needed)
 */
export const isNearBiomeBorder = (
  gridRow: number,
  gridCol: number,
  seed: string
): boolean => {
  const currentBiome = getBiomeTerrainType(gridRow, gridCol, seed)
  
  // Check adjacent cells
  const adjacentCells = [
    [gridRow - 1, gridCol],
    [gridRow + 1, gridCol],
    [gridRow, gridCol - 1],
    [gridRow, gridCol + 1]
  ]
  
  for (const [row, col] of adjacentCells) {
    if (getBiomeTerrainType(row, col, seed) !== currentBiome) {
      return true
    }
  }
  
  return false
}