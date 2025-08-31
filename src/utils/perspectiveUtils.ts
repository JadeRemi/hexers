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
  gameAreaHeight: number,
  strength: number = PERSPECTIVE_CONFIG.STRENGTH
): { screenX: number, screenY: number, scale: number } => {
  const viewportCenterX = CANVAS_CONFIG.WIDTH / 2
  
  // First apply pan to get screen position
  const screenX = worldX + panOffsetX
  const screenY = worldY + panOffsetY
  
  // Calculate scale based on screen Y position (viewport-based)
  // At strength 0, scale should be 1.0 everywhere (no perspective)
  // At higher strength, scale varies from small at top to large at bottom
  const normalizedY = Math.max(0, Math.min(1, (screenY - gameAreaTop) / gameAreaHeight))
  const scaleVariation = 0.7 * strength // How much scale varies (0 when strength=0)
  const scale = 1 - scaleVariation + (normalizedY * scaleVariation)
  
  // Y compression: at strength 0, no compression (perspectiveY = screenY)
  // At higher strength, compress toward compression center
  const compressionCenterY = gameAreaTop + gameAreaHeight * 0.2
  const yDistFromCompressionCenter = screenY - compressionCenterY
  
  // Compression factor smoothly scales from 1.0 (no compression) to more compression
  const compressionFactor = 1 - (strength * 0.5 * (1 - scale))
  const perspectiveY = compressionCenterY + yDistFromCompressionCenter * compressionFactor
  
  // Horizontal convergence: at strength 0, no convergence (perspectiveX = screenX)
  // At higher strength, converge toward center based on Y position
  const xDistFromCenter = screenX - viewportCenterX
  const convergenceFactor = (1 - normalizedY) * strength * 0.5
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
 * Creates a trapezoidally distorted hexagon to simulate viewing angle
 */
export const createPerspectiveHexagonPath = (
  centerX: number,
  centerY: number,
  size: number,
  scale: number,
  gameAreaTop: number,
  gameAreaHeight: number,
  strength: number = PERSPECTIVE_CONFIG.STRENGTH
): Path2D => {
  const path = new Path2D()
  
  // Vanishing point is at the top center of the screen
  const vanishingX = CANVAS_CONFIG.WIDTH / 2
  
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i // Remove -π/6 to rotate from pointy-top to flat-top
    
    // Base vertex position
    const baseX = size * Math.cos(angle)
    const baseY = size * Math.sin(angle)
    
    // Calculate Y position of this vertex in screen space
    const vertexScreenY = centerY + baseY * scale
    const vertexNormalizedY = Math.max(0, Math.min(1, (vertexScreenY - gameAreaTop) / gameAreaHeight))
    
    // Different scale for top vs bottom of hexagon
    // This creates the trapezoidal distortion
    // At strength 0, vertexPerspectiveScale should be 1.0 everywhere (no distortion)
    const scaleVariation = 0.7 * strength
    const vertexPerspectiveScale = 1 - scaleVariation + (vertexNormalizedY * scaleVariation)
    
    // Apply X convergence toward vanishing point
    // At strength 0, no convergence (convergedX = centerX + baseX * scale)
    const xDistFromVanishing = (centerX + baseX * scale) - vanishingX
    const convergenceAmount = (1 - vertexNormalizedY) * strength * 0.5
    const convergedX = vanishingX + xDistFromVanishing * (1 - convergenceAmount)
    
    // Apply Y compression - stronger at top
    // At strength 0, no compression (compressedY = baseY * scale)
    const yCompressionFactor = 1 - (strength * 0.4 * (1 - vertexPerspectiveScale))
    const compressedY = baseY * scale * yCompressionFactor
    
    // Convert to local coordinates (relative to translate origin at centerX, centerY)
    const localX = convergedX - centerX
    const localY = compressedY
    
    if (i === 0) {
      path.moveTo(localX, localY)
    } else {
      path.lineTo(localX, localY)
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