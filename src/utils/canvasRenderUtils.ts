import { CANVAS_CONFIG, HEXAGON_CONFIG, UI_ICONS } from '../config/constants'
import { palette, typography } from '../theme'
import { NoiseType } from './textureUtils'
import { Hexagon, createHexagonPath, isPointInHexagon, calculateHexSize } from './hexagonUtils'
import { Chunk } from './chunkUtils'
import { renderHexagonTexture } from './textureUtils'
import { drawPixelatedHexagonBorder } from './borderUtils'
import { drawAnimatedHexagonBorder } from './animatedBorderUtils'
import { getTerrainForHexagon } from './terrainUtils'
import { drawButton, drawStars, drawUnits } from './canvasDrawUtils'
import { Star, Unit } from './canvasDrawUtils'
import { renderChunkToCanvas, getChunkBounds } from './chunkCacheUtils'

export interface PanOffset {
  x: number
  y: number
}

export const drawPanels = (ctx: CanvasRenderingContext2D): void => {
  // Top panel
  ctx.fillStyle = palette.background.panel
  ctx.fillRect(0, 0, CANVAS_CONFIG.WIDTH, CANVAS_CONFIG.PANEL_HEIGHT)
  
  // Bottom panel
  ctx.fillStyle = palette.background.panel
  ctx.fillRect(0, CANVAS_CONFIG.HEIGHT - CANVAS_CONFIG.PANEL_HEIGHT, CANVAS_CONFIG.WIDTH, CANVAS_CONFIG.PANEL_HEIGHT)
  
  // Draw panel borders
  ctx.strokeStyle = palette.hexagon.borderDefault
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, CANVAS_CONFIG.PANEL_HEIGHT)
  ctx.lineTo(CANVAS_CONFIG.WIDTH, CANVAS_CONFIG.PANEL_HEIGHT)
  ctx.moveTo(0, CANVAS_CONFIG.HEIGHT - CANVAS_CONFIG.PANEL_HEIGHT)
  ctx.lineTo(CANVAS_CONFIG.WIDTH, CANVAS_CONFIG.HEIGHT - CANVAS_CONFIG.PANEL_HEIGHT)
  ctx.stroke()
}

export const drawTopPanelControls = (
  ctx: CanvasRenderingContext2D,
  fps: number,
  currentNoiseType: NoiseType
): void => {
  const buttonWidth = 150
  const buttonHeight = 40
  const buttonSpacing = 10
  const buttonY = (CANVAS_CONFIG.PANEL_HEIGHT - buttonHeight) / 2
  
  // FPS counter on the left
  ctx.fillStyle = palette.ui.fps
  ctx.font = typography.fontSize.md
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`FPS: ${Math.round(fps)}`, 20, CANVAS_CONFIG.PANEL_HEIGHT / 2)
  
  // Fullscreen button on the right
  const fullscreenX = CANVAS_CONFIG.WIDTH - buttonHeight - 20
  drawButton(ctx, {
    x: fullscreenX,
    y: buttonY,
    width: buttonHeight,
    height: buttonHeight,
    text: UI_ICONS.FULLSCREEN
  })
  
  // Noise button to the left of fullscreen
  const noiseX = fullscreenX - buttonWidth - buttonSpacing
  drawButton(ctx, {
    x: noiseX,
    y: buttonY,
    width: buttonWidth,
    height: buttonHeight,
    text: `Noise: ${currentNoiseType}`
  })
}

export const drawChunks = (
  ctx: CanvasRenderingContext2D,
  chunks: Map<string, Chunk>,
  hoveredHexIndex: number | null,
  currentNoiseType: NoiseType,
  gameAreaTop: number,
  hexSize: number,
  panOffset: PanOffset,
  gradientRotation: number
): void => {
  ctx.save()
  ctx.translate(panOffset.x, panOffset.y)
  
  let globalHexIndex = 0
  
  for (const chunk of chunks.values()) {
    // Render cached chunk texture
    const chunkCanvas = renderChunkToCanvas(chunk, hexSize, currentNoiseType)
    const { minX, minY } = getChunkBounds(chunk, hexSize)
    
    ctx.drawImage(chunkCanvas, minX, minY + gameAreaTop)
    
    // Draw borders and text for hexagons in this chunk
    for (const hex of chunk.hexagons) {
      const hexY = hex.y + gameAreaTop
      
      // Draw border - animated for hovered, static for others
      if (globalHexIndex === hoveredHexIndex) {
        drawAnimatedHexagonBorder(ctx, hex.x, hexY, hexSize, gradientRotation)
      } else {
        drawPixelatedHexagonBorder(ctx, hex.x, hexY, hexSize, palette.hexagon.borderDefault)
      }
      
      // Draw text
      ctx.fillStyle = palette.hexagon.text
      ctx.font = typography.fontSize.sm
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${hex.gridRow},${hex.gridCol}`, hex.x, hexY)
      
      globalHexIndex++
    }
  }
  
  ctx.restore()
}

export const renderFrame = (
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  chunks: Map<string, Chunk>,
  units: Unit[],
  sprites: { [key: string]: HTMLImageElement },
  hoveredHexIndex: number | null,
  currentNoiseType: NoiseType,
  fps: number,
  gameAreaTop: number,
  gameAreaHeight: number,
  hexSize: number,
  panOffset: PanOffset,
  gradientRotation: number
): void => {
  ctx.imageSmoothingEnabled = false
  
  // Clear canvas
  ctx.fillStyle = palette.background.canvas
  ctx.fillRect(0, 0, CANVAS_CONFIG.WIDTH, CANVAS_CONFIG.HEIGHT)
  
  // Draw game area with clipping
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, gameAreaTop, CANVAS_CONFIG.WIDTH, gameAreaHeight)
  ctx.clip()
  
  // Draw stars without pan offset (fixed background)
  drawStars(ctx, stars)
  
  ctx.restore()
  
  // Draw chunks with pan offset
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, gameAreaTop, CANVAS_CONFIG.WIDTH, gameAreaHeight)
  ctx.clip()
  
  drawChunks(ctx, chunks, hoveredHexIndex, currentNoiseType, gameAreaTop, hexSize, panOffset, gradientRotation)
  
  // Draw units with adjusted position and pan offset
  ctx.save()
  ctx.translate(panOffset.x, panOffset.y)
  
  // Collect all hexagons for units
  const allHexagons: Hexagon[] = []
  for (const chunk of chunks.values()) {
    allHexagons.push(...chunk.hexagons)
  }
  
  const adjustedHexagons = allHexagons.map(hex => ({
    ...hex,
    y: hex.y + gameAreaTop
  }))
  
  drawUnits(ctx, units, adjustedHexagons, sprites, hexSize)
  ctx.restore()
  
  ctx.restore()
  
  // Draw panels and controls (not affected by pan)
  drawPanels(ctx)
  drawTopPanelControls(ctx, fps, currentNoiseType)
}

export const getButtonPositions = () => {
  const buttonWidth = 150
  const buttonHeight = 40
  const buttonSpacing = 10
  const buttonY = (CANVAS_CONFIG.PANEL_HEIGHT - buttonHeight) / 2
  const fullscreenX = CANVAS_CONFIG.WIDTH - buttonHeight - 20
  const noiseX = fullscreenX - buttonWidth - buttonSpacing
  
  return {
    noise: { x: noiseX, y: buttonY, width: buttonWidth, height: buttonHeight },
    fullscreen: { x: fullscreenX, y: buttonY, width: buttonHeight, height: buttonHeight }
  }
}