export const CANVAS_CONFIG = {
  WIDTH: 1920,
  HEIGHT: 1080,
  TARGET_FPS: 60,
  PANEL_HEIGHT: 60
} as const

export const HEXAGON_CONFIG = {
  ROWS: 10,
  BORDER_WIDTH: 8,
  CELL_GAP: 12,
  GRADIENT_ROTATION_SPEED: 0.002 // radians per millisecond (doubled from 0.001)
} as const

export const STARS_CONFIG = {
  STAR_COUNT: 300,
  MIN_SIZE: 0.5,
  MAX_SIZE: 2
} as const

export const TEXTURE_CONFIG = {
  PIXELATION_SIZE: 8,
  NOISE_SCALE: 0.05,
  NOISE_ZOOM: 0.03,
  VORONOI_ZOOM_MULTIPLIER: 0.3, // Makes voronoi more zoomed out (smaller value = more zoomed out)
  NOISE_CONTRAST: 1.5, // Increases contrast (higher = more contrast)
  SATURATION_EFFECT: 0.3 // How much noise affects saturation (0-1)
} as const

export const TERRAIN_TYPES = {
  sand: { 
    name: 'sand',
    color: { r: 194, g: 178, b: 128 }
  },
  grass: { 
    name: 'grass',
    color: { r: 86, g: 125, b: 70 }
  },
  dirt: { 
    name: 'dirt',
    color: { r: 101, g: 67, b: 33 }
  },
  water: {
    name: 'water',
    color: { r: 64, g: 164, b: 223 }
  },
  snow: {
    name: 'snow',
    color: { r: 245, g: 245, b: 235 }
  }
} as const

export type TerrainType = keyof typeof TERRAIN_TYPES

export const UI_ICONS = {
  FULLSCREEN: '⛶',
  EXIT_FULLSCREEN: '⛶'
} as const

export const SPRITE_CONFIG = {
  UNIT_SCALE: 1.0,
  UNIT_VERTICAL_OFFSET: 0
} as const