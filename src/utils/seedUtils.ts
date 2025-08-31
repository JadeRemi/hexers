export const generateSeed = (): string => {
  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Seeded random number generator (simple LCG)
export class SeededRandom {
  private seed: number
  
  constructor(seed: string) {
    // Convert hex seed to number
    this.seed = parseInt(seed.slice(0, 8), 16) || 1
  }
  
  next(): number {
    // Linear congruential generator
    this.seed = (this.seed * 1664525 + 1013904223) % 2147483647
    return this.seed / 2147483647
  }
  
  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min)
  }
  
  nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat(min, max + 1))
  }
}