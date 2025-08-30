export const palette = {
  background: {
    primary: '#000000',
    secondary: '#0f0f0f',
    canvas: '#000000'
  },
  hexagon: {
    fill: 'rgba(20, 20, 20, 0.8)',
    borderDefault: '#444444',
    borderHover: '#663399',
    text: '#666666'
  },
  ui: {
    fps: '#00FF00',
    error: '#ff4444',
    warning: '#ffaa00',
    success: '#00ff00',
    info: '#00aaff'
  },
  stars: {
    color: '#FFFFFF'
  },
  text: {
    primary: '#ffffff',
    secondary: '#cccccc',
    muted: '#666666'
  }
} as const

export const typography = {
  fontFamily: {
    primary: '"Jersey 15", monospace',
    fallback: 'monospace'
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '24px',
    xxl: '32px',
    display: '48px'
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    bold: 700
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8
  }
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
} as const

export type Palette = typeof palette
export type Typography = typeof typography
export type Spacing = typeof spacing