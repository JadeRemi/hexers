import { CANVAS_CONFIG, UI_ICONS, PERSPECTIVE_CONFIG, SPRITE_CONFIG } from '../config/constants'
import { palette, typography } from '../theme'
import { SPRITES } from '../assets'
import { NoiseType } from './textureUtils'
import { Hexagon } from './hexagonUtils'
import { Chunk } from './chunkUtils'
import { renderHexagonTexture } from './textureUtils'
import { drawPixelatedHexagonBorder } from './borderUtils'
import { drawAnimatedHexagonBorder } from './animatedBorderUtils'
import { getTerrainForHexagon } from './terrainUtils'
import { drawButton, drawStars, drawUnits } from './canvasDrawUtils'
import { Star, Unit } from './canvasDrawUtils'
import { renderChunkToCanvas, getChunkBounds } from './chunkCacheUtils'
import { getBouldersInArea } from './boulderUtils'
import { applyPerspectiveTransform, createPerspectiveHexagonPath } from './perspectiveUtils'


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
  gameAreaHeight: number,
  hexSize: number,
  panOffset: PanOffset,
  gradientRotation: number,
  timestamp: number
): void => {
  let globalHexIndex = 0
  
  // Reset debug tracking for this frame
  debugTopRow = null
  debugBottomRow = null
  debugRows = []
  
  for (const chunk of chunks.values()) {
    if (PERSPECTIVE_CONFIG.STRENGTH > 0) {
      // For perspective mode - use unified transformation
      for (const hex of chunk.hexagons) {
        // World position of hexagon
        const worldX = hex.x
        const worldY = hex.y + gameAreaTop
        
        // Apply unified perspective transformation
        const transformed = applyPerspectiveTransform(
          worldX,
          worldY,
          panOffset.x,
          panOffset.y,
          gameAreaTop,
          gameAreaHeight
        )
        
        const screenX = transformed.screenX
        const screenY = transformed.screenY
        const scale = transformed.scale
        
        // Be very generous with viewport culling in perspective mode
        // Since perspective compresses things at the top, we need to render many more rows above
        const topMargin = hexSize * 20  // Render many more rows above viewport
        const bottomMargin = hexSize * 4
        if (screenY < gameAreaTop - topMargin || screenY > gameAreaTop + gameAreaHeight + bottomMargin) {
          continue
        }
        
        // Track all visible rows for debug
        if (screenY >= gameAreaTop && screenY <= gameAreaTop + gameAreaHeight) {
          // Store row info for gap calculation
          const existingRow = debugRows.find(r => r.row === hex.gridRow)
          if (!existingRow) {
            debugRows.push({ row: hex.gridRow, screenY, scale })
          }
          
          if (!debugTopRow || screenY < debugTopRow.screenY) {
            debugTopRow = { screenY, scale, row: hex.gridRow }
          }
          if (!debugBottomRow || screenY > debugBottomRow.screenY) {
            debugBottomRow = { screenY, scale, row: hex.gridRow }
          }
        }
        
        // Skip very small hexagons for performance
        if (scale < 0.4) continue
        
        const terrainType = getTerrainForHexagon(hex.gridRow, hex.gridCol)
        
        ctx.save()
        
        // Translate to the transformed screen position
        ctx.translate(screenX, screenY)
        
        // Create and clip to perspective-distorted hexagon path (created at origin)
        const hexPath = createPerspectiveHexagonPath(screenX, screenY, hexSize, scale, gameAreaTop, gameAreaHeight)
        ctx.clip(hexPath)
        
        // Render texture at origin with proper scaling
        // The texture should fill the distorted hexagon shape
        renderHexagonTexture(ctx, 0, 0, hexSize * scale, currentNoiseType, terrainType, timestamp)
        
        ctx.restore()
      }
    } else {
      // Use cached chunk rendering for non-perspective mode (performance)
      const chunkCanvas = renderChunkToCanvas(chunk, hexSize, currentNoiseType, timestamp)
      const { minX, minY } = getChunkBounds(chunk, hexSize)
      ctx.drawImage(chunkCanvas, minX + panOffset.x, minY + gameAreaTop + panOffset.y)
    }
    
    // Draw borders and text for hexagons in this chunk
    for (const hex of chunk.hexagons) {
      const hexY = hex.y + gameAreaTop
      
      if (PERSPECTIVE_CONFIG.STRENGTH > 0) {
        // Apply unified perspective transformation for borders
        const transformed = applyPerspectiveTransform(
          hex.x,
          hexY,
          panOffset.x,
          panOffset.y,
          gameAreaTop,
          gameAreaHeight
        )
        
        const screenX = transformed.screenX
        const screenY = transformed.screenY
        const scale = transformed.scale
        
        // Skip if outside viewport (same generous margin as texture rendering)
        const topMargin = hexSize * 20
        const bottomMargin = hexSize * 4
        if (screenY < gameAreaTop - topMargin || screenY > gameAreaTop + gameAreaHeight + bottomMargin) {
          globalHexIndex++
          continue
        }
        
        // Draw border with perspective distortion
        ctx.save()
        ctx.translate(screenX, screenY)
        
        // Draw border
        ctx.strokeStyle = globalHexIndex === hoveredHexIndex ? 
          palette.hexagon.borderHover : palette.hexagon.borderDefault
        // Scale line width properly - thicker at bottom, thinner at top
        // Base thickness of 8px, scaled by perspective
        ctx.lineWidth = 8 * scale
        
        // Use perspective-distorted hexagon path
        const borderPath = createPerspectiveHexagonPath(screenX, screenY, hexSize, scale, gameAreaTop, gameAreaHeight)
        ctx.stroke(borderPath)
        
        // Draw text with perspective scaling
        ctx.fillStyle = palette.hexagon.text
        const fontSize = parseInt(typography.fontSize.sm) * scale
        ctx.font = `${fontSize}px ${typography.fontFamily.primary}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${hex.gridRow},${hex.gridCol}`, 0, 0)
        
        ctx.restore()
      } else {
        // Regular non-perspective rendering
        const screenX = hex.x + panOffset.x
        const screenY = hexY + panOffset.y
        
        if (globalHexIndex === hoveredHexIndex) {
          drawAnimatedHexagonBorder(ctx, screenX, screenY, hexSize, gradientRotation)
        } else {
          drawPixelatedHexagonBorder(ctx, screenX, screenY, hexSize, palette.hexagon.borderDefault)
        }
        
        ctx.fillStyle = palette.hexagon.text
        ctx.font = typography.fontSize.sm
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${hex.gridRow},${hex.gridCol}`, screenX, screenY)
      }
      
      globalHexIndex++
    }
  }
}

// Debug tracking for scaling values and gaps
let lastDebugTime = 0
let debugTopRow: { screenY: number, scale: number, row: number } | null = null
let debugBottomRow: { screenY: number, scale: number, row: number } | null = null
let debugRows: { row: number, screenY: number, scale: number }[] = []

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
  gradientRotation: number,
  timestamp: number
): void => {
  
  ctx.imageSmoothingEnabled = true
  
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
  
  drawChunks(ctx, chunks, hoveredHexIndex, currentNoiseType, gameAreaTop, gameAreaHeight, hexSize, panOffset, gradientRotation, timestamp)
  
  // Draw units (including boulders) - need to match perspective rendering
  if (PERSPECTIVE_CONFIG.STRENGTH > 0) {
    // In perspective mode, draw units at their perspective-transformed positions
    const allHexagons: Hexagon[] = []
    let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity
    
    for (const chunk of chunks.values()) {
      for (const hex of chunk.hexagons) {
        // Calculate screen position to match hexagon rendering
        const screenY = hex.y + gameAreaTop + panOffset.y
        
        // Only include visible hexagons
        if (screenY >= gameAreaTop - hexSize * 2 && screenY <= gameAreaTop + gameAreaHeight + hexSize * 2) {
          allHexagons.push(hex)
          minRow = Math.min(minRow, hex.gridRow)
          maxRow = Math.max(maxRow, hex.gridRow)
          minCol = Math.min(minCol, hex.gridCol)
          maxCol = Math.max(maxCol, hex.gridCol)
        }
      }
    }
    
    if (allHexagons.length > 0) {
      // Get boulders for visible area
      const boulders = getBouldersInArea(minRow, maxRow, minCol, maxCol)
      const boulderUnits: Unit[] = boulders.map(boulder => ({
        type: 'boulder',
        gridRow: boulder.row,
        gridCol: boulder.col,
        sprite: 'boulder'
      }))
      
      const allUnits = [...units, ...boulderUnits]
      
      // Draw each unit at its perspective position
      for (const unit of allUnits) {
        const hex = allHexagons.find(h => 
          h.gridRow === unit.gridRow && h.gridCol === unit.gridCol
        )
        
        if (hex) {
          // Apply unified perspective transformation for units
          const transformed = applyPerspectiveTransform(
            hex.x,
            hex.y + gameAreaTop,
            panOffset.x,
            panOffset.y,
            gameAreaTop,
            gameAreaHeight
          )
          
          const screenX = transformed.screenX
          const screenY = transformed.screenY
          const scale = transformed.scale
          
          const sprite = sprites[unit.sprite]
          if (sprite) {
            ctx.save()
            ctx.translate(screenX, screenY)
            ctx.scale(scale, scale)
            
            // Draw sprite centered at origin
            const sourceWidth = unit.type === 'wizard' ? 
              SPRITES.wizards.wizard1.width : SPRITES.obstacles.boulder.width
            const sourceHeight = unit.type === 'wizard' ? 
              SPRITES.wizards.wizard1.height : SPRITES.obstacles.boulder.height
            
            const hexWidth = Math.sqrt(3) * hexSize
            const spriteWidth = hexWidth * SPRITE_CONFIG.UNIT_SCALE
            const spriteHeight = (spriteWidth / sourceWidth) * sourceHeight
            
            ctx.drawImage(
              sprite,
              -spriteWidth / 2,
              -spriteHeight + SPRITE_CONFIG.UNIT_VERTICAL_OFFSET,
              spriteWidth,
              spriteHeight
            )
            
            ctx.restore()
          }
        }
      }
    }
  } else {
    // Non-perspective mode - original unit rendering
    ctx.save()
    ctx.translate(panOffset.x, panOffset.y)
    
    const allHexagons: Hexagon[] = []
    let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity
    
    for (const chunk of chunks.values()) {
      allHexagons.push(...chunk.hexagons)
      for (const hex of chunk.hexagons) {
        minRow = Math.min(minRow, hex.gridRow)
        maxRow = Math.max(maxRow, hex.gridRow)
        minCol = Math.min(minCol, hex.gridCol)
        maxCol = Math.max(maxCol, hex.gridCol)
      }
    }
    
    if (allHexagons.length === 0) {
      ctx.restore()
      return
    }
    
    const adjustedHexagons = allHexagons.map(hex => ({
      ...hex,
      y: hex.y + gameAreaTop
    }))
    
    const boulders = getBouldersInArea(minRow, maxRow, minCol, maxCol)
    const boulderUnits: Unit[] = boulders.map(boulder => ({
      type: 'boulder',
      gridRow: boulder.row,
      gridCol: boulder.col,
      sprite: 'boulder'
    }))
    
    const allUnits = [...units, ...boulderUnits]
    drawUnits(ctx, allUnits, adjustedHexagons, sprites, hexSize, gameAreaTop, gameAreaHeight)
    ctx.restore()
  }
  
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