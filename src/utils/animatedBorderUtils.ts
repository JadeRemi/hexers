import { HEXAGON_CONFIG, TEXTURE_CONFIG } from '../config/constants'

export interface GradientState {
  rotation: number
  lastUpdate: number
}

export const updateGradientRotation = (state: GradientState, currentTime: number): number => {
  const deltaTime = currentTime - state.lastUpdate
  state.rotation = (state.rotation + HEXAGON_CONFIG.GRADIENT_ROTATION_SPEED * deltaTime) % (Math.PI * 2)
  state.lastUpdate = currentTime
  return state.rotation
}

export const getGradientColorAt = (
  angle: number,
  rotation: number
): { r: number; g: number; b: number } => {
  // Normalize angle relative to rotation
  const relativeAngle = (angle - rotation + Math.PI * 2) % (Math.PI * 2)
  
  // Create a gradient that cycles through purple shades
  const gradientPosition = relativeAngle / (Math.PI * 2)
  
  // Purple gradient from light purple (153, 102, 255) to dark purple (51, 0, 102)
  const lightness = 0.5 + 0.5 * Math.sin(gradientPosition * Math.PI * 2)
  
  // Interpolate between dark and light purple
  const r = Math.floor(51 + 102 * lightness)
  const g = Math.floor(0 + 102 * lightness)
  const b = Math.floor(102 + 153 * lightness)
  
  return { r, g, b }
}

export const drawAnimatedHexagonBorder = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  rotation: number
): void => {
  ctx.save()
  ctx.lineWidth = HEXAGON_CONFIG.BORDER_WIDTH
  ctx.imageSmoothingEnabled = false
  ctx.lineCap = 'square'
  ctx.lineJoin = 'miter'
  
  // Calculate the vertices of the hexagon
  const vertices: Array<[number, number]> = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i // Remove -π/6 to rotate from pointy-top to flat-top
    const x = centerX + size * Math.cos(angle)
    const y = centerY + size * Math.sin(angle)
    vertices.push([x, y])
  }
  
  // Draw each edge as segments with gradient colors
  for (let i = 0; i < 6; i++) {
    const [x1, y1] = vertices[i]
    const [x2, y2] = vertices[(i + 1) % 6]
    
    // Calculate distance for this edge
    const dx = x2 - x1
    const dy = y2 - y1
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    // Number of segments based on gradient pixelation
    const numSegments = Math.ceil(distance / TEXTURE_CONFIG.PIXELATION_SIZE)
    
    for (let j = 0; j < numSegments; j++) {
      const t1 = j / numSegments
      const t2 = Math.min((j + 1) / numSegments, 1)
      
      const segX1 = x1 + dx * t1
      const segY1 = y1 + dy * t1
      const segX2 = x1 + dx * t2
      const segY2 = y1 + dy * t2
      
      // Get color for this segment based on its position
      const midX = (segX1 + segX2) / 2
      const midY = (segY1 + segY2) / 2
      
      // Quantize position to gradient pixel grid
      const gradientPixelSize = TEXTURE_CONFIG.PIXELATION_SIZE
      const gradientPixelX = Math.floor(midX / gradientPixelSize) * gradientPixelSize + gradientPixelSize / 2
      const gradientPixelY = Math.floor(midY / gradientPixelSize) * gradientPixelSize + gradientPixelSize / 2
      const gradientAngle = Math.atan2(gradientPixelY - centerY, gradientPixelX - centerX)
      const color = getGradientColorAt(gradientAngle, rotation)
      
      // Draw this segment with stroke (same as normal border but with color)
      ctx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
      ctx.beginPath()
      ctx.moveTo(segX1, segY1)
      ctx.lineTo(segX2, segY2)
      ctx.stroke()
    }
  }
  
  ctx.restore()
}