import { PERSPECTIVE_CONFIG, CANVAS_CONFIG } from '../config/constants'

/**
 * Apply complete perspective transformation to a world position
 * This handles position, scale, and convergence consistently
 */
export const applyPerspectiveTransform = (
  worldX: number,
  worldY: number,
  panOffsetX: number,
  panOffsetY: number,
  gameAreaTop: number,
  gameAreaHeight: number
): { screenX: number, screenY: number, scale: number } => {
  if (PERSPECTIVE_CONFIG.STRENGTH <= 0) {
    return {
      screenX: worldX + panOffsetX,
      screenY: worldY + panOffsetY,
      scale: 1
    }
  }

  const viewportCenterX = CANVAS_CONFIG.WIDTH / 2
  const viewportCenterY = gameAreaTop + gameAreaHeight / 2
  
  // First apply pan to get screen position
  const screenX = worldX + panOffsetX
  const screenY = worldY + panOffsetY
  
  // Calculate scale based on screen Y position (viewport-based)
  const normalizedY = Math.max(0, Math.min(1, (screenY - gameAreaTop) / gameAreaHeight))
  const scale = 0.3 + (normalizedY * 0.7)
  
  // For perspective Y position, we want to:
  // 1. Spread rows across the full viewport height
  // 2. Compress more at the top, less at the bottom
  // 3. Use the top of the viewport as the vanishing area
  
  // Shift the compression reference point upward to spread rows better
  // This makes rows fill the viewport from top to bottom
  const compressionCenterY = gameAreaTop + gameAreaHeight * 0.2  // Shifted up from center
  const yDistFromCompressionCenter = screenY - compressionCenterY
  
  // Apply perspective scaling with an exponent for non-linear compression
  const yCompressionScale = Math.pow(scale, 1.5)  // More aggressive compression at top
  const perspectiveY = compressionCenterY + yDistFromCompressionCenter * yCompressionScale
  
  // Apply horizontal convergence
  const xDistFromCenter = screenX - viewportCenterX  
  const convergenceFactor = (1 - normalizedY) * PERSPECTIVE_CONFIG.STRENGTH * 0.5
  const perspectiveX = viewportCenterX + xDistFromCenter * (1 - convergenceFactor)
  
  return {
    screenX: perspectiveX,
    screenY: perspectiveY,
    scale
  }
}

/**
 * Get perspective scale based purely on viewport Y position
 * This is a pure viewport mask - it only depends on where something appears on screen
 */
export const getPerspectiveScale = (
  viewportY: number,
  gameAreaTop: number,
  gameAreaHeight: number
): number => {
  if (PERSPECTIVE_CONFIG.STRENGTH <= 0) {
    return 1
  }

  // Normalize Y position within viewport (0 = top, 1 = bottom)
  const normalizedY = Math.max(0, Math.min(1, (viewportY - gameAreaTop) / gameAreaHeight))
  
  // Scale: smaller at top (0.3), larger at bottom (1.0) - pure viewport effect
  return 0.3 + (normalizedY * 0.7)
}

/**
 * Apply perspective transformation - pure viewport effect, not coordinate-based
 * This is now just a wrapper that applies scale at the current position
 */
export const applyViewportPerspective = (
  screenX: number,
  screenY: number,
  gameAreaTop: number,
  gameAreaHeight: number
): { x: number, y: number, scale: number } => {
  const scale = getPerspectiveScale(screenY, gameAreaTop, gameAreaHeight)
  
  if (PERSPECTIVE_CONFIG.STRENGTH <= 0) {
    return { x: screenX, y: screenY, scale }
  }

  // Screen center for convergence (viewport center)
  const centerX = CANVAS_CONFIG.WIDTH / 2
  const normalizedY = Math.max(0, Math.min(1, (screenY - gameAreaTop) / gameAreaHeight))
  
  // Column convergence - X coordinates converge toward center at viewport top
  const distanceFromCenter = screenX - centerX
  const convergenceAmount = (1 - normalizedY) * PERSPECTIVE_CONFIG.STRENGTH * 0.6
  const perspectiveX = centerX + (distanceFromCenter * (1 - convergenceAmount))
  
  // Y compression - compress distances toward viewport center
  const viewportCenter = gameAreaTop + gameAreaHeight / 2
  const distanceFromViewportCenter = screenY - viewportCenter
  const yCompressionFactor = 0.4 + (normalizedY * 0.6) // More compression at top
  const perspectiveY = viewportCenter + (distanceFromViewportCenter * yCompressionFactor)
  
  return {
    x: perspectiveX,
    y: perspectiveY,
    scale
  }
}

/**
 * Create perspective-distorted hexagon path
 * Path is created at origin (0,0) for use with translate
 */
export const createPerspectiveHexagonPath = (
  centerX: number,
  centerY: number,
  size: number,
  scale: number,
  gameAreaTop: number,
  gameAreaHeight: number
): Path2D => {
  const path = new Path2D()
  
  // Calculate convergence based on Y position
  const screenCenterX = CANVAS_CONFIG.WIDTH / 2
  const normalizedY = Math.max(0, Math.min(1, (centerY - gameAreaTop) / gameAreaHeight))
  
  // Stronger convergence at top, less at bottom
  const convergenceFactor = (1 - normalizedY) * PERSPECTIVE_CONFIG.STRENGTH
  
  // Distance from center for skewing
  const distFromCenterX = (centerX - screenCenterX) / CANVAS_CONFIG.WIDTH
  
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    
    // Base vertex position with scale applied to size
    let x = size * Math.cos(angle) * scale
    let y = size * Math.sin(angle) * scale
    
    // Apply horizontal skewing for convergence
    // Vertices on the sides should converge more than top/bottom vertices
    const isVerticalEdge = Math.abs(Math.cos(angle)) < 0.5
    
    if (isVerticalEdge) {
      // For mostly vertical edges, apply stronger convergence
      x = x * (1 - convergenceFactor * 0.4) + distFromCenterX * size * convergenceFactor * 0.3
    } else {
      // For horizontal edges, apply less convergence
      x = x * (1 - convergenceFactor * 0.2)
    }
    
    if (i === 0) {
      path.moveTo(x, y)
    } else {
      path.lineTo(x, y)
    }
  }
  
  path.closePath()
  return path
}

/**
 * Transform a rectangle through perspective (for efficient texture mapping)
 */
export const transformRectangleThroughPerspective = (
  x: number,
  y: number,
  width: number,
  height: number,
  gameAreaTop: number,
  gameAreaHeight: number
): {
  topLeft: {x: number, y: number},
  topRight: {x: number, y: number},
  bottomLeft: {x: number, y: number},
  bottomRight: {x: number, y: number}
} => {
  const corners = [
    { x: x, y: y }, // top-left
    { x: x + width, y: y }, // top-right
    { x: x, y: y + height }, // bottom-left
    { x: x + width, y: y + height } // bottom-right
  ]
  
  const transformedCorners = corners.map(corner => 
    applyViewportPerspective(corner.x, corner.y, gameAreaTop, gameAreaHeight)
  )
  
  return {
    topLeft: transformedCorners[0],
    topRight: transformedCorners[1],
    bottomLeft: transformedCorners[2],
    bottomRight: transformedCorners[3]
  }
}