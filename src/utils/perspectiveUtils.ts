import { PERSPECTIVE_CONFIG, CANVAS_CONFIG } from '../config/constants'

export interface PerspectiveTransform {
  x: number
  y: number
  scale: number
}

/**
 * Apply perspective transformation to a point
 * @param x World X coordinate
 * @param y World Y coordinate  
 * @param gameAreaTop Top of game area
 * @param gameAreaHeight Height of game area
 * @returns Transformed coordinates with scale
 */
export const applyPerspective = (
  x: number, 
  y: number, 
  gameAreaTop: number, 
  gameAreaHeight: number
): PerspectiveTransform => {
  if (PERSPECTIVE_CONFIG.STRENGTH === 0) {
    return { x, y, scale: 1 }
  }

  // Convert y to normalized screen space (0 = top, 1 = bottom)
  const normalizedY = (y - gameAreaTop) / gameAreaHeight
  
  // Calculate distance from horizon (0 = at horizon, 1 = at bottom)
  const horizonDistance = Math.max(0, (normalizedY - PERSPECTIVE_CONFIG.HORIZON_Y) / (1 - PERSPECTIVE_CONFIG.HORIZON_Y))
  
  // Scale based on distance from horizon (further = smaller)
  const perspectiveScale = 1 - (PERSPECTIVE_CONFIG.STRENGTH * (1 - horizonDistance))
  const scale = Math.max(0.1, perspectiveScale) // Minimum scale to avoid invisible objects
  
  // Y compression effect - objects further away appear closer together vertically
  const yCompression = 1 - (PERSPECTIVE_CONFIG.STRENGTH * 0.5 * (1 - horizonDistance))
  
  // Apply perspective scaling to X (objects further away move toward center)
  const centerX = CANVAS_CONFIG.WIDTH / 2
  const perspectiveX = centerX + (x - centerX) * scale
  
  // Apply Y compression
  const perspectiveY = gameAreaTop + (y - gameAreaTop) * yCompression
  
  return {
    x: perspectiveX,
    y: perspectiveY,
    scale
  }
}

/**
 * Get the perspective-adjusted noise coordinates for texture rendering
 * @param x World X coordinate
 * @param y World Y coordinate
 * @param gameAreaTop Top of game area
 * @param gameAreaHeight Height of game area
 * @returns Adjusted noise coordinates
 */
export const getPerspectiveNoiseCoords = (
  x: number,
  y: number,
  gameAreaTop: number,
  gameAreaHeight: number
): { x: number, y: number } => {
  if (PERSPECTIVE_CONFIG.STRENGTH === 0) {
    return { x, y }
  }

  // Apply inverse perspective scaling to noise coordinates
  // This ensures texture detail remains consistent across the perspective
  const normalizedY = (y - gameAreaTop) / gameAreaHeight
  const horizonDistance = Math.max(0, (normalizedY - PERSPECTIVE_CONFIG.HORIZON_Y) / (1 - PERSPECTIVE_CONFIG.HORIZON_Y))
  const perspectiveScale = 1 - (PERSPECTIVE_CONFIG.STRENGTH * (1 - horizonDistance))
  const scale = Math.max(0.1, perspectiveScale)
  
  // Inverse scale for noise to maintain texture density
  const noiseScale = 1 / scale
  
  return {
    x: x * noiseScale,
    y: y * noiseScale
  }
}