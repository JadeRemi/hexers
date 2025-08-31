import { Hexagon } from './hexagonUtils'
import { simplexNoise } from './noiseUtils'
import { SeededRandom } from './seedUtils'

export type UnitType = 'wizard' | 'boulder'

export interface Unit {
  type: UnitType
  gridRow: number
  gridCol: number
  sprite: string
}

export interface CellOccupation {
  [key: string]: Unit
}

export const getCellKey = (row: number, col: number): string => {
  return `${row},${col}`
}

export const generateBoulderPlacements = (
  hexagons: Hexagon[],
  seed: string,
  coverage: number = 0.1
): Unit[] => {
  const boulders: Unit[] = []
  const rng = new SeededRandom(seed)
  
  // Use simplex noise with seed-based offset for clustering
  const noiseOffset = rng.nextFloat(0, 1000)
  
  for (const hex of hexagons) {
    // Use simplex noise for clustering effect (zoomed in for larger clusters)
    const noiseValue = simplexNoise(
      hex.gridCol * 0.15 + noiseOffset,
      hex.gridRow * 0.15 + noiseOffset
    )
    
    // Convert noise to 0-1 range
    const normalizedNoise = (noiseValue + 1) / 2
    
    // Place boulder if noise value exceeds threshold
    if (normalizedNoise > (1 - coverage)) {
      boulders.push({
        type: 'boulder',
        gridRow: hex.gridRow,
        gridCol: hex.gridCol,
        sprite: 'boulder'
      })
    }
  }
  
  return boulders
}

export const buildOccupationMap = (units: Unit[]): CellOccupation => {
  const map: CellOccupation = {}
  
  for (const unit of units) {
    const key = getCellKey(unit.gridRow, unit.gridCol)
    map[key] = unit
  }
  
  return map
}

export const isCellOccupied = (
  occupation: CellOccupation,
  row: number,
  col: number
): boolean => {
  return getCellKey(row, col) in occupation
}

export const getUnitAt = (
  occupation: CellOccupation,
  row: number,
  col: number
): Unit | undefined => {
  return occupation[getCellKey(row, col)]
}