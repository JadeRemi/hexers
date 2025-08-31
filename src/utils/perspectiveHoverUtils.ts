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
  
  // Check if mouse is within the distorted hexagon
  // We need to check against the actual distorted shape, not a regular hexagon
  const vertexScreenY = mouseY
  const vertexNormalizedY = Math.max(0, Math.min(1, (vertexScreenY - gameAreaTop) / gameAreaHeight))
  const vertexPerspectiveScale = 0.3 + (vertexNormalizedY * 0.7)
  
  // Calculate mouse position relative to hexagon center
  const relY = mouseY - transformed.screenY
  
  // Account for the Y compression in the distorted shape
  const yCompressionFactor = vertexPerspectiveScale * 0.6
  const uncompressedY = relY / yCompressionFactor
  
  // Account for X convergence
  const vanishingX = CANVAS_CONFIG.WIDTH / 2
  const xDistFromVanishing = mouseX - vanishingX
  const unconvergedXDist = xDistFromVanishing / vertexPerspectiveScale
  const unconvergedX = vanishingX + unconvergedXDist - transformed.screenX
  
  // Check if the unconverged point is within a regular hexagon
  return isPointInRegularHexagon(unconvergedX, uncompressedY, 0, 0, hexSize * transformed.scale)
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