import React, { useRef, useEffect, useState, useCallback } from 'react'
import { calculateCanvasSize } from '../utils/canvasUtils'
import { generateHexGrid, createHexagonPath, isPointInHexagon, calculateHexSize, Hexagon } from '../utils/hexagonUtils'
import { renderHexagonTexture, NoiseType, clearNoiseCache } from '../utils/textureUtils'
import { CANVAS_CONFIG, HEXAGON_CONFIG } from '../config/constants'
import { drawPixelatedHexagonBorder } from '../utils/borderUtils'
import { getTerrainForHexagon } from '../utils/terrainUtils'
import { palette, typography } from '../theme'
import { loadImage, SPRITES } from '../assets'
import { Star, Unit, drawStars, drawFPS, drawUnits, drawButton, isPointInButton } from '../utils/canvasDrawUtils'
import { generateStars } from '../utils/starUtils'
import './Canvas.css'

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
  const wizardImageRef = useRef<HTMLImageElement | null>(null)
  const unitsRef = useRef<Unit[]>([{ gridRow: 1, gridCol: 1, sprite: 'wizard1' }])
  
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ 
    width: CANVAS_CONFIG.WIDTH, 
    height: CANVAS_CONFIG.HEIGHT 
  })
  const [currentNoiseType, setCurrentNoiseType] = useState<NoiseType>('perlin')
  const [isFullscreen, setIsFullscreen] = useState(false)

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
      
      ctx.save()
      ctx.clip(path)
      
      const terrainType = getTerrainForHexagon(hex.gridRow, hex.gridCol)
      
      renderHexagonTexture(ctx, hex.x, hex.y, hexSize, currentNoiseType, terrainType)
      
      ctx.restore()
      
      // Draw pixelated border
      const borderColor = i === hoveredHexRef.current 
        ? palette.hexagon.borderHover
        : palette.hexagon.borderDefault
      drawPixelatedHexagonBorder(ctx, hex.x, hex.y, hexSize, borderColor)
      
      ctx.fillStyle = palette.hexagon.text
      ctx.font = typography.fontSize.sm
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${hex.gridRow},${hex.gridCol}`, hex.x, hex.y)
    }
  }, [currentNoiseType])

  const drawButtons = useCallback((ctx: CanvasRenderingContext2D) => {
    const buttonWidth = 150
    const buttonHeight = 40
    const buttonSpacing = 10
    const buttonX = CANVAS_CONFIG.WIDTH - buttonWidth - 20
    
    drawButton(ctx, {
      x: buttonX,
      y: 20,
      width: buttonWidth,
      height: buttonHeight,
      text: `Noise: ${currentNoiseType}`
    })
    
    drawButton(ctx, {
      x: buttonX,
      y: 20 + buttonHeight + buttonSpacing,
      width: buttonWidth,
      height: buttonHeight,
      text: isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'
    })
  }, [currentNoiseType, isFullscreen])

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

      ctx.imageSmoothingEnabled = false
      ctx.fillStyle = palette.background.canvas
      ctx.fillRect(0, 0, CANVAS_CONFIG.WIDTH, CANVAS_CONFIG.HEIGHT)
      
      drawStars(ctx, starsRef.current)
      drawHexagons(ctx)
      
      const hexSize = calculateHexSize(
        HEXAGON_CONFIG.ROWS,
        HEXAGON_CONFIG.CELL_GAP,
        CANVAS_CONFIG.WIDTH,
        CANVAS_CONFIG.HEIGHT
      )
      drawUnits(ctx, unitsRef.current, hexagonsRef.current, wizardImageRef.current, hexSize)
      drawFPS(ctx, fpsRef.current)
      drawButtons(ctx)
      
      lastFrameTimeRef.current = timestamp - (deltaTime % frameTime)
    }

    animationFrameRef.current = requestAnimationFrame(render)
  }, [drawHexagons, drawButtons])

  const toggleFullscreen = useCallback(() => {
    const element = containerRef.current
    if (!element) return
    
    if (!document.fullscreenElement) {
      element.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch(err => {
        console.error('Error entering fullscreen:', err)
      })
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
      }).catch(err => {
        console.error('Error exiting fullscreen:', err)
      })
    }
  }, [])

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_CONFIG.WIDTH / rect.width
    const scaleY = CANVAS_CONFIG.HEIGHT / rect.height
    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY
    
    const buttonWidth = 150
    const buttonHeight = 40
    const buttonSpacing = 10
    const buttonX = CANVAS_CONFIG.WIDTH - buttonWidth - 20
    
    // Check noise button
    if (isPointInButton(x, y, buttonX, 20, buttonWidth, buttonHeight)) {
      const noiseTypes: NoiseType[] = ['perlin', 'simplex', 'voronoi']
      const currentIndex = noiseTypes.indexOf(currentNoiseType)
      const nextIndex = (currentIndex + 1) % noiseTypes.length
      clearNoiseCache()
      setCurrentNoiseType(noiseTypes[nextIndex])
      return
    }
    
    // Check fullscreen button
    const fullscreenButtonY = 20 + buttonHeight + buttonSpacing
    if (isPointInButton(x, y, buttonX, fullscreenButtonY, buttonWidth, buttonHeight)) {
      toggleFullscreen()
    }
  }, [currentNoiseType, toggleFullscreen])

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
    
    const buttonWidth = 150
    const buttonHeight = 40
    const buttonSpacing = 10
    const buttonX = CANVAS_CONFIG.WIDTH - buttonWidth - 20
    
    if (isPointInButton(x, y, buttonX, 20, buttonWidth, buttonHeight) ||
        isPointInButton(x, y, buttonX, 20 + buttonHeight + buttonSpacing, buttonWidth, buttonHeight)) {
      canvas.style.cursor = 'pointer'
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

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      handleResize()
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  useEffect(() => {
    clearNoiseCache()
  }, [currentNoiseType])

  useEffect(() => {
    starsRef.current = generateStars()
    hexagonsRef.current = generateHexGrid(
      HEXAGON_CONFIG.ROWS,
      HEXAGON_CONFIG.CELL_GAP,
      CANVAS_CONFIG.WIDTH,
      CANVAS_CONFIG.HEIGHT
    )
    
    loadImage(SPRITES.wizards.wizard1.path).then(img => {
      wizardImageRef.current = img
    })
    
    animationFrameRef.current = requestAnimationFrame(render)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [render])

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
        onClick={handleCanvasClick}
      />
    </div>
  )
}

export default Canvas