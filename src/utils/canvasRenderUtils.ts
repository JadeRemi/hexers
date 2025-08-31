import { CANVAS_CONFIG, UI_ICONS, PERSPECTIVE_CONFIG, SPRITE_CONFIG } from '../config/constants'
import { palette, typography } from '../theme'
import { SPRITES } from '../assets'
import { NoiseType } from './textureUtils'
import { Hexagon, createHexagonPath } from './hexagonUtils'
import { Chunk } from './chunkUtils'
import { renderHexagonTexture } from './textureUtils'
import { drawPixelatedHexagonBorder } from './borderUtils'
import { drawAnimatedHexagonBorder } from './animatedBorderUtils'
import { getTerrainForHexagon } from './terrainUtils'
import { drawButton, drawStars, drawUnits } from './canvasDrawUtils'
import { Star, Unit } from './canvasDrawUtils'
import { renderChunkToCanvas, getChunkBounds } from './chunkCacheUtils'
import { getBouldersInArea } from './boulderUtils'
import { getPerspectiveScale } from './perspectiveUtils'


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
  
  for (const chunk of chunks.values()) {
    if (PERSPECTIVE_CONFIG.STRENGTH > 0) {
      // For perspective mode - we need to render hexagons with consistent transforms
      for (const hex of chunk.hexagons) {
        // World position of hexagon
        const worldX = hex.x
        const worldY = hex.y + gameAreaTop
        
        // Screen position after panning (where it will appear on screen)
        const screenX = worldX + panOffset.x
        const screenY = worldY + panOffset.y
        
        // Only render hexagons that are within or near the viewport
        if (screenY < gameAreaTop - hexSize * 2 || screenY > gameAreaTop + gameAreaHeight + hexSize * 2) {
          continue
        }
        
        // Get perspective scale based on screen Y position
        const scale = getPerspectiveScale(screenY, gameAreaTop, gameAreaHeight)
        
        // Track top and bottom visible rows for debug
        if (screenY >= gameAreaTop && screenY <= gameAreaTop + gameAreaHeight) {
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
        
        // Apply perspective: translate to screen position, then scale around that point
        ctx.translate(screenX, screenY)
        ctx.scale(scale, scale)
        
        // Render hexagon at origin (already translated)
        const hexPath = createHexagonPath(0, 0, hexSize)
        ctx.clip(hexPath)
        renderHexagonTexture(ctx, 0, 0, hexSize, currentNoiseType, terrainType, timestamp)
        
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
        // World position (hexY already includes gameAreaTop)
        const worldX = hex.x
        const worldY = hexY
        
        // Screen position after panning
        const screenX = worldX + panOffset.x
        const screenY = worldY + panOffset.y
        
        // Skip if outside viewport
        if (screenY < gameAreaTop - hexSize * 2 || screenY > gameAreaTop + gameAreaHeight + hexSize * 2) {
          globalHexIndex++
          continue
        }
        
        // Get perspective scale for this screen position
        const scale = getPerspectiveScale(screenY, gameAreaTop, gameAreaHeight)
        
        // Simple scaled border at screen position
        ctx.save()
        ctx.translate(screenX, screenY)
        ctx.scale(scale, scale)
        
        // Draw border
        ctx.strokeStyle = globalHexIndex === hoveredHexIndex ? 
          palette.hexagon.borderHover : palette.hexagon.borderDefault
        ctx.lineWidth = 2
        
        if (globalHexIndex === hoveredHexIndex) {
          // For hovered hexagons, use animated border (simplified for now)
          ctx.beginPath()
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6
            const x = hexSize * Math.cos(angle)
            const y = hexSize * Math.sin(angle)
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.stroke()
        } else {
          // Regular hexagon border
          ctx.beginPath()
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6
            const x = hexSize * Math.cos(angle)
            const y = hexSize * Math.sin(angle)
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.stroke()
        }
        
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

// Debug tracking for scaling values
let lastDebugTime = 0
let debugTopRow: { screenY: number, scale: number, row: number } | null = null
let debugBottomRow: { screenY: number, scale: number, row: number } | null = null

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
          // World position
          const worldX = hex.x
          const worldY = hex.y + gameAreaTop
          
          // Screen position after panning
          const screenX = worldX + panOffset.x
          const screenY = worldY + panOffset.y
          const scale = getPerspectiveScale(screenY, gameAreaTop, gameAreaHeight)
          
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
  
  // Debug: Draw scaling center as red dot
  if (PERSPECTIVE_CONFIG.STRENGTH > 0) {
    const scalingCenterY = gameAreaTop + gameAreaHeight / 2
    ctx.fillStyle = 'red'
    ctx.beginPath()
    ctx.arc(CANVAS_CONFIG.WIDTH / 2, scalingCenterY, 8, 0, Math.PI * 2)
    ctx.fill()
    
    // Add text label
    ctx.fillStyle = 'white'
    ctx.font = '14px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('SCALING CENTER', CANVAS_CONFIG.WIDTH / 2, scalingCenterY - 15)
    
    // Debug output every second
    const currentTime = Date.now()
    if (currentTime - lastDebugTime >= 1000 && debugTopRow && debugBottomRow) {
      console.log(
        `TOP: row=${debugTopRow.row} screenY=${Math.round(debugTopRow.screenY)} scale=${debugTopRow.scale.toFixed(3)} | ` +
        `BOTTOM: row=${debugBottomRow.row} screenY=${Math.round(debugBottomRow.screenY)} scale=${debugBottomRow.scale.toFixed(3)}`
      )
      lastDebugTime = currentTime
    }
  }
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