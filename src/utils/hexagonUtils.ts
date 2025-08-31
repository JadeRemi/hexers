import { createPerspectiveHexagonVertices } from './perspectiveUtils'

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
    const angle = (Math.PI / 3) * i - Math.PI / 6
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
  gameAreaTop: number, 
  gameAreaHeight: number
): Path2D => {
  const path = new Path2D()
  const vertices = createPerspectiveHexagonVertices(centerX, centerY, size, gameAreaTop, gameAreaHeight)
  
  vertices.forEach((vertex, i) => {
    if (i === 0) {
      path.moveTo(vertex.x, vertex.y)
    } else {
      path.lineTo(vertex.x, vertex.y)
    }
  })
  
  path.closePath()
  return path
}

export const calculateHexSize = (): number => {
  // Fixed hex size for infinite field with gaps
  return 35
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
  
  if (dx > size || dy > size * Math.sqrt(3) / 2) {
    return false
  }
  
  return dx / size + dy / (size * Math.sqrt(3)) <= 1
}