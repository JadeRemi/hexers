import { Hexagon } from './hexagonUtils'
import { PERSPECTIVE_CONFIG, CANVAS_CONFIG } from '../config/constants'
import { applyPerspectiveTransform } from './perspectiveUtils'

/**
 * Check if a point is within a perspective-transformed hexagon
 * This accounts for the fact that hexagons are scaled and positioned differently in perspective mode
 */
export const isPointInPerspectiveHexagon = (
  mouseX: number,
  mouseY: number,
  hex: Hexagon,
  hexSize: number,
  panOffset: { x: number, y: number },
  gameAreaTop: number,
  gameAreaHeight: number,
  perspectiveStrength: number = PERSPECTIVE_CONFIG.STRENGTH
): boolean => {
  // World position
  const worldX = hex.x
  const worldY = hex.y + gameAreaTop
  
  // Always use the unified perspective transformation for consistency
  
  // Use the unified perspective transformation - same as rendering
  const transformed = applyPerspectiveTransform(
    worldX,
    worldY,
    panOffset.x,
    panOffset.y,
    gameAreaTop,
    gameAreaHeight,
    perspectiveStrength
  )
  
  // For zero or low perspective, use simple hit detection
  if (perspectiveStrength < 0.01) {
    const relX = mouseX - transformed.screenX
    const relY = mouseY - transformed.screenY
    return isPointInRegularHexagon(relX, relY, 0, 0, hexSize * transformed.scale)
  }
  
  // For higher perspective, account for distortion (simplified for performance)
  const normalizedY = Math.max(0, Math.min(1, (mouseY - gameAreaTop) / gameAreaHeight))
  
  // Use same scale calculation as rendering
  const scaleVariation = 0.85 * perspectiveStrength
  const scale = Math.max(0.08, 1 - scaleVariation + (normalizedY * scaleVariation))
  
  // Simple convergence approximation
  const vanishingX = CANVAS_CONFIG.WIDTH / 2
  const convergenceAmount = (1 - normalizedY) * perspectiveStrength * 0.5
  const xDistFromVanishing = mouseX - vanishingX
  const unconvergedX = xDistFromVanishing / (1 - convergenceAmount) + vanishingX - transformed.screenX
  
  const relX = unconvergedX
  const relY = mouseY - transformed.screenY
  
  return isPointInRegularHexagon(relX, relY, 0, 0, hexSize * scale)
}

/**
 * Check if a point is within a regular hexagon (no perspective)
 */
const isPointInRegularHexagon = (
  px: number,
  py: number,
  hexX: number,
  hexY: number,
  size: number
): boolean => {
  const dx = Math.abs(px - hexX)
  const dy = Math.abs(py - hexY)
  
  // Quick rectangular bounds check for horizontal hexagon (flat-top)
  // Width = size * 2, Height = size * sqrt(3)
  if (dx > size || dy > size * Math.sqrt(3) / 2) {
    return false
  }
  
  // Hexagon edge check for horizontal orientation
  const sqrt3 = Math.sqrt(3)
  return dx <= size - dy / sqrt3
}