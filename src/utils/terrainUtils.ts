import { TerrainType } from '../config/constants'

export const ALL_TERRAIN_TYPES: TerrainType[] = ['sand', 'grass', 'dirt', 'water', 'snow']

export const getTerrainForHexagon = (gridRow: number, gridCol: number): TerrainType => {
  // Simple distribution based on grid position
  // This can be made more sophisticated later
  const index = Math.abs(gridRow + gridCol) % ALL_TERRAIN_TYPES.length
  return ALL_TERRAIN_TYPES[index]
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