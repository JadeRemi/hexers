import { CANVAS_CONFIG, UI_ICONS, PERSPECTIVE_CONFIG, SPRITE_CONFIG, TERRAIN_TYPES } from '../config/constants'
import { palette, typography } from '../theme'
import { SPRITES } from '../assets'
import { NoiseType, getPixelatedNoiseValue } from './textureUtils'
import { Hexagon } from './hexagonUtils'
import { Chunk } from './chunkUtils'
import { getTerrainForHexagon } from './terrainUtils'
import { drawButton, drawStars } from './canvasDrawUtils'
import { Star, Unit } from './canvasDrawUtils'
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
  currentNoiseType: NoiseType,
  perspectiveStrength: number
): void => {
  const buttons = getButtonPositions()
  
  // FPS counter (moved right to make room for perspective controls)
  ctx.fillStyle = palette.ui.fps
  ctx.font = typography.fontSize.md
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`FPS: ${Math.round(fps)}`, buttons.perspectiveDisplay.x + buttons.perspectiveDisplay.width + 20, CANVAS_CONFIG.PANEL_HEIGHT / 2)
  
  // Perspective controls (left side)
  drawButton(ctx, {
    x: buttons.perspectiveDec.x,
    y: buttons.perspectiveDec.y,
    width: buttons.perspectiveDec.width,
    height: buttons.perspectiveDec.height,
    text: '-'
  })
  
  drawButton(ctx, {
    x: buttons.perspectiveInc.x,
    y: buttons.perspectiveInc.y,
    width: buttons.perspectiveInc.width,
    height: buttons.perspectiveInc.height,
    text: '+'
  })
  
  // Perspective strength display
  ctx.fillStyle = palette.background.panel
  ctx.fillRect(buttons.perspectiveDisplay.x, buttons.perspectiveDisplay.y, buttons.perspectiveDisplay.width, buttons.perspectiveDisplay.height)
  ctx.strokeStyle = palette.hexagon.borderDefault
  ctx.lineWidth = 1
  ctx.strokeRect(buttons.perspectiveDisplay.x, buttons.perspectiveDisplay.y, buttons.perspectiveDisplay.width, buttons.perspectiveDisplay.height)
  
  ctx.fillStyle = palette.ui.fps
  ctx.font = typography.fontSize.sm
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${perspectiveStrength.toFixed(3)}`, 
    buttons.perspectiveDisplay.x + buttons.perspectiveDisplay.width / 2, 
    buttons.perspectiveDisplay.y + buttons.perspectiveDisplay.height / 2)
  
  // Noise button
  drawButton(ctx, {
    x: buttons.noise.x,
    y: buttons.noise.y,
    width: buttons.noise.width,
    height: buttons.noise.height,
    text: `Noise: ${currentNoiseType}`
  })
  
  // Fullscreen button
  drawButton(ctx, {
    x: buttons.fullscreen.x,
    y: buttons.fullscreen.y,
    width: buttons.fullscreen.width,
    height: buttons.fullscreen.height,
    text: UI_ICONS.FULLSCREEN
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
  _gradientRotation: number,
  _timestamp: number,
  perspectiveStrength: number = PERSPECTIVE_CONFIG.STRENGTH
): void => {
  let globalHexIndex = 0
  
  // Reset debug tracking for this frame
  debugTopRow = null
  debugBottomRow = null
  debugRows = []
  
  for (const chunk of chunks.values()) {
    // Always use perspective transformation (smooth scale from 0.0 upward)
    // At strength 0.0, this returns the original coordinates with no distortion
    for (const hex of chunk.hexagons) {
        // World position of hexagon
        const worldX = hex.x
        const worldY = hex.y + gameAreaTop
        
        // Apply unified perspective transformation with dynamic strength
        const transformed = applyPerspectiveTransform(
          worldX,
          worldY,
          panOffset.x,
          panOffset.y,
          gameAreaTop,
          gameAreaHeight,
          perspectiveStrength
        )
        
        const screenX = transformed.screenX
        const screenY = transformed.screenY
        const scale = transformed.scale
        
        // Optimize viewport culling for performance
        // Render fewer rows to improve FPS
        const topMargin = hexSize * 5  // Reduced from 20 for performance
        const bottomMargin = hexSize * 2
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
        if (scale < 0.25) continue  // More aggressive culling for performance
        
        const terrainType = getTerrainForHexagon(hex.gridRow, hex.gridCol)
        
        ctx.save()
        
        // Translate to the transformed screen position
        ctx.translate(screenX, screenY)
        
        // Create and clip to perspective-distorted hexagon path (created at origin)
        const hexPath = createPerspectiveHexagonPath(screenX, screenY, hexSize, scale, gameAreaTop, gameAreaHeight, perspectiveStrength)
        ctx.clip(hexPath)
        
        // For perspective mode, always use solid colors to ensure perfect alignment
        // This eliminates texture/shape misalignment issues completely
        const terrainColor = TERRAIN_TYPES[terrainType].color
        
        // Add some noise-based variation to the solid color for visual interest
        const noiseValue = getPixelatedNoiseValue(hex.x, hex.y + gameAreaTop, currentNoiseType)
        const variation = Math.floor((noiseValue - 0.5) * 30) // ±15 color variation
        
        const r = Math.max(0, Math.min(255, terrainColor.r + variation))
        const g = Math.max(0, Math.min(255, terrainColor.g + variation))
        const b = Math.max(0, Math.min(255, terrainColor.b + variation))
        
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        ctx.fill(hexPath)
        
        ctx.restore()
      }
    
    // Draw borders and text for hexagons in this chunk
    for (const hex of chunk.hexagons) {
      const hexY = hex.y + gameAreaTop
      
      // Apply unified perspective transformation for borders
      // At strength 0.0, this returns original coordinates
      const transformed = applyPerspectiveTransform(
          hex.x,
          hexY,
          panOffset.x,
          panOffset.y,
          gameAreaTop,
          gameAreaHeight,
          perspectiveStrength
        )
        
        const screenX = transformed.screenX
        const screenY = transformed.screenY
        const scale = transformed.scale
        
        // Skip if outside viewport (same margin as texture rendering)
        const topMargin = hexSize * 5
        const bottomMargin = hexSize * 2
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
        const borderPath = createPerspectiveHexagonPath(screenX, screenY, hexSize, scale, gameAreaTop, gameAreaHeight, perspectiveStrength)
        ctx.stroke(borderPath)
        
        // Draw text with perspective scaling
        ctx.fillStyle = palette.hexagon.text
        const fontSize = parseInt(typography.fontSize.sm) * scale
        ctx.font = `${fontSize}px ${typography.fontFamily.primary}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${hex.gridRow},${hex.gridCol}`, 0, 0)
        
        ctx.restore()
      
      globalHexIndex++
    }
  }
}

// Debug tracking for scaling values and gaps
let debugTopRow: { screenY: number, scale: number, row: number } | null = null
let debugBottomRow: { screenY: number, scale: number, row: number } | null = null
let debugRows: { row: number, screenY: number, scale: number }[] = []
let lastDebugTime = 0

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
  _gradientRotation: number,
  _timestamp: number,
  perspectiveStrength: number = PERSPECTIVE_CONFIG.STRENGTH
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
  
  drawChunks(ctx, chunks, hoveredHexIndex, currentNoiseType, gameAreaTop, gameAreaHeight, hexSize, panOffset, _gradientRotation, _timestamp, perspectiveStrength)
  
  // Draw units (including boulders) - need to match perspective rendering
  // Always use perspective mode for consistency (smooth scale from 0.0)
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
            gameAreaHeight,
            perspectiveStrength
          )
          
          const screenX = transformed.screenX
          const screenY = transformed.screenY
          const scale = transformed.scale
          
          const sprite = sprites[unit.sprite]
          if (sprite) {
            ctx.save()
            ctx.translate(screenX, screenY)
            
            // Apply the same scale as hexagons for proper positioning
            // Minimal compression since perspective is very low (0.005)
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
  
  ctx.restore()
  
  // Draw panels and controls (not affected by pan)
  drawPanels(ctx)
  drawTopPanelControls(ctx, fps, currentNoiseType, perspectiveStrength)
  
  // Debug output once per second
  const currentTime = Date.now()
  if (currentTime - lastDebugTime >= 1000) {
    if (debugTopRow && debugBottomRow) {
      const visibleRows = debugBottomRow.row - debugTopRow.row + 1
      console.log(
        `Y coords: TopRow(${debugTopRow.row})=${Math.round(debugTopRow.screenY)} | ` +
        `BottomRow(${debugBottomRow.row})=${Math.round(debugBottomRow.screenY)} | ` +
        `Canvas: Top=${gameAreaTop} Bottom=${gameAreaTop + gameAreaHeight} | ` +
        `Rows: ${visibleRows}/${PERSPECTIVE_CONFIG.TARGET_VISIBLE_ROWS}`
      )
    }
    lastDebugTime = currentTime
  }
}

export const getButtonPositions = () => {
  const buttonWidth = 150
  const buttonHeight = 40
  const smallButtonWidth = 40
  const buttonSpacing = 10
  const buttonY = (CANVAS_CONFIG.PANEL_HEIGHT - buttonHeight) / 2
  
  // Perspective controls (left side)
  const perspectiveDecX = 20
  const perspectiveIncX = perspectiveDecX + smallButtonWidth + buttonSpacing
  const perspectiveDisplayX = perspectiveIncX + smallButtonWidth + buttonSpacing
  const perspectiveDisplayWidth = 100
  
  // Right side buttons
  const fullscreenX = CANVAS_CONFIG.WIDTH - buttonHeight - 20
  const noiseX = fullscreenX - buttonWidth - buttonSpacing
  
  return {
    perspectiveDec: { x: perspectiveDecX, y: buttonY, width: smallButtonWidth, height: buttonHeight },
    perspectiveInc: { x: perspectiveIncX, y: buttonY, width: smallButtonWidth, height: buttonHeight },
    perspectiveDisplay: { x: perspectiveDisplayX, y: buttonY, width: perspectiveDisplayWidth, height: buttonHeight },
    noise: { x: noiseX, y: buttonY, width: buttonWidth, height: buttonHeight },
    fullscreen: { x: fullscreenX, y: buttonY, width: buttonHeight, height: buttonHeight }
  }
}