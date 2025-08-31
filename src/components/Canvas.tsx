import React, { useRef, useEffect, useState, useCallback } from 'react'
import { calculateCanvasSize } from '../utils/canvasUtils'
import { calculateHexSize } from '../utils/hexagonUtils'
import { isPointInPerspectiveHexagon } from '../utils/perspectiveHoverUtils'
import { getVisibleChunks, updateLoadedChunks, Chunk } from '../utils/chunkUtils'
import { NoiseType } from '../utils/textureUtils'
import { CANVAS_CONFIG } from '../config/constants'
import { loadImage, SPRITES } from '../assets'
import { Star, Unit, isPointInButton } from '../utils/canvasDrawUtils'
import { generateStars } from '../utils/starUtils'
import { renderFrame, getButtonPositions, PanOffset } from '../utils/canvasRenderUtils'
import { generateSeed } from '../utils/seedUtils'
import { buildOccupationMap, CellOccupation } from '../utils/unitUtils'
import { setTerrainSeed } from '../utils/terrainUtils'
import { GradientState, updateGradientRotation } from '../utils/animatedBorderUtils'
import { clearChunkCache } from '../utils/chunkCacheUtils'
import { setBoulderSeed } from '../utils/boulderUtils'
import { setWaterSeed } from '../utils/textureUtils'
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
  const chunksRef = useRef<Map<string, Chunk>>(new Map())
  const hoveredHexRef = useRef<number | null>(null)
  const spritesRef = useRef<{ [key: string]: HTMLImageElement }>({})
  const unitsRef = useRef<Unit[]>([])
  const occupationRef = useRef<CellOccupation>({})
  const isPanningRef = useRef<boolean>(false)
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const seedRef = useRef<string>(generateSeed())
  const gradientStateRef = useRef<GradientState>({ rotation: 0, lastUpdate: 0 })
  
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ 
    width: CANVAS_CONFIG.WIDTH, 
    height: CANVAS_CONFIG.HEIGHT 
  })
  const [currentNoiseType, setCurrentNoiseType] = useState<NoiseType>('simplex')
  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 })
  const [perspectiveStrength, setPerspectiveStrength] = useState<number>(0.3)
  
  const gameAreaTop = CANVAS_CONFIG.PANEL_HEIGHT
  const gameAreaHeight = CANVAS_CONFIG.HEIGHT - (CANVAS_CONFIG.PANEL_HEIGHT * 2)
  const hexSize = calculateHexSize()

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

      // Update gradient rotation for animated border
      const gradientRotation = updateGradientRotation(gradientStateRef.current, timestamp)

      renderFrame(
        ctx,
        starsRef.current,
        chunksRef.current,
        unitsRef.current,
        spritesRef.current,
        hoveredHexRef.current,
        currentNoiseType,
        fpsRef.current,
        gameAreaTop,
        gameAreaHeight,
        hexSize,
        panOffset,
        gradientRotation,
        timestamp,
        perspectiveStrength
      )
      
      lastFrameTimeRef.current = timestamp - (deltaTime % frameTime)
    }

    animationFrameRef.current = requestAnimationFrame(render)
  }, [currentNoiseType, gameAreaTop, gameAreaHeight, hexSize, panOffset, perspectiveStrength])

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
    
    // Check perspective decrement button
    if (isPointInButton(x, y, buttons.perspectiveDec.x, buttons.perspectiveDec.y, buttons.perspectiveDec.width, buttons.perspectiveDec.height)) {
      setPerspectiveStrength(prev => Math.max(0, prev - 0.05))
      return
    }
    
    // Check perspective increment button
    if (isPointInButton(x, y, buttons.perspectiveInc.x, buttons.perspectiveInc.y, buttons.perspectiveInc.width, buttons.perspectiveInc.height)) {
      setPerspectiveStrength(prev => Math.min(1, prev + 0.05))
      return
    }
    
    // Check noise button
    if (isPointInButton(x, y, buttons.noise.x, buttons.noise.y, buttons.noise.width, buttons.noise.height)) {
      const noiseTypes: NoiseType[] = ['perlin', 'simplex', 'voronoi']
      const currentIndex = noiseTypes.indexOf(currentNoiseType)
      const nextIndex = (currentIndex + 1) % noiseTypes.length
      clearChunkCache() // Clear cached chunks when noise type changes
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
      // Check for hexagon hover with perspective transformation
      let foundHex = false
      let hexIndex = 0
      for (const chunk of chunksRef.current.values()) {
        for (const hex of chunk.hexagons) {
          if (isPointInPerspectiveHexagon(x, y, hex, hexSize, panOffset, gameAreaTop, gameAreaHeight, perspectiveStrength)) {
            hoveredHexRef.current = hexIndex
            foundHex = true
            canvas.style.cursor = 'pointer'
            break
          }
          hexIndex++
        }
        if (foundHex) break
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
          isPointInButton(x, y, buttons.fullscreen.x, buttons.fullscreen.y, buttons.fullscreen.width, buttons.fullscreen.height) ||
          isPointInButton(x, y, buttons.perspectiveDec.x, buttons.perspectiveDec.y, buttons.perspectiveDec.width, buttons.perspectiveDec.height) ||
          isPointInButton(x, y, buttons.perspectiveInc.x, buttons.perspectiveInc.y, buttons.perspectiveInc.width, buttons.perspectiveInc.height)) {
        canvas.style.cursor = 'pointer'
      } else {
        canvas.style.cursor = 'default'
      }
    }
  }, [gameAreaTop, gameAreaHeight, hexSize, panOffset, perspectiveStrength])

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
    // Set terrain, boulder, and water seeds
    setTerrainSeed(seedRef.current)
    setBoulderSeed(seedRef.current)
    setWaterSeed(seedRef.current)
    
    // Generate stars
    starsRef.current = generateStars()
    
    // Load all sprites
    Promise.all([
      loadImage(SPRITES.wizards.wizard1.path).then(img => ({ key: 'wizard1', img })),
      loadImage(SPRITES.obstacles.boulder.path).then(img => ({ key: 'boulder', img }))
    ]).then(results => {
      const sprites: { [key: string]: HTMLImageElement } = {}
      for (const { key, img } of results) {
        sprites[key] = img
      }
      spritesRef.current = sprites
    })
    
    console.log(`Session seed: ${seedRef.current}`)
  }, [])
  
  // Initialize camera position to center on cell (1,1) - temporarily disabled for debugging
  useEffect(() => {
    // Reset to default pan offset
    setPanOffset({ x: 0, y: 0 })
  }, [hexSize, gameAreaTop, gameAreaHeight])
  
  // Initialize chunks on mount
  useEffect(() => {
    const visibleChunks = getVisibleChunks(panOffset.x, panOffset.y, hexSize, gameAreaHeight)
    chunksRef.current = updateLoadedChunks(new Map(), visibleChunks, hexSize)
  }, [hexSize, gameAreaHeight, panOffset.x, panOffset.y])
  
  // Initialize wizard unit once
  useEffect(() => {
    unitsRef.current = [{
      type: 'wizard',
      gridRow: 1,
      gridCol: 1,
      sprite: 'wizard1'
    }]
    // Note: boulder occupation will be calculated dynamically
    occupationRef.current = buildOccupationMap(unitsRef.current)
  }, [])
  
  // Update chunks only when pan changes significantly
  useEffect(() => {
    const updateTimer = setTimeout(() => {
      const visibleChunks = getVisibleChunks(panOffset.x, panOffset.y, hexSize, gameAreaHeight)
      const newChunks = updateLoadedChunks(chunksRef.current, visibleChunks, hexSize)
      
      // Only update if chunks actually changed
      if (newChunks.size !== chunksRef.current.size || 
          ![...newChunks.keys()].every(key => chunksRef.current.has(key))) {
        chunksRef.current = newChunks
      }
    }, 200) // Throttle to 200ms
    
    return () => clearTimeout(updateTimer)
  }, [panOffset.x, panOffset.y, hexSize, gameAreaHeight])
  
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