import { PERSPECTIVE_CONFIG, CANVAS_CONFIG } from '../config/constants'

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
 * Create perspective-transformed hexagon vertices
 * Each vertex gets transformed by the viewport perspective effect
 */
export const createPerspectiveHexagonVertices = (
  centerX: number,
  centerY: number,
  size: number,
  gameAreaTop: number,
  gameAreaHeight: number
): Array<{x: number, y: number}> => {
  const vertices = []
  
  // Get base perspective transform for center
  const centerTransform = applyViewportPerspective(centerX, centerY, gameAreaTop, gameAreaHeight)
  const perspectiveSize = size * centerTransform.scale
  
  // Create hexagon vertices
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const localX = perspectiveSize * Math.cos(angle)
    const localY = perspectiveSize * Math.sin(angle)
    
    // Calculate vertex position in screen space
    const vertexScreenX = centerX + localX
    const vertexScreenY = centerY + localY
    
    // Apply perspective transform to each vertex individually
    const vertexTransform = applyViewportPerspective(vertexScreenX, vertexScreenY, gameAreaTop, gameAreaHeight)
    
    vertices.push({
      x: vertexTransform.x,
      y: vertexTransform.y
    })
  }
  
  return vertices
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