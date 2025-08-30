export const calculateCanvasSize = (
  originalWidth: number,
  originalHeight: number,
  containerWidth: number,
  containerHeight: number
): { width: number; height: number } => {
  const aspectRatio = originalWidth / originalHeight
  const containerAspectRatio = containerWidth / containerHeight

  let width: number
  let height: number

  if (containerAspectRatio > aspectRatio) {
    height = containerHeight * 0.9
    width = height * aspectRatio
  } else {
    width = containerWidth * 0.9
    height = width / aspectRatio
  }

  return { width: Math.floor(width), height: Math.floor(height) }
}

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max)
}

export const lerp = (start: number, end: number, amount: number): number => {
  return start + (end - start) * amount
}

export const randomInRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min
}

export const distance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

export const angleToRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180)
}

export const radiansToDegrees = (radians: number): number => {
  return radians * (180 / Math.PI)
}