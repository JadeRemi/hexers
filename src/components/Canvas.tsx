import React, { useRef, useEffect, useState, useCallback } from 'react'
import { calculateCanvasSize } from '../utils/canvasUtils'
import { generateHexGrid, isPointInHexagon, calculateHexSize, Hexagon } from '../utils/hexagonUtils'
import { NoiseType } from '../utils/textureUtils'
import { CANVAS_CONFIG, HEXAGON_CONFIG } from '../config/constants'
import { initializeNoiseCache } from '../utils/noiseCacheUtils'
import { loadImage, SPRITES } from '../assets'
import { Star, Unit, isPointInButton } from '../utils/canvasDrawUtils'
import { generateStars } from '../utils/starUtils'
import { renderFrame, getButtonPositions, PanOffset } from '../utils/canvasRenderUtils'
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
  const isPanningRef = useRef<boolean>(false)
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ 
    width: CANVAS_CONFIG.WIDTH, 
    height: CANVAS_CONFIG.HEIGHT 
  })
  const [currentNoiseType, setCurrentNoiseType] = useState<NoiseType>('perlin')
  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 })
  
  const gameAreaTop = CANVAS_CONFIG.PANEL_HEIGHT
  const gameAreaHeight = CANVAS_CONFIG.HEIGHT - (CANVAS_CONFIG.PANEL_HEIGHT * 2)
  const hexSize = calculateHexSize(
    HEXAGON_CONFIG.ROWS,
    HEXAGON_CONFIG.CELL_GAP,
    CANVAS_CONFIG.WIDTH,
    gameAreaHeight
  )

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

      renderFrame(
        ctx,
        starsRef.current,
        hexagonsRef.current,
        unitsRef.current,
        wizardImageRef.current,
        hoveredHexRef.current,
        currentNoiseType,
        fpsRef.current,
        gameAreaTop,
        gameAreaHeight,
        hexSize,
        panOffset
      )
      
      lastFrameTimeRef.current = timestamp - (deltaTime % frameTime)
    }

    animationFrameRef.current = requestAnimationFrame(render)
  }, [currentNoiseType, gameAreaTop, gameAreaHeight, hexSize, panOffset])

  const toggleFullscreen = useCallback(() => {
    const element = containerRef.current
    if (!element) return
    
    if (!document.fullscreenElement) {
      element.requestFullscreen().catch(err => {
        console.error('Error entering fullscreen:', err)
      })
    } else {
      document.exitFullscreen().catch(err => {
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
    
    const buttons = getButtonPositions()
    
    // Check noise button
    if (isPointInButton(x, y, buttons.noise.x, buttons.noise.y, buttons.noise.width, buttons.noise.height)) {
      const noiseTypes: NoiseType[] = ['perlin', 'simplex', 'voronoi']
      const currentIndex = noiseTypes.indexOf(currentNoiseType)
      const nextIndex = (currentIndex + 1) % noiseTypes.length
      setCurrentNoiseType(noiseTypes[nextIndex])
      return
    }
    
    // Check fullscreen button
    if (isPointInButton(x, y, buttons.fullscreen.x, buttons.fullscreen.y, buttons.fullscreen.width, buttons.fullscreen.height)) {
      toggleFullscreen()
    }
  }, [currentNoiseType, toggleFullscreen])

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleY = CANVAS_CONFIG.HEIGHT / rect.height
    const y = (event.clientY - rect.top) * scaleY
    
    // Only start panning if clicking in game area
    if (y > gameAreaTop && y < CANVAS_CONFIG.HEIGHT - CANVAS_CONFIG.PANEL_HEIGHT) {
      isPanningRef.current = true
      panStartRef.current = { x: event.clientX - panOffset.x, y: event.clientY - panOffset.y }
      canvas.style.cursor = 'grabbing'
    }
  }, [gameAreaTop, panOffset])

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (isPanningRef.current) {
      const newPanX = event.clientX - panStartRef.current.x
      const newPanY = event.clientY - panStartRef.current.y
      setPanOffset({ x: newPanX, y: newPanY })
      return
    }

    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_CONFIG.WIDTH / rect.width
    const scaleY = CANVAS_CONFIG.HEIGHT / rect.height
    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    // Check if in game area
    if (y > gameAreaTop && y < CANVAS_CONFIG.HEIGHT - CANVAS_CONFIG.PANEL_HEIGHT) {
      // Check for hexagon hover with pan offset
      let foundHex = false
      for (let i = 0; i < hexagonsRef.current.length; i++) {
        const hex = hexagonsRef.current[i]
        if (isPointInHexagon(x - panOffset.x, y - gameAreaTop - panOffset.y, hex.x, hex.y, hexSize)) {
          hoveredHexRef.current = i
          foundHex = true
          canvas.style.cursor = 'pointer'
          break
        }
      }

      if (!foundHex) {
        hoveredHexRef.current = null
        canvas.style.cursor = 'grab'
      }
    } else {
      hoveredHexRef.current = null
      
      // Check buttons
      const buttons = getButtonPositions()
      if (isPointInButton(x, y, buttons.noise.x, buttons.noise.y, buttons.noise.width, buttons.noise.height) ||
          isPointInButton(x, y, buttons.fullscreen.x, buttons.fullscreen.y, buttons.fullscreen.width, buttons.fullscreen.height)) {
        canvas.style.cursor = 'pointer'
      } else {
        canvas.style.cursor = 'default'
      }
    }
  }, [gameAreaTop, hexSize, panOffset])

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default'
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    hoveredHexRef.current = null
    isPanningRef.current = false
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
    // Initialize noise cache on startup for better performance
    initializeNoiseCache()
    
    starsRef.current = generateStars()
    
    loadImage(SPRITES.wizards.wizard1.path).then(img => {
      wizardImageRef.current = img
    })
  }, [])
  
  useEffect(() => {
    hexagonsRef.current = generateHexGrid(
      HEXAGON_CONFIG.ROWS,
      HEXAGON_CONFIG.CELL_GAP,
      CANVAS_CONFIG.WIDTH,
      gameAreaHeight
    )
  }, [gameAreaHeight])
  
  useEffect(() => {
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleCanvasClick}
      />
    </div>
  )
}

export default Canvas