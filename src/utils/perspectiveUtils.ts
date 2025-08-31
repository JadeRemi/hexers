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
  // At higher strength, scale varies dramatically from tiny at top to large at bottom
  const normalizedY = Math.max(0, Math.min(1, (screenY - gameAreaTop) / gameAreaHeight))
  const scaleVariation = 0.85 * strength // Increased from 0.7 to 0.85 for more dramatic size difference
  const scale = Math.max(0.08, 1 - scaleVariation + (normalizedY * scaleVariation)) // Minimum scale 0.08
  
  // Y compression: compress distances toward horizon (top of viewport)
  // At strength 0, no compression (perspectiveY = screenY)
  // At higher strength, compress Y distances based on distance from horizon
  const horizonY = gameAreaTop + gameAreaHeight * 0.1 // Horizon near top
  const yDistFromHorizon = screenY - horizonY
  
  // Progressive compression: much stronger compression for proper trapezoid effect
  // Objects near horizon get heavily compressed, creating dramatic foreshortening
  const compressionStrength = strength * 1.5 // Increased from 0.6 to 1.5 for proper trapezoid
  const compressionFactor = Math.max(0.1, 1 - (compressionStrength * Math.pow(1 - normalizedY, 1.8)))
  const perspectiveY = horizonY + yDistFromHorizon * compressionFactor
  
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
    
    // Apply X convergence based on Y position (creates trapezoidal distortion)
    
    // Apply X convergence toward vanishing point
    // At strength 0, no convergence (convergedX = centerX + baseX * scale)
    const xDistFromVanishing = (centerX + baseX * scale) - vanishingX
    const convergenceAmount = (1 - vertexNormalizedY) * strength * 0.5
    const convergedX = vanishingX + xDistFromVanishing * (1 - convergenceAmount)
    
    // Apply Y scaling consistently with perspective transform
    // Use the same scale as the main transform - no additional compression here
    const compressedY = baseY * scale
    
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
 * Calculate the visual center of a perspective-distorted hexagon (fast approximation)
 * This accounts for trapezoid distortion that shifts the visual center
 */
export const calculatePerspectiveHexagonCenter = (
  centerX: number,
  centerY: number,
  size: number,
  scale: number,
  gameAreaTop: number,
  gameAreaHeight: number,
  strength: number = PERSPECTIVE_CONFIG.STRENGTH
): { x: number, y: number } => {
  if (strength === 0) {
    return { x: centerX, y: centerY }
  }

  // Fast approximation: only check top and bottom of hexagon for convergence
  // This is much faster than calculating all 6 vertices
  const normalizedY = Math.max(0, Math.min(1, (centerY - gameAreaTop) / gameAreaHeight))
  
  // X convergence based on center position
  const vanishingX = CANVAS_CONFIG.WIDTH / 2
  const xDistFromVanishing = centerX - vanishingX
  const convergenceAmount = (1 - normalizedY) * strength * 0.5
  const visualCenterX = vanishingX + xDistFromVanishing * (1 - convergenceAmount)
  
  // Y position remains centered (the Y compression is handled by main transform)
  const visualCenterY = centerY
  
  return {
    x: visualCenterX,
    y: visualCenterY
  }
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