import { HEXAGON_CONFIG, TEXTURE_CONFIG } from '../config/constants'

export const drawPixelatedHexagonBorder = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  color: string
): void => {
  const pixelSize = TEXTURE_CONFIG.PIXELATION_SIZE
  const borderWidth = HEXAGON_CONFIG.BORDER_WIDTH
  
  ctx.save()
  ctx.fillStyle = color
  ctx.imageSmoothingEnabled = false
  
  // Calculate the vertices of the hexagon
  const vertices: Array<[number, number]> = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const x = centerX + size * Math.cos(angle)
    const y = centerY + size * Math.sin(angle)
    vertices.push([x, y])
  }
  
  // Draw pixelated lines between vertices
  for (let i = 0; i < 6; i++) {
    const [x1, y1] = vertices[i]
    const [x2, y2] = vertices[(i + 1) % 6]
    
    drawPixelatedLine(ctx, x1, y1, x2, y2, borderWidth, pixelSize)
  }
  
  ctx.restore()
}

const drawPixelatedLine = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness: number,
  pixelSize: number
): void => {
  const dx = x2 - x1
  const dy = y2 - y1
  const distance = Math.sqrt(dx * dx + dy * dy)
  const steps = Math.ceil(distance / pixelSize)
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = x1 + dx * t
    const y = y1 + dy * t
    
    // Draw a thick pixelated point
    const halfThickness = thickness / 2
    const startX = Math.floor((x - halfThickness) / pixelSize) * pixelSize
    const startY = Math.floor((y - halfThickness) / pixelSize) * pixelSize
    const endX = Math.ceil((x + halfThickness) / pixelSize) * pixelSize
    const endY = Math.ceil((y + halfThickness) / pixelSize) * pixelSize
    
    for (let px = startX; px < endX; px += pixelSize) {
      for (let py = startY; py < endY; py += pixelSize) {
        const distFromLine = Math.abs((py - y1) * dx - (px - x1) * dy) / distance
        if (distFromLine <= halfThickness) {
          ctx.fillRect(px, py, pixelSize, pixelSize)
        }
      }
    }
  }
}