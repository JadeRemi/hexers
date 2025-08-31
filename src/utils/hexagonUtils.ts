
import { HEXAGON_CONFIG } from '../config/constants'

export interface Hexagon {
  x: number
  y: number
  row: number
  col: number
  gridRow: number
  gridCol: number
  isHovered: boolean
}

export const createHexagonPath = (centerX: number, centerY: number, size: number): Path2D => {
  const path = new Path2D()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i // Remove -π/6 to rotate from pointy-top to flat-top
    const x = centerX + size * Math.cos(angle)
    const y = centerY + size * Math.sin(angle)
    if (i === 0) {
      path.moveTo(x, y)
    } else {
      path.lineTo(x, y)
    }
  }
  path.closePath()
  return path
}

export const createPerspectiveHexagonPath = (
  centerX: number, 
  centerY: number, 
  size: number, 
  _gameAreaTop: number, 
  _gameAreaHeight: number
): Path2D => {
  // This is now implemented in perspectiveUtils.ts
  // Just create a regular hexagon path here as fallback
  return createHexagonPath(centerX, centerY, size)
}

export const calculateHexSize = (): number => {
  // Use configured hex size
  return HEXAGON_CONFIG.SIZE
}

export const generateHexGrid = (
  gap: number,
  canvasWidth: number,
  canvasHeight: number
): Hexagon[] => {
  const hexagons: Hexagon[] = []
  
  const hexSize = calculateHexSize()
  const hexWidth = Math.sqrt(3) * hexSize
  const hexHeight = 2 * hexSize
  
  const horizontalSpacing = hexWidth + gap
  const verticalSpacing = (hexHeight * 0.75) + gap
  
  const colsPerRow = Math.floor((canvasWidth - gap) / horizontalSpacing)
  const actualRows = Math.ceil(canvasHeight / verticalSpacing) + 1
  const totalWidth = colsPerRow * horizontalSpacing
  
  const startY = gap + hexSize
  const startX = (canvasWidth - totalWidth) / 2 + hexWidth / 2
  
  const centerCol = Math.floor(colsPerRow / 2)
  const centerRow = Math.floor(actualRows / 2)

  for (let row = 0; row < actualRows; row++) {
    const isOddRow = row % 2 === 1
    const rowOffset = isOddRow ? horizontalSpacing / 2 : 0
    const cols = isOddRow && rowOffset + (colsPerRow - 1) * horizontalSpacing + hexWidth > canvasWidth - gap
      ? colsPerRow - 1 
      : colsPerRow
    
    for (let col = 0; col < cols; col++) {
      const gridCol = col - centerCol + (isOddRow ? 0 : 0)
      const gridRow = row - centerRow
      
      const y = startY + row * verticalSpacing
      if (y - hexSize > canvasHeight) continue
      
      hexagons.push({
        x: startX + col * horizontalSpacing + rowOffset,
        y,
        row,
        col,
        gridRow,
        gridCol,
        isHovered: false
      })
    }
  }

  return hexagons
}

export const isPointInHexagon = (
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