import { simplexNoise } from './noiseUtils'
import { SeededRandom } from './seedUtils'

let boulderSeed: string = ''
let seededRandom: SeededRandom | null = null

export const setBoulderSeed = (seed: string): void => {
  boulderSeed = seed
  seededRandom = new SeededRandom(seed)
}

// Boulder cluster configuration
const BOULDER_CONFIG = {
  CLUSTER_NOISE_SCALE: 0.008, // Slightly higher frequency for more varied clusters
  CLUSTER_THRESHOLD: -0.3, // Much lower threshold for 2x more clusters
  CLUSTER_SIZE_MIN: 4,
  CLUSTER_SIZE_MAX: 12,
  BOULDER_DENSITY: 0.24, // Double the density (24% instead of 12%)
  CLUSTER_SPREAD: 6 // Smaller spread for tighter clusters
} as const

interface BoulderCluster {
  centerRow: number
  centerCol: number
  size: number
  boulderPositions: Set<string>
}

const clusterCache = new Map<string, BoulderCluster | null>()
const MAX_CLUSTER_CACHE = 500

const getClusterKey = (clusterRow: number, clusterCol: number): string => {
  return `${clusterRow}_${clusterCol}`
}

/**
 * Get the cluster coordinates for a given world position
 */
const getClusterCoords = (row: number, col: number): { clusterRow: number, clusterCol: number } => {
  const clusterSize = BOULDER_CONFIG.CLUSTER_SPREAD * 2
  return {
    clusterRow: Math.floor(row / clusterSize),
    clusterCol: Math.floor(col / clusterSize)
  }
}

/**
 * Check if a cluster should exist at given cluster coordinates
 */
const shouldClusterExist = (clusterRow: number, clusterCol: number): boolean => {
  const noiseValue = simplexNoise(
    clusterRow * BOULDER_CONFIG.CLUSTER_NOISE_SCALE,
    clusterCol * BOULDER_CONFIG.CLUSTER_NOISE_SCALE
  )
  return noiseValue > BOULDER_CONFIG.CLUSTER_THRESHOLD
}

/**
 * Generate a boulder cluster at given cluster coordinates
 */
const generateBoulderCluster = (clusterRow: number, clusterCol: number): BoulderCluster | null => {
  if (!shouldClusterExist(clusterRow, clusterCol)) {
    return null
  }

  if (!seededRandom) {
    throw new Error('Boulder seed not set')
  }

  // Create deterministic random for this cluster
  const clusterSeed = `${boulderSeed}_cluster_${clusterRow}_${clusterCol}`
  const clusterRandom = new SeededRandom(clusterSeed)

  const clusterSize = clusterRandom.nextInt(
    BOULDER_CONFIG.CLUSTER_SIZE_MIN,
    BOULDER_CONFIG.CLUSTER_SIZE_MAX
  )

  // Calculate cluster center in world coordinates
  const clusterSpan = BOULDER_CONFIG.CLUSTER_SPREAD * 2
  const centerRow = clusterRow * clusterSpan + BOULDER_CONFIG.CLUSTER_SPREAD
  const centerCol = clusterCol * clusterSpan + BOULDER_CONFIG.CLUSTER_SPREAD

  const boulderPositions = new Set<string>()

  // Generate the first boulder near the center
  const firstRow = centerRow + clusterRandom.nextInt(-2, 2)
  const firstCol = centerCol + clusterRandom.nextInt(-2, 2)
  boulderPositions.add(`${firstRow}_${firstCol}`)

  // Generate remaining boulders close to existing ones (clustering effect)
  while (boulderPositions.size < clusterSize) {
    // Pick a random existing boulder as anchor
    const existingPositions = Array.from(boulderPositions)
    const anchorKey = existingPositions[clusterRandom.nextInt(0, existingPositions.length - 1)]
    const [anchorRow, anchorCol] = anchorKey.split('_').map(Number)

    // Place new boulder within 1-3 cells of the anchor
    const distance = clusterRandom.nextInt(1, 3)
    const angle = clusterRandom.next() * Math.PI * 2
    const offsetRow = Math.round(Math.cos(angle) * distance)
    const offsetCol = Math.round(Math.sin(angle) * distance)
    
    const newRow = anchorRow + offsetRow
    const newCol = anchorCol + offsetCol
    const newKey = `${newRow}_${newCol}`

    // Only add if not already occupied and within cluster bounds
    if (!boulderPositions.has(newKey) && 
        Math.abs(newRow - centerRow) <= BOULDER_CONFIG.CLUSTER_SPREAD &&
        Math.abs(newCol - centerCol) <= BOULDER_CONFIG.CLUSTER_SPREAD) {
      boulderPositions.add(newKey)
    }
    
    // Prevent infinite loop if we can't place more boulders
    if (boulderPositions.size === 1 && clusterRandom.next() < 0.1) {
      break
    }
  }

  return {
    centerRow,
    centerCol,
    size: clusterSize,
    boulderPositions
  }
}

/**
 * Get boulder cluster, using cache when possible
 */
const getBoulderCluster = (clusterRow: number, clusterCol: number): BoulderCluster | null => {
  const key = getClusterKey(clusterRow, clusterCol)
  
  if (clusterCache.has(key)) {
    return clusterCache.get(key) || null
  }

  const cluster = generateBoulderCluster(clusterRow, clusterCol)

  // Limit cache size
  if (clusterCache.size >= MAX_CLUSTER_CACHE) {
    const firstKey = clusterCache.keys().next().value
    clusterCache.delete(firstKey)
  }

  clusterCache.set(key, cluster)
  return cluster
}

/**
 * Check if a specific cell has a boulder (deterministic)
 */
export const hasBoulderAt = (row: number, col: number): boolean => {
  const { clusterRow, clusterCol } = getClusterCoords(row, col)
  const cluster = getBoulderCluster(clusterRow, clusterCol)
  
  if (!cluster) {
    return false
  }

  return cluster.boulderPositions.has(`${row}_${col}`)
}

/**
 * Get all boulders in a given area (for rendering visible chunks)
 */
export const getBouldersInArea = (
  minRow: number,
  maxRow: number,
  minCol: number,
  maxCol: number
): Array<{ row: number, col: number }> => {
  const boulders: Array<{ row: number, col: number }> = []

  // Get all cluster coordinates that might affect this area
  const minCluster = getClusterCoords(minRow - BOULDER_CONFIG.CLUSTER_SPREAD, minCol - BOULDER_CONFIG.CLUSTER_SPREAD)
  const maxCluster = getClusterCoords(maxRow + BOULDER_CONFIG.CLUSTER_SPREAD, maxCol + BOULDER_CONFIG.CLUSTER_SPREAD)

  for (let clusterRow = minCluster.clusterRow; clusterRow <= maxCluster.clusterRow; clusterRow++) {
    for (let clusterCol = minCluster.clusterCol; clusterCol <= maxCluster.clusterCol; clusterCol++) {
      const cluster = getBoulderCluster(clusterRow, clusterCol)
      
      if (cluster) {
        for (const positionKey of cluster.boulderPositions) {
          const [row, col] = positionKey.split('_').map(Number)
          
          // Only include boulders within the requested area
          if (row >= minRow && row <= maxRow && col >= minCol && col <= maxCol) {
            boulders.push({ row, col })
          }
        }
      }
    }
  }
  return boulders
}

/**
 * Clear boulder cache (useful when changing seeds or for memory management)
 */
export const clearBoulderCache = (): void => {
  clusterCache.clear()
}

/**
 * Get statistics about boulder generation (for debugging)
 */
export const getBoulderStats = (
  minRow: number,
  maxRow: number,
  minCol: number,
  maxCol: number
): { totalCells: number, boulderCells: number, clusters: number } => {
  const totalCells = (maxRow - minRow + 1) * (maxCol - minCol + 1)
  const boulders = getBouldersInArea(minRow, maxRow, minCol, maxCol)
  
  // Count unique clusters
  const clusterSet = new Set<string>()
  for (let row = minRow; row <= maxRow; row += BOULDER_CONFIG.CLUSTER_SPREAD * 2) {
    for (let col = minCol; col <= maxCol; col += BOULDER_CONFIG.CLUSTER_SPREAD * 2) {
      const { clusterRow, clusterCol } = getClusterCoords(row, col)
      if (shouldClusterExist(clusterRow, clusterCol)) {
        clusterSet.add(getClusterKey(clusterRow, clusterCol))
      }
    }
  }

  return {
    totalCells,
    boulderCells: boulders.length,
    clusters: clusterSet.size
  }
}