/**
/**
 * EcoSentry Mesh Network - Distance & Coordinate Mathematics
 * 
 * Provides 3D Euclidean distance calculations and coordinate mapping
 * between 2D normalized grid coordinates (0 to 100) and 3D world coordinates (-50 to +50).
 */

import { getTerrainElevation } from '../../components/forest3d/terrainHelper.js'

/**
 * Calculates the 3D Euclidean distance between two points:
 * distance = sqrt((x1 - x2)^2 + (y1 - y2)^2 + (z1 - z2)^2)
 * 
 * @param {{ x: number, y: number, z: number }} p1 
 * @param {{ x: number, y: number, z: number }} p2 
 * @returns {number} Distance in simulated world units
 */
export function calculate3DDistance(p1, p2) {
  if (!p1 || !p2) return Infinity
  const dx = (p1.x || 0) - (p2.x || 0)
  const dy = (p1.y || 0) - (p2.y || 0)
  const dz = (p1.z || 0) - (p2.z || 0)
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * Converts 2D grid coordinates (x: 0..100, y: 0..100)
 * to 3D world coordinates [worldX, worldY, worldZ] with terrain elevation.
 * 
 * @param {number} gridX (0 to 100)
 * @param {number} gridY (0 to 100)
 * @param {number} [heightOffset=0] Optional vertical offset above ground
 * @returns {{ x: number, y: number, z: number }}
 */
export function gridCoordsToWorld(gridX, gridY, heightOffset = 0) {
  const worldX = (gridX - 50) * 1.0
  const worldZ = (gridY - 50) * 1.0
  const worldY = getTerrainElevation(worldX, worldZ) + heightOffset
  return {
    x: Number(worldX.toFixed(2)),
    y: Number(worldY.toFixed(2)),
    z: Number(worldZ.toFixed(2))
  }
}

/**
 * Converts 3D world coordinates to 2D grid coordinates (0 to 100).
 * 
 * @param {number} worldX (-50 to +50)
 * @param {number} worldZ (-50 to +50)
 * @returns {{ x: number, y: number }}
 */
export function worldCoordsToGrid(worldX, worldZ) {
  const gridX = Math.max(0, Math.min(100, worldX + 50))
  const gridY = Math.max(0, Math.min(100, worldZ + 50))
  return {
    x: Number(gridX.toFixed(1)),
    y: Number(gridY.toFixed(1))
  }
}
