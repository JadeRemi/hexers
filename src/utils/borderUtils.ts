import { HEXAGON_CONFIG } from '../config/constants'

export const drawPixelatedHexagonBorder = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  color: string
): void => {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = HEXAGON_CONFIG.BORDER_WIDTH
  ctx.imageSmoothingEnabled = false
  
  // Simple stroked hexagon path - much faster than pixel-by-pixel
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const x = centerX + size * Math.cos(angle)
    const y = centerY + size * Math.sin(angle)
    
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.closePath()
  ctx.stroke()
  
  ctx.restore()
}