import React, { useRef, useEffect, useState, useCallback } from 'react'
import { calculateCanvasSize } from '../utils/canvasUtils'
import { generateHexGrid, createHexagonPath, isPointInHexagon, calculateHexSize, Hexagon } from '../utils/hexagonUtils'
import { perlinNoise } from '../utils/noiseUtils'
import { CANVAS_CONFIG, HEXAGON_CONFIG, STARS_CONFIG } from '../config/constants'
import { palette, typography } from '../theme'
import './Canvas.css'

interface Star {
  x: number
  y: number
  size: number
}

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number>()
  const lastFrameTimeRef = useRef<number>(0)
  const fpsRef = useRef<number>(0)
  const frameCountRef = useRef<number>(0)
  const fpsUpdateTimeRef = useRef<number>(0)
  const starsRef = useRef<Star[]>([])
  const hexagonsRef = useRef<Hexagon[]>([])
  const hoveredHexRef = useRef<number | null>(null)
  
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ 
    width: CANVAS_CONFIG.WIDTH, 
    height: CANVAS_CONFIG.HEIGHT 
  })

  const generateStars = useCallback(() => {
    const stars: Star[] = []
    for (let i = 0; i < STARS_CONFIG.STAR_COUNT; i++) {
      const noise = perlinNoise(i * 0.1, i * 0.2)
      const x = Math.random() * CANVAS_CONFIG.WIDTH
      const y = Math.random() * CANVAS_CONFIG.HEIGHT
      const size = STARS_CONFIG.MIN_SIZE + 
        (Math.abs(noise) * (STARS_CONFIG.MAX_SIZE - STARS_CONFIG.MIN_SIZE))
      stars.push({ x, y, size })
    }
    return stars
  }, [])

  const drawStars = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = palette.stars.color
    for (const star of starsRef.current) {
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [])

  const drawHexagons = useCallback((ctx: CanvasRenderingContext2D) => {
    const hexSize = calculateHexSize(
      HEXAGON_CONFIG.ROWS,
      HEXAGON_CONFIG.CELL_GAP,
      CANVAS_CONFIG.WIDTH,
      CANVAS_CONFIG.HEIGHT
    )
    
    for (let i = 0; i < hexagonsRef.current.length; i++) {
      const hex = hexagonsRef.current[i]
      const path = createHexagonPath(hex.x, hex.y, hexSize)
      
      ctx.fillStyle = palette.hexagon.fill
      ctx.fill(path)
      
      ctx.strokeStyle = i === hoveredHexRef.current 
        ? palette.hexagon.borderHover
        : palette.hexagon.borderDefault
      ctx.lineWidth = HEXAGON_CONFIG.BORDER_WIDTH
      ctx.stroke(path)
      
      ctx.fillStyle = palette.hexagon.text
      ctx.font = typography.fontSize.sm
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${hex.gridRow},${hex.gridCol}`, hex.x, hex.y)
    }
  }, [])

  const drawFPS = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = palette.ui.fps
    ctx.font = `${typography.fontSize.xl} ${typography.fontFamily.primary}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`FPS: ${Math.round(fpsRef.current)}`, 20, 20)
  }, [])

  const render = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const frameTime = 1000 / CANVAS_CONFIG.TARGET_FPS
    const deltaTime = timestamp - lastFrameTimeRef.current

    if (deltaTime >= frameTime) {
      frameCountRef.current++
      
      if (timestamp - fpsUpdateTimeRef.current >= 1000) {
        fpsRef.current = frameCountRef.current
        frameCountRef.current = 0
        fpsUpdateTimeRef.current = timestamp
      }

      ctx.fillStyle = palette.background.canvas
      ctx.fillRect(0, 0, CANVAS_CONFIG.WIDTH, CANVAS_CONFIG.HEIGHT)
      
      drawStars(ctx)
      drawHexagons(ctx)
      drawFPS(ctx)
      
      lastFrameTimeRef.current = timestamp - (deltaTime % frameTime)
    }

    animationFrameRef.current = requestAnimationFrame(render)
  }, [drawStars, drawHexagons, drawFPS])

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_CONFIG.WIDTH / rect.width
    const scaleY = CANVAS_CONFIG.HEIGHT / rect.height
    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY
    
    const hexSize = calculateHexSize(
      HEXAGON_CONFIG.ROWS,
      HEXAGON_CONFIG.CELL_GAP,
      CANVAS_CONFIG.WIDTH,
      CANVAS_CONFIG.HEIGHT
    )

    let foundHex = false
    for (let i = 0; i < hexagonsRef.current.length; i++) {
      const hex = hexagonsRef.current[i]
      if (isPointInHexagon(x, y, hex.x, hex.y, hexSize)) {
        hoveredHexRef.current = i
        foundHex = true
        canvas.style.cursor = 'pointer'
        break
      }
    }

    if (!foundHex) {
      hoveredHexRef.current = null
      canvas.style.cursor = 'default'
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    hoveredHexRef.current = null
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default'
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return
      
      const containerWidth = containerRef.current.clientWidth
      const containerHeight = containerRef.current.clientHeight
      const newSize = calculateCanvasSize(
        CANVAS_CONFIG.WIDTH, 
        CANVAS_CONFIG.HEIGHT, 
        containerWidth, 
        containerHeight
      )
      setCanvasSize(newSize)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    starsRef.current = generateStars()
    hexagonsRef.current = generateHexGrid(
      HEXAGON_CONFIG.ROWS,
      HEXAGON_CONFIG.CELL_GAP,
      CANVAS_CONFIG.WIDTH,
      CANVAS_CONFIG.HEIGHT
    )
    
    animationFrameRef.current = requestAnimationFrame(render)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [generateStars, render])

  return (
    <div className="canvas-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        width={CANVAS_CONFIG.WIDTH}
        height={CANVAS_CONFIG.HEIGHT}
        style={{
          width: `${canvasSize.width}px`,
          height: `${canvasSize.height}px`
        }}
        className="game-canvas"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  )
}

export default Canvas