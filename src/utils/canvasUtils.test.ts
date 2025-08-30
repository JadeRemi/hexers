import { describe, it, expect } from 'vitest'
import {
  calculateCanvasSize,
  clamp,
  lerp,
  randomInRange,
  distance,
  angleToRadians,
  radiansToDegrees
} from './canvasUtils'

describe('canvasUtils', () => {
  describe('calculateCanvasSize', () => {
    it('should scale canvas to fit wider container', () => {
      const result = calculateCanvasSize(1920, 1080, 2000, 1200)
      expect(result.width).toBeLessThanOrEqual(2000 * 0.9)
      expect(result.height).toBeLessThanOrEqual(1200 * 0.9)
      expect(result.width / result.height).toBeCloseTo(1920 / 1080, 2)
    })

    it('should scale canvas to fit taller container', () => {
      const result = calculateCanvasSize(1920, 1080, 1000, 2000)
      expect(result.width).toBeLessThanOrEqual(1000 * 0.9)
      expect(result.height).toBeLessThanOrEqual(2000 * 0.9)
      expect(result.width / result.height).toBeCloseTo(1920 / 1080, 2)
    })

    it('should maintain aspect ratio', () => {
      const result = calculateCanvasSize(1920, 1080, 1600, 900)
      expect(result.width / result.height).toBeCloseTo(1920 / 1080, 2)
    })
  })

  describe('clamp', () => {
    it('should clamp value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(-5, 0, 10)).toBe(0)
      expect(clamp(15, 0, 10)).toBe(10)
    })

    it('should handle equal min and max', () => {
      expect(clamp(5, 3, 3)).toBe(3)
    })
  })

  describe('lerp', () => {
    it('should interpolate between values', () => {
      expect(lerp(0, 10, 0)).toBe(0)
      expect(lerp(0, 10, 0.5)).toBe(5)
      expect(lerp(0, 10, 1)).toBe(10)
    })

    it('should handle negative values', () => {
      expect(lerp(-10, 10, 0.5)).toBe(0)
    })
  })

  describe('randomInRange', () => {
    it('should generate number within range', () => {
      for (let i = 0; i < 100; i++) {
        const result = randomInRange(5, 10)
        expect(result).toBeGreaterThanOrEqual(5)
        expect(result).toBeLessThanOrEqual(10)
      }
    })

    it('should handle negative ranges', () => {
      for (let i = 0; i < 100; i++) {
        const result = randomInRange(-10, -5)
        expect(result).toBeGreaterThanOrEqual(-10)
        expect(result).toBeLessThanOrEqual(-5)
      }
    })
  })

  describe('distance', () => {
    it('should calculate distance between points', () => {
      expect(distance(0, 0, 3, 4)).toBe(5)
      expect(distance(1, 1, 1, 1)).toBe(0)
    })

    it('should handle negative coordinates', () => {
      expect(distance(-1, -1, 2, 3)).toBeCloseTo(5, 5)
    })
  })

  describe('angleToRadians', () => {
    it('should convert degrees to radians', () => {
      expect(angleToRadians(0)).toBe(0)
      expect(angleToRadians(90)).toBeCloseTo(Math.PI / 2, 5)
      expect(angleToRadians(180)).toBeCloseTo(Math.PI, 5)
      expect(angleToRadians(360)).toBeCloseTo(2 * Math.PI, 5)
    })
  })

  describe('radiansToDegrees', () => {
    it('should convert radians to degrees', () => {
      expect(radiansToDegrees(0)).toBe(0)
      expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90, 5)
      expect(radiansToDegrees(Math.PI)).toBeCloseTo(180, 5)
      expect(radiansToDegrees(2 * Math.PI)).toBeCloseTo(360, 5)
    })
  })
})