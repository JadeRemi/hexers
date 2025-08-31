import { describe, it, expect } from 'vitest'
import { applyPerspectiveTransform } from '../perspectiveUtils'

describe('Zero Perspective Tests', () => {
  const gameAreaTop = 60
  const gameAreaHeight = 960
  
  describe('At strength 0.000', () => {
    it('should return exact original coordinates with no transformation', () => {
      const testCases = [
        { worldX: 400, worldY: 300, panX: 0, panY: 0 },
        { worldX: 800, worldY: 500, panX: 100, panY: -50 },
        { worldX: 1200, worldY: 800, panX: -200, panY: 150 },
        { worldX: 0, worldY: 0, panX: 500, panY: 300 }
      ]
      
      testCases.forEach(({ worldX, worldY, panX, panY }) => {
        const result = applyPerspectiveTransform(
          worldX, 
          worldY, 
          panX, 
          panY, 
          gameAreaTop, 
          gameAreaHeight, 
          0.0 // Zero strength
        )
        
        // At zero strength, output should equal input + pan offset exactly
        const expectedScreenX = worldX + panX
        const expectedScreenY = worldY + panY
        
        console.log(`Input: world(${worldX}, ${worldY}) pan(${panX}, ${panY})`)
        console.log(`Expected: screen(${expectedScreenX}, ${expectedScreenY}) scale=1`)
        console.log(`Actual: screen(${result.screenX.toFixed(3)}, ${result.screenY.toFixed(3)}) scale=${result.scale.toFixed(3)}`)
        console.log('---')
        
        expect(result.screenX).toBe(expectedScreenX)
        expect(result.screenY).toBe(expectedScreenY) 
        expect(result.scale).toBe(1.0)
      })
    })
    
    it('should have scale = 1.0 everywhere regardless of Y position', () => {
      const yPositions = [
        gameAreaTop, // Top of viewport
        gameAreaTop + gameAreaHeight / 4, // Quarter down
        gameAreaTop + gameAreaHeight / 2, // Middle
        gameAreaTop + 3 * gameAreaHeight / 4, // Three quarters down
        gameAreaTop + gameAreaHeight // Bottom of viewport
      ]
      
      yPositions.forEach((worldY, index) => {
        const result = applyPerspectiveTransform(
          800, // Center X
          worldY,
          0, 0, // No pan
          gameAreaTop,
          gameAreaHeight,
          0.0 // Zero strength
        )
        
        console.log(`Position ${index + 1}: Y=${worldY} -> Scale=${result.scale.toFixed(6)}`)
        expect(result.scale).toBe(1.0)
      })
    })
    
    it('should have no compression or convergence effects', () => {
      // Test parallel columns at different X positions
      const xPositions = [100, 400, 800, 1200, 1600]
      const testY = gameAreaTop + gameAreaHeight / 2
      
      const results = xPositions.map(worldX => {
        return applyPerspectiveTransform(
          worldX,
          testY,
          0, 0, // No pan
          gameAreaTop,
          gameAreaHeight, 
          0.0 // Zero strength
        )
      })
      
      // All X positions should maintain their exact spacing
      console.log('Parallel column test (should maintain exact spacing):')
      results.forEach((result, index) => {
        const originalX = xPositions[index]
        console.log(`Column ${index}: ${originalX} -> ${result.screenX.toFixed(3)} (diff: ${(result.screenX - originalX).toFixed(3)})`)
        expect(result.screenX).toBe(originalX)
      })
      
      // Check that columns are perfectly parallel (same transformation for all Y positions)
      const topY = gameAreaTop + 100
      const bottomY = gameAreaTop + gameAreaHeight - 100
      
      console.log('\\nParallel test across Y positions:')
      xPositions.forEach((worldX, index) => {
        const topResult = applyPerspectiveTransform(worldX, topY, 0, 0, gameAreaTop, gameAreaHeight, 0.0)
        const bottomResult = applyPerspectiveTransform(worldX, bottomY, 0, 0, gameAreaTop, gameAreaHeight, 0.0)
        
        const topTransform = topResult.screenX - worldX
        const bottomTransform = bottomResult.screenX - worldX
        
        console.log(`Column ${index} (X=${worldX}): top transform=${topTransform.toFixed(6)}, bottom transform=${bottomTransform.toFixed(6)}`)
        expect(topTransform).toBe(bottomTransform) // Should be identical (perfectly parallel)
      })
    })
    
    it('should detect any remaining perspective calculations', () => {
      // This test will help identify what calculations are still happening
      const worldX = 800
      const worldY = gameAreaTop + gameAreaHeight / 2
      
      const result = applyPerspectiveTransform(
        worldX,
        worldY,
        0, 0, // No pan
        gameAreaTop,
        gameAreaHeight,
        0.0 // Zero strength
      )
      
      console.log('\\n=== ZERO PERSPECTIVE ANALYSIS ===')
      console.log(`World coordinates: (${worldX}, ${worldY})`)
      console.log(`Result coordinates: (${result.screenX}, ${result.screenY})`)
      console.log(`Scale: ${result.scale}`)
      console.log(`Any transformation applied: X=${result.screenX !== worldX}, Y=${result.screenY !== worldY}, Scale=${result.scale !== 1.0}`)
      
      // Should be exact match
      expect(result.screenX).toBe(worldX)
      expect(result.screenY).toBe(worldY)
      expect(result.scale).toBe(1.0)
    })
  })
  
  describe('Smooth scaling from 0.0 to 0.1', () => {
    it('should show smooth progression of perspective effects', () => {
      const strengths = [0.0, 0.05, 0.1]
      const worldX = 1200 // Off-center to see convergence
      const worldY = gameAreaTop + 100 // Near top to see scale effects
      
      console.log('\\n=== SMOOTH SCALING TEST ===')
      strengths.forEach(strength => {
        const result = applyPerspectiveTransform(
          worldX, worldY, 0, 0,
          gameAreaTop, gameAreaHeight, strength
        )
        
        const xConvergence = result.screenX - worldX
        const yCompression = result.screenY - worldY
        
        console.log(`Strength ${strength.toFixed(3)}: X convergence=${xConvergence.toFixed(3)}, Y compression=${yCompression.toFixed(3)}, Scale=${result.scale.toFixed(3)}`)
      })
      
      // At 0.0, should be zero transformation
      const zeroResult = applyPerspectiveTransform(worldX, worldY, 0, 0, gameAreaTop, gameAreaHeight, 0.0)
      expect(zeroResult.screenX).toBe(worldX)
      expect(zeroResult.screenY).toBe(worldY)
      expect(zeroResult.scale).toBe(1.0)
    })
    
    it('should ensure cells in same column have identical X coordinates across different rows', () => {
      // Test that row 1, row 5, and row 11 cells in same column have identical X coords
      const columnX = 800 // A specific column position
      const testRows = [1, 5, 11]
      const testResults = []
      
      console.log('\\n=== COLUMN ALIGNMENT TEST ===')
      
      for (const rowIndex of testRows) {
        // Calculate world Y position for this row (simulating hexagon positioning)
        const hexRowSpacing = 138 // Approximate hex row spacing
        const worldY = gameAreaTop + rowIndex * hexRowSpacing
        
        const result = applyPerspectiveTransform(
          columnX, // Same X for all rows
          worldY,
          0, 0, // No pan
          gameAreaTop,
          gameAreaHeight,
          0.0 // Zero strength
        )
        
        testResults.push(result)
        console.log(`Row ${rowIndex}: World(${columnX}, ${worldY}) -> Screen(${result.screenX.toFixed(6)}, ${result.screenY.toFixed(3)})`)
      }
      
      // All X coordinates should be identical
      const firstX = testResults[0].screenX
      testResults.forEach((result, index) => {
        const rowNum = testRows[index]
        expect(result.screenX).toBe(firstX) // Must be exactly equal, not just close
        console.log(`Row ${rowNum}: X = ${result.screenX} (matches row 1: ${result.screenX === firstX})`)
      })
      
      console.log(`Column alignment verified: All cells at X=${columnX} have identical screen X coordinates`)
    })
  })
})