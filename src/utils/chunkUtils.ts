import { Hexagon } from './hexagonUtils'
import { CHUNK_CONFIG, CANVAS_CONFIG } from '../config/constants'
import { SeededRandom } from './seedUtils'

export interface Chunk {
  x: number // Chunk X coordinate
  y: number // Chunk Y coordinate
  hexagons: Hexagon[]
}

export interface ChunkKey {
  x: number
  y: number
}

export const getChunkKey = (x: number, y: number): string => {
  return `${x},${y}`
}

export const parseChunkKey = (key: string): ChunkKey => {
  const [x, y] = key.split(',').map(Number)
  return { x, y }
}

/**
 * Calculate which chunks should be loaded based on viewport and pan offset
 */
export const getVisibleChunks = (
  panOffsetX: number,
  panOffsetY: number,
  hexSize: number,
  gameAreaHeight: number
): ChunkKey[] => {
  const gap = 12
  const hexWidth = Math.sqrt(3) * hexSize
  const horizontalSpacing = hexWidth + gap
  const verticalSpacing = hexSize * 2 * 0.75 + gap
  
  // Size of one chunk in pixels
  const chunkWidth = horizontalSpacing * CHUNK_CONFIG.SIZE
  const chunkHeight = verticalSpacing * CHUNK_CONFIG.SIZE
  
  // Calculate viewport bounds
  const viewLeft = -panOffsetX - chunkWidth * CHUNK_CONFIG.LOAD_DISTANCE
  const viewRight = -panOffsetX + CANVAS_CONFIG.WIDTH + chunkWidth * CHUNK_CONFIG.LOAD_DISTANCE
  const viewTop = -panOffsetY - chunkHeight * CHUNK_CONFIG.LOAD_DISTANCE
  const viewBottom = -panOffsetY + gameAreaHeight + chunkHeight * CHUNK_CONFIG.LOAD_DISTANCE
  
  // Convert to chunk coordinates
  const minChunkX = Math.floor(viewLeft / chunkWidth)
  const maxChunkX = Math.ceil(viewRight / chunkWidth)
  const minChunkY = Math.floor(viewTop / chunkHeight)
  const maxChunkY = Math.ceil(viewBottom / chunkHeight)
  
  const chunks: ChunkKey[] = []
  for (let cy = minChunkY; cy <= maxChunkY; cy++) {
    for (let cx = minChunkX; cx <= maxChunkX; cx++) {
      chunks.push({ x: cx, y: cy })
    }
  }
  
  return chunks
}

/**
 * Generate hexagons for a specific chunk
 */
export const generateChunkHexagons = (
  chunkX: number,
  chunkY: number,
  hexSize: number
): Hexagon[] => {
  const hexagons: Hexagon[] = []
  const gap = 12 // Same gap as before
  const hexWidth = Math.sqrt(3) * hexSize
  const hexHeight = hexSize * 2
  
  // Add gap to spacing
  const horizontalSpacing = hexWidth + gap
  const verticalSpacing = hexHeight * 0.75 + gap
  
  const startRow = chunkY * CHUNK_CONFIG.SIZE
  const endRow = startRow + CHUNK_CONFIG.SIZE
  const startCol = chunkX * CHUNK_CONFIG.SIZE
  const endCol = startCol + CHUNK_CONFIG.SIZE
  
  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      const xOffset = (row % 2) * (horizontalSpacing / 2)
      const x = col * horizontalSpacing + xOffset + hexWidth / 2
      const y = row * verticalSpacing + hexSize
      
      hexagons.push({
        x,
        y,
        row: 0, // Local row within display
        col: 0, // Local col within display
        gridRow: row,
        gridCol: col,
        isHovered: false
      })
    }
  }
  
  return hexagons
}

/**
 * Load chunks that are visible, unload those that aren't
 */
export const updateLoadedChunks = (
  currentChunks: Map<string, Chunk>,
  visibleChunkKeys: ChunkKey[],
  hexSize: number
): Map<string, Chunk> => {
  const newChunks = new Map<string, Chunk>()
  const visibleKeys = new Set(visibleChunkKeys.map(k => getChunkKey(k.x, k.y)))
  
  // Keep existing visible chunks
  for (const [key, chunk] of currentChunks) {
    if (visibleKeys.has(key)) {
      newChunks.set(key, chunk)
      visibleKeys.delete(key)
    }
  }
  
  // Load new visible chunks
  for (const key of visibleKeys) {
    const { x, y } = parseChunkKey(key)
    const hexagons = generateChunkHexagons(x, y, hexSize)
    newChunks.set(key, { x, y, hexagons })
  }
  
  return newChunks
}