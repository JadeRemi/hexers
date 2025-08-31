import { Hexagon } from './hexagonUtils'
import { PERSPECTIVE_CONFIG } from '../config/constants'
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
  gameAreaHeight: number
): boolean => {
  // World position
  const worldX = hex.x
  const worldY = hex.y + gameAreaTop
  
  if (PERSPECTIVE_CONFIG.STRENGTH <= 0) {
    // Non-perspective mode - simple check
    const screenX = worldX + panOffset.x
    const screenY = worldY + panOffset.y
    return isPointInRegularHexagon(mouseX, mouseY, screenX, screenY, hexSize)
  }
  
  // Use the unified perspective transformation - same as rendering
  const transformed = applyPerspectiveTransform(
    worldX,
    worldY,
    panOffset.x,
    panOffset.y,
    gameAreaTop,
    gameAreaHeight
  )
  
  // Transform mouse coordinates to scaled hexagon's local space
  // The hexagon is rendered at transformed position with scale applied
  const localX = (mouseX - transformed.screenX) / transformed.scale
  const localY = (mouseY - transformed.screenY) / transformed.scale
  
  // Check if the transformed point is within a regular hexagon at origin
  return isPointInRegularHexagon(localX, localY, 0, 0, hexSize)
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
  
  // Quick rectangular bounds check
  if (dx > size * Math.sqrt(3) / 2 || dy > size) {
    return false
  }
  
  // Hexagon edge check
  const sqrt3 = Math.sqrt(3)
  return dy <= size - dx / sqrt3
}