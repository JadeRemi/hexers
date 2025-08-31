import { Chunk } from './chunkUtils'
import { NoiseType } from './textureUtils'
import { TEXTURE_CONFIG, CHUNK_CONFIG, HEXAGON_CONFIG } from '../config/constants'
import { renderHexagonTexture } from './textureUtils'
import { getTerrainForHexagon } from './terrainUtils'

interface ChunkCanvas {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  noiseType: NoiseType
}

const chunkCanvasCache = new Map<string, ChunkCanvas>()
const MAX_CACHED_CHUNKS = 50

export const getChunkCacheKey = (chunkX: number, chunkY: number, noiseType: NoiseType, timestamp: number = 0): string => {
  // Temporarily disable timestamp-based cache keys to debug
  return `${chunkX}_${chunkY}_${noiseType}`
}

export const renderChunkToCanvas = (
  chunk: Chunk,
  hexSize: number,
  noiseType: NoiseType,
  timestamp: number = 0,
  gameAreaTop: number = 0,
  gameAreaHeight: number = 1080
): HTMLCanvasElement => {
  const cacheKey = getChunkCacheKey(chunk.x, chunk.y, noiseType, timestamp)
  
  if (chunkCanvasCache.has(cacheKey)) {
    return chunkCanvasCache.get(cacheKey)!.canvas
  }
  
  // Calculate chunk bounds
  const gap = HEXAGON_CONFIG.CELL_GAP
  const hexWidth = Math.sqrt(3) * hexSize
  const horizontalSpacing = hexWidth + gap
  const verticalSpacing = hexSize * 2 * 0.75 + gap
  
  const chunkPixelWidth = horizontalSpacing * CHUNK_CONFIG.SIZE + hexWidth
  const chunkPixelHeight = verticalSpacing * CHUNK_CONFIG.SIZE + hexSize * 2
  
  // Create canvas for this chunk
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(chunkPixelWidth)
  canvas.height = Math.ceil(chunkPixelHeight)
  
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  
  // Find bounds of all hexagons in chunk
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity
  
  for (const hex of chunk.hexagons) {
    minX = Math.min(minX, hex.x - hexWidth / 2)
    maxX = Math.max(maxX, hex.x + hexWidth / 2)
    minY = Math.min(minY, hex.y - hexSize)
    maxY = Math.max(maxY, hex.y + hexSize)
  }
  
  // Render each hexagon to the chunk canvas
  for (const hex of chunk.hexagons) {
    const terrainType = getTerrainForHexagon(hex.gridRow, hex.gridCol)
    
    // Translate to chunk-local coordinates
    const localX = hex.x - minX
    const localY = hex.y - minY
    
    ctx.save()
    renderHexagonTexture(ctx, localX, localY, hexSize, noiseType, terrainType, timestamp, gameAreaTop, gameAreaHeight)
    ctx.restore()
  }
  
  // Cache the rendered chunk
  const chunkCanvas: ChunkCanvas = { canvas, ctx, noiseType }
  
  // Limit cache size
  if (chunkCanvasCache.size >= MAX_CACHED_CHUNKS) {
    const firstKey = chunkCanvasCache.keys().next().value
    chunkCanvasCache.delete(firstKey)
  }
  
  chunkCanvasCache.set(cacheKey, chunkCanvas)
  
  return canvas
}

export const clearChunkCache = (): void => {
  chunkCanvasCache.clear()
}

export const getChunkBounds = (chunk: Chunk, hexSize: number) => {
  const gap = HEXAGON_CONFIG.CELL_GAP
  const hexWidth = Math.sqrt(3) * hexSize
  
  let minX = Infinity, minY = Infinity
  
  for (const hex of chunk.hexagons) {
    minX = Math.min(minX, hex.x - hexWidth / 2)
    minY = Math.min(minY, hex.y - hexSize)
  }
  
  return { minX, minY }
}