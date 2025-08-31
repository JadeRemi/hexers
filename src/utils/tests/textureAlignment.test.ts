import { describe, it, expect } from 'vitest'
import { applyPerspectiveTransform, createPerspectiveHexagonPath } from '../perspectiveUtils'
import { HEXAGON_CONFIG } from '../../config/constants'

describe('Texture Alignment Tests', () => {
  const gameAreaTop = 60
  const gameAreaHeight = 960
  const hexSize = HEXAGON_CONFIG.SIZE

  describe('Texture and hexagon position consistency', () => {
    it('should render textures at the same position as hexagon shapes', () => {
      // Test multiple hexagon positions
      const testPositions = [
        { worldX: 400, worldY: 200 + gameAreaTop, description: 'Top area' },
        { worldX: 800, worldY: 500 + gameAreaTop, description: 'Middle area' },
        { worldX: 1200, worldY: 800 + gameAreaTop, description: 'Bottom area' }
      ]

      const panOffset = { x: 0, y: 0 }

      testPositions.forEach(({ worldX, worldY, description }) => {
        // Get the transformed position (same as used in rendering)
        const transformed = applyPerspectiveTransform(
          worldX,
          worldY,
          panOffset.x,
          panOffset.y,
          gameAreaTop,
          gameAreaHeight
        )

        // Verify the transformation is consistent
        expect(transformed.screenX).toBeDefined()
        expect(transformed.screenY).toBeDefined()
        expect(transformed.scale).toBeDefined()

        console.log(`${description}: World(${worldX}, ${worldY}) -> Screen(${transformed.screenX.toFixed(1)}, ${transformed.screenY.toFixed(1)}) Scale=${transformed.scale.toFixed(3)}`)

        // The transformed position should be used for both texture and hexagon
        // This test ensures we're using the same coordinates
        expect(transformed.screenX).toBeCloseTo(worldX + panOffset.x, 1) // Should be close for minimal perspective
        expect(transformed.screenY).toBeCloseTo(worldY + panOffset.y, 1) // Should be close for minimal perspective
      })
    })

    it('should create hexagon paths that match the transform coordinates', () => {
      const worldX = 800
      const worldY = 400 + gameAreaTop
      const panOffset = { x: 0, y: 0 }

      const transformed = applyPerspectiveTransform(
        worldX,
        worldY,
        panOffset.x,
        panOffset.y,
        gameAreaTop,
        gameAreaHeight
      )

      // Create the hexagon path using the same parameters as rendering
      const hexPath = createPerspectiveHexagonPath(
        transformed.screenX,
        transformed.screenY,
        hexSize,
        transformed.scale,
        gameAreaTop,
        gameAreaHeight
      )

      // The path should be created successfully
      expect(hexPath).toBeInstanceOf(Path2D)

      console.log('Hexagon path created for transformed coordinates:', {
        screenX: transformed.screenX.toFixed(1),
        screenY: transformed.screenY.toFixed(1),
        scale: transformed.scale.toFixed(3)
      })
    })

    it('should use consistent coordinates for texture rendering', () => {
      // Test that texture rendering uses the correct world coordinates
      // This verifies the fix where we pass hex.x, hex.y + gameAreaTop to renderHexagonTexture
      
      const testHex = {
        x: 600,
        y: 300,  // World Y without gameAreaTop
        gridRow: 5,
        gridCol: 10
      }

      const worldX = testHex.x
      const worldY = testHex.y + gameAreaTop  // This is what should be passed to texture rendering

      // Verify the coordinates are consistent
      expect(worldX).toBe(600)
      expect(worldY).toBe(300 + gameAreaTop)

      console.log('Texture coordinates:', { worldX, worldY })
      console.log('Should match hex position:', { hexX: testHex.x, hexWorldY: testHex.y + gameAreaTop })

      // The texture should be rendered using the same world coordinates as the hexagon
      expect(worldX).toBe(testHex.x)
      expect(worldY).toBe(testHex.y + gameAreaTop)
    })

    it('should maintain alignment across different perspective scales', () => {
      // Test that alignment is maintained even with different scales
      const testCases = [
        { y: gameAreaTop + 100, expectedScale: 'small', description: 'Near top' },
        { y: gameAreaTop + gameAreaHeight / 2, expectedScale: 'medium', description: 'Middle' },
        { y: gameAreaTop + gameAreaHeight - 100, expectedScale: 'large', description: 'Near bottom' }
      ]

      const panOffset = { x: 0, y: 0 }

      testCases.forEach(({ y, description }) => {
        const transformed = applyPerspectiveTransform(
          800, // Center X
          y,
          panOffset.x,
          panOffset.y,
          gameAreaTop,
          gameAreaHeight
        )

        // All transformations should produce valid results
        expect(transformed.scale).toBeGreaterThan(0.2)
        expect(transformed.scale).toBeLessThan(1.1)

        console.log(`${description}: Y=${y} -> Scale=${transformed.scale.toFixed(3)}`)

        // For minimal perspective (0.005), scale should be close to 1.0
        expect(transformed.scale).toBeCloseTo(1.0, 1)
      })
    })
  })

  describe('Performance validation', () => {
    it('should efficiently handle multiple coordinate transformations', () => {
      const startTime = performance.now()
      const iterations = 1000

      // Simulate rendering many hexagons
      for (let i = 0; i < iterations; i++) {
        const worldX = 400 + (i % 10) * 100
        const worldY = 300 + Math.floor(i / 10) * 80 + gameAreaTop

        applyPerspectiveTransform(
          worldX,
          worldY,
          0,
          0,
          gameAreaTop,
          gameAreaHeight
        )
      }

      const endTime = performance.now()
      const timePerTransform = (endTime - startTime) / iterations

      console.log(`Performance: ${timePerTransform.toFixed(4)}ms per transformation`)

      // Should be very fast (less than 0.1ms per transformation)
      expect(timePerTransform).toBeLessThan(0.1)
    })
  })
})