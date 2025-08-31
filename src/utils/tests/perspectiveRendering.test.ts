import { describe, it, expect } from 'vitest'
import { applyPerspectiveTransform } from '../perspectiveUtils'
import { HEXAGON_CONFIG } from '../../config/constants'

describe('Perspective Row Rendering', () => {
  const gameAreaTop = 60  // CANVAS_CONFIG.PANEL_HEIGHT
  const gameAreaHeight = 960  // CANVAS_CONFIG.HEIGHT - 2 * PANEL_HEIGHT
  const hexSize = HEXAGON_CONFIG.SIZE
  const gap = HEXAGON_CONFIG.CELL_GAP
  
  // Hexagon dimensions
  const hexHeight = 2 * hexSize
  const verticalSpacing = (hexHeight * 0.75) + gap
  
  describe('Row position on canvas', () => {
    it('should show where top visible row renders', () => {
      // Test a row that should be at the top of the visible area
      const topRowY = -500  // World Y position (far above viewport)
      const panOffsetY = 0
      
      const transformed = applyPerspectiveTransform(
        800,  // Center X
        topRowY + gameAreaTop,
        0,
        panOffsetY,
        gameAreaTop,
        gameAreaHeight
      )
      
      console.log('=== TOP ROW RENDERING ===')
      console.log(`World Y: ${topRowY}`)
      console.log(`Screen Y before perspective: ${topRowY + gameAreaTop + panOffsetY}`)
      console.log(`Screen Y after perspective: ${transformed.screenY}`)
      console.log(`Scale: ${transformed.scale}`)
      console.log(`Is visible (should be at top): ${transformed.screenY >= gameAreaTop && transformed.screenY <= gameAreaTop + gameAreaHeight}`)
      
      // The top row should be compressed and appear near the top of the viewport
      expect(transformed.screenY).toBeGreaterThanOrEqual(gameAreaTop - hexSize * 2)
      expect(transformed.scale).toBeLessThan(0.5)  // Should be small at top
    })
    
    it('should show where bottom visible row renders', () => {
      // Test a row that should be at the bottom of the visible area
      const bottomRowY = 900  // World Y position (near bottom)
      const panOffsetY = 0
      
      const transformed = applyPerspectiveTransform(
        800,  // Center X
        bottomRowY + gameAreaTop,
        0,
        panOffsetY,
        gameAreaTop,
        gameAreaHeight
      )
      
      console.log('=== BOTTOM ROW RENDERING ===')
      console.log(`World Y: ${bottomRowY}`)
      console.log(`Screen Y before perspective: ${bottomRowY + gameAreaTop + panOffsetY}`)
      console.log(`Screen Y after perspective: ${transformed.screenY}`)
      console.log(`Scale: ${transformed.scale}`)
      console.log(`Is visible (should be at bottom): ${transformed.screenY >= gameAreaTop && transformed.screenY <= gameAreaTop + gameAreaHeight}`)
      
      // The bottom row should be less compressed and appear near the bottom
      expect(transformed.screenY).toBeLessThanOrEqual(gameAreaTop + gameAreaHeight + hexSize * 2)
      expect(transformed.scale).toBeGreaterThan(0.8)  // Should be large at bottom
    })
    
    it('should calculate row distribution across viewport', () => {
      // Test multiple rows to see how they're distributed
      const rows: Array<{ row: number; worldY: number; screenY: number; scale: number; gap: number }> = []
      const panOffsetY = 0
      
      // Generate rows from top to bottom
      for (let row = -10; row <= 20; row++) {
        const worldY = row * verticalSpacing
        const transformed = applyPerspectiveTransform(
          800,
          worldY + gameAreaTop,
          0,
          panOffsetY,
          gameAreaTop,
          gameAreaHeight
        )
        
        const isVisible = transformed.screenY >= gameAreaTop && 
                         transformed.screenY <= gameAreaTop + gameAreaHeight
        
        if (isVisible) {
          rows.push({
            row,
            worldY,
            screenY: transformed.screenY,
            scale: transformed.scale,
            gap: rows.length > 0 ? transformed.screenY - rows[rows.length - 1].screenY : 0
          })
        }
      }
      
      console.log('=== VISIBLE ROW DISTRIBUTION ===')
      console.log(`Total visible rows: ${rows.length}`)
      console.log('First 3 rows:')
      rows.slice(0, 3).forEach(r => {
        console.log(`  Row ${r.row}: Y=${r.screenY.toFixed(1)}, Scale=${r.scale.toFixed(3)}, Gap=${r.gap.toFixed(1)}`)
      })
      console.log('Last 3 rows:')
      rows.slice(-3).forEach(r => {
        console.log(`  Row ${r.row}: Y=${r.screenY.toFixed(1)}, Scale=${r.scale.toFixed(3)}, Gap=${r.gap.toFixed(1)}`)
      })
      
      // Check that gaps increase from top to bottom
      const topGap = rows[1]?.gap || 0
      const bottomGap = rows[rows.length - 1]?.gap || 0
      
      console.log(`\nGap at top: ${topGap.toFixed(1)}px`)
      console.log(`Gap at bottom: ${bottomGap.toFixed(1)}px`)
      console.log(`Gap ratio (bottom/top): ${(bottomGap/topGap).toFixed(2)}x`)
      
      expect(bottomGap).toBeGreaterThan(topGap)
      expect(rows.length).toBeGreaterThan(5)  // Should have reasonable number of visible rows
    })
    
    it('should fill viewport from top to bottom', () => {
      const rows: Array<{ row: number; worldY: number; screenY: number; scale: number; gap: number }> = []
      const panOffsetY = 0
      
      // Find all visible rows
      for (let row = -20; row <= 30; row++) {
        const worldY = row * verticalSpacing
        const transformed = applyPerspectiveTransform(
          800,
          worldY + gameAreaTop,
          0,
          panOffsetY,
          gameAreaTop,
          gameAreaHeight
        )
        
        if (transformed.screenY >= gameAreaTop - hexSize && 
            transformed.screenY <= gameAreaTop + gameAreaHeight + hexSize) {
          rows.push({
            row,
            worldY,
            screenY: transformed.screenY,
            scale: transformed.scale,
            gap: 0
          })
        }
      }
      
      if (rows.length > 0) {
        const topRowY = rows[0].screenY
        const bottomRowY = rows[rows.length - 1].screenY
        const coverage = bottomRowY - topRowY
        const viewportHeight = gameAreaHeight
        
        console.log('=== VIEWPORT COVERAGE ===')
        console.log(`Top row Y: ${topRowY.toFixed(1)} (should be near ${gameAreaTop})`)
        console.log(`Bottom row Y: ${bottomRowY.toFixed(1)} (should be near ${gameAreaTop + gameAreaHeight})`)
        console.log(`Coverage: ${coverage.toFixed(1)}px of ${viewportHeight}px viewport`)
        console.log(`Coverage ratio: ${(coverage / viewportHeight * 100).toFixed(1)}%`)
        
        // Check that rows cover most of the viewport
        expect(topRowY).toBeLessThanOrEqual(gameAreaTop + 100)  // Top row should be near top
        expect(bottomRowY).toBeGreaterThanOrEqual(gameAreaTop + gameAreaHeight - 100)  // Bottom row should be near bottom
        expect(coverage).toBeGreaterThan(viewportHeight * 0.8)  // Should cover at least 80% of viewport
      }
    })
  })
})