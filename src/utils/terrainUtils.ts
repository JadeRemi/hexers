import { TerrainType } from '../config/constants'
import { getBiomeTerrainType } from './biomeUtils'

export const ALL_TERRAIN_TYPES: TerrainType[] = ['sand', 'grass', 'dirt', 'water', 'snow']

let currentSeed: string = ''

export const setTerrainSeed = (seed: string): void => {
  currentSeed = seed
}

export const getTerrainForHexagon = (gridRow: number, gridCol: number): TerrainType => {
  return getBiomeTerrainType(gridRow, gridCol, currentSeed)
}

export const getTerrainDistribution = (): Map<TerrainType, number> => {
  // Returns percentage distribution of terrain types
  // Can be used for world generation
  return new Map([
    ['grass', 0.3],
    ['dirt', 0.2],
    ['sand', 0.2],
    ['water', 0.2],
    ['snow', 0.1]
  ])
}