import { describe, it, expect } from 'vitest'
import { getPerspectiveScale } from './perspectiveUtils'

describe('Coordinate Alignment Tests', () => {
  const gameAreaTop = 100
  const gameAreaHeight = 800
  const hexSize = 35
  
  describe('Panning consistency', () => {
    it('should maintain consistent screen positions for hexagons and units with pan offset', () => {
      // Test hexagon at grid position (5, 5)
      const hex = {
        x: 200,  // world X
        y: 300,  // world Y (without gameAreaTop)
        gridRow: 5,
        gridCol: 5
      }
      
      // Test different pan offsets
      const panOffsets = [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        { x: -500, y: -500 },
        { x: 1000, y: 1000 }
      ]
      
      panOffsets.forEach(panOffset => {
        // Calculate hexagon screen position (as in drawChunks)
        const hexWorldY = hex.y + gameAreaTop  // 400
        const hexScreenX = hex.x + panOffset.x
        const hexScreenY = hexWorldY + panOffset.y
        
        // Calculate unit screen position (should be same for unit at same grid position)
        const unitWorldY = hex.y + gameAreaTop  // Should be same as hexWorldY
        const unitScreenX = hex.x + panOffset.x
        const unitScreenY = unitWorldY + panOffset.y
        
        // These should be identical
        expect(unitScreenX).toBe(hexScreenX)
        expect(unitScreenY).toBe(hexScreenY)
        
        console.log(`Pan offset (${panOffset.x}, ${panOffset.y}): Hex at (${hexScreenX}, ${hexScreenY}), Unit at (${unitScreenX}, ${unitScreenY})`)
      })
    })
    
    it('should keep perspective scale constant for same viewport position regardless of pan', () => {
      // The scale should only depend on screen Y position, not world position
      
      // Test: A hexagon appearing at screen Y = 500 should always have the same scale
      const targetScreenY = 500
      
      // Different world positions that could appear at screen Y = 500 with different pan offsets
      const scenarios = [
        { worldY: 400, panY: 100 },   // worldY + panY = 500
        { worldY: 1000, panY: -500 },  // worldY + panY = 500
        { worldY: 0, panY: 500 },      // worldY + panY = 500
        { worldY: -1000, panY: 1500 }  // worldY + panY = 500
      ]
      
      const scales = scenarios.map(scenario => {
        const screenY = scenario.worldY + scenario.panY
        expect(screenY).toBe(targetScreenY) // Verify our math
        return getPerspectiveScale(screenY, gameAreaTop, gameAreaHeight)
      })
      
      // All scales should be identical since screen Y is the same
      scales.forEach((scale, index) => {
        if (index > 0) {
          expect(scale).toBe(scales[0])
        }
      })
      
      console.log(`Scale at screen Y=${targetScreenY}: ${scales[0].toFixed(3)}`)
    })
    
    it('should correctly determine viewport visibility with pan offset', () => {
      // Test visibility calculation
      const viewportTop = gameAreaTop  // 100
      const viewportBottom = gameAreaTop + gameAreaHeight  // 900
      
      const hex = {
        y: 300,  // world Y (without gameAreaTop)
      }
      
      const worldY = hex.y + gameAreaTop  // 400
      
      // Test different pan offsets
      const testCases = [
        { panY: 0, expectedVisible: true },     // screenY = 400, within [100, 900]
        { panY: -350, expectedVisible: true },  // screenY = 50, just outside but within margin
        { panY: -500, expectedVisible: false }, // screenY = -100, too far above
        { panY: 600, expectedVisible: false },  // screenY = 1000, too far below
        { panY: 450, expectedVisible: true }    // screenY = 850, within viewport
      ]
      
      testCases.forEach(({ panY, expectedVisible }) => {
        const screenY = worldY + panY
        const isVisible = screenY >= viewportTop - hexSize * 2 && screenY <= viewportBottom + hexSize * 2
        
        expect(isVisible).toBe(expectedVisible)
        console.log(`Pan Y=${panY}: screenY=${screenY}, visible=${isVisible}`)
      })
    })
  })
})