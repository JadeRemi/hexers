import { palette, typography } from '../theme'
import { SPRITES } from '../assets'
import { SPRITE_CONFIG } from '../config/constants'
import { Hexagon } from './hexagonUtils'

export interface Star {
  x: number
  y: number
  size: number
}

export interface Unit {
  gridRow: number
  gridCol: number
  sprite: string
}

export const drawStars = (ctx: CanvasRenderingContext2D, stars: Star[]): void => {
  ctx.fillStyle = palette.stars.color
  for (const star of stars) {
    ctx.beginPath()
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
    ctx.fill()
  }
}

export const drawFPS = (ctx: CanvasRenderingContext2D, fps: number): void => {
  ctx.fillStyle = palette.ui.fps
  ctx.font = `${typography.fontSize.xl} ${typography.fontFamily.primary}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(`FPS: ${Math.round(fps)}`, 20, 20)
}

export const drawUnits = (
  ctx: CanvasRenderingContext2D,
  units: Unit[],
  hexagons: Hexagon[],
  wizardImage: HTMLImageElement | null,
  hexSize: number
): void => {
  if (!wizardImage) return
  
  for (const unit of units) {
    const hex = hexagons.find(h => 
      h.gridRow === unit.gridRow && h.gridCol === unit.gridCol
    )
    
    if (hex) {
      const hexWidth = Math.sqrt(3) * hexSize
      const spriteWidth = hexWidth * SPRITE_CONFIG.UNIT_SCALE
      const spriteHeight = (spriteWidth / SPRITES.wizards.wizard1.width) * SPRITES.wizards.wizard1.height
      
      const x = hex.x - spriteWidth / 2
      const y = hex.y - spriteHeight + SPRITE_CONFIG.UNIT_VERTICAL_OFFSET
      
      ctx.drawImage(
        wizardImage,
        x,
        y,
        spriteWidth,
        spriteHeight
      )
    }
  }
}

export interface ButtonConfig {
  x: number
  y: number
  width: number
  height: number
  text: string
}

export const drawButton = (ctx: CanvasRenderingContext2D, config: ButtonConfig): void => {
  ctx.fillStyle = 'rgba(102, 51, 153, 0.8)'
  ctx.fillRect(config.x, config.y, config.width, config.height)
  
  ctx.strokeStyle = palette.hexagon.borderHover
  ctx.lineWidth = 2
  ctx.strokeRect(config.x, config.y, config.width, config.height)
  
  ctx.fillStyle = palette.text.primary
  ctx.font = `${typography.fontSize.md} ${typography.fontFamily.primary}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(
    config.text,
    config.x + config.width / 2,
    config.y + config.height / 2
  )
}

export const isPointInButton = (
  x: number,
  y: number,
  buttonX: number,
  buttonY: number,
  buttonWidth: number,
  buttonHeight: number
): boolean => {
  return x >= buttonX && x <= buttonX + buttonWidth &&
         y >= buttonY && y <= buttonY + buttonHeight
}