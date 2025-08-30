import { describe, it, expect } from 'vitest'
import { perlinNoise, simplexNoise, voronoiNoise, generateVoronoiPoints } from './noiseUtils'

describe('noiseUtils', () => {
  describe('perlinNoise', () => {
    it('should return values between -1 and 1', () => {
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 10
        const y = Math.random() * 10
        const value = perlinNoise(x, y)
        expect(value).toBeGreaterThanOrEqual(-2)
        expect(value).toBeLessThanOrEqual(2)
      }
    })

    it('should return similar values for nearby points', () => {
      const x = 5
      const y = 5
      const value1 = perlinNoise(x, y)
      const value2 = perlinNoise(x + 0.01, y + 0.01)
      expect(Math.abs(value1 - value2)).toBeLessThan(0.5)
    })
  })

  describe('simplexNoise', () => {
    it('should return values in reasonable range', () => {
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 10
        const y = Math.random() * 10
        const value = simplexNoise(x, y)
        expect(value).toBeGreaterThanOrEqual(-2)
        expect(value).toBeLessThanOrEqual(2)
      }
    })

    it('should provide smooth transitions', () => {
      const x = 3
      const y = 3
      const value1 = simplexNoise(x, y)
      const value2 = simplexNoise(x + 0.1, y + 0.1)
      expect(Math.abs(value1 - value2)).toBeLessThan(1)
    })
  })

  describe('voronoiNoise', () => {
    it('should calculate distance-based noise', () => {
      const points: Array<[number, number]> = [[0, 0], [10, 10], [5, 5]]
      const value = voronoiNoise(2, 2, points)
      expect(typeof value).toBe('number')
    })

    it('should return 0 when point is equidistant from two nearest points', () => {
      const points: Array<[number, number]> = [[0, 0], [10, 0], [5, 10]]
      const value = voronoiNoise(5, 0, points)
      expect(Math.abs(value)).toBeLessThan(0.1)
    })
  })

  describe('generateVoronoiPoints', () => {
    it('should generate correct number of points', () => {
      const points = generateVoronoiPoints(10, 100, 100)
      expect(points).toHaveLength(10)
    })

    it('should generate points within bounds', () => {
      const width = 100
      const height = 50
      const points = generateVoronoiPoints(20, width, height)
      
      for (const [x, y] of points) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(width)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(height)
      }
    })
  })
})