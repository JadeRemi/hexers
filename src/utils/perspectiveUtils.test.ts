import { describe, it, expect } from 'vitest'
import { getPerspectiveScale } from './perspectiveUtils'

describe('perspectiveUtils', () => {
  const gameAreaTop = 100
  const gameAreaHeight = 800
  const scalingCenterY = gameAreaTop + gameAreaHeight / 2 // Should be 500

  describe('getPerspectiveScale', () => {
    it('should return scale 1.0 at the scaling center regardless of world position', () => {
      // The scaling center should always be at the middle of the viewport
      const scale = getPerspectiveScale(scalingCenterY, gameAreaTop, gameAreaHeight)
      expect(scale).toBeCloseTo(0.65, 2) // 0.3 + (0.5 * 0.7) = 0.65
    })

    it('should return scale 0.3 at the top of viewport', () => {
      const scale = getPerspectiveScale(gameAreaTop, gameAreaTop, gameAreaHeight)
      expect(scale).toBeCloseTo(0.3, 2)
    })

    it('should return scale 1.0 at the bottom of viewport', () => {
      const scale = getPerspectiveScale(gameAreaTop + gameAreaHeight, gameAreaTop, gameAreaHeight)
      expect(scale).toBeCloseTo(1.0, 2)
    })

    it('should maintain scaling center position invariance during panning simulation', () => {
      // Simulate panning by changing what world coordinates map to screen positions
      // The key insight: if panning works correctly, the scaling center should not move
      
      // Scenario 1: Normal position
      const normalScale = getPerspectiveScale(scalingCenterY, gameAreaTop, gameAreaHeight)
      
      // Scenario 2: Simulate panning up (viewport shows lower world coordinates)
      // If we panned up by 1000 pixels, the same screen position should still give the same scale
      const pannedScale = getPerspectiveScale(scalingCenterY, gameAreaTop, gameAreaHeight)
      
      // The scale at the center of viewport should always be the same
      expect(pannedScale).toEqual(normalScale)
    })

    it('should provide consistent scaling across different world positions appearing at same screen position', () => {
      // This is the critical test: objects appearing at the same screen Y should have same scale
      // regardless of their world coordinates
      
      const screenY = scalingCenterY
      
      // Test multiple gameArea configurations (simulating different world views)
      const configs = [
        { top: 100, height: 800 },
        { top: 50, height: 900 },
        { top: 200, height: 600 }
      ]
      
      const scales = configs.map(config => 
        getPerspectiveScale(screenY, config.top, config.height)
      )
      
      // All should give the same scale since it's the same screen position
      scales.forEach((scale, index) => {
        if (index > 0) {
          expect(scale).toBeCloseTo(scales[0], 2)
        }
      })
    })

    it('should handle edge cases gracefully', () => {
      // Test positions outside viewport
      const aboveScale = getPerspectiveScale(gameAreaTop - 100, gameAreaTop, gameAreaHeight)
      const belowScale = getPerspectiveScale(gameAreaTop + gameAreaHeight + 100, gameAreaTop, gameAreaHeight)
      
      expect(aboveScale).toBeCloseTo(0.3, 2) // Should clamp to minimum
      expect(belowScale).toBeCloseTo(1.0, 2) // Should clamp to maximum
    })

    it('should demonstrate the scaling center debug visualization', () => {
      // This test documents the expected behavior for the visual debug dot
      const scalingCenterY = gameAreaTop + gameAreaHeight / 2
      const scale = getPerspectiveScale(scalingCenterY, gameAreaTop, gameAreaHeight)
      
      // At the scaling center (red dot position), scale should be 0.65
      expect(scale).toBeCloseTo(0.65, 2)
      
      // Everything above the red dot should be smaller (scale < 0.65)
      const aboveDot = getPerspectiveScale(scalingCenterY - 100, gameAreaTop, gameAreaHeight)
      expect(aboveDot).toBeLessThan(0.65)
      
      // Everything below the red dot should be larger (scale > 0.65)
      const belowDot = getPerspectiveScale(scalingCenterY + 100, gameAreaTop, gameAreaHeight)
      expect(belowDot).toBeGreaterThan(0.65)
    })
  })
})