/**
 * EcoSentry 3D Terrain & Coordinate Utilities
 * 
 * Maps normalized 2D coordinates (0-100) to centered 3D world space (-50 to +50)
 * and computes realistic undulating elevations with rivers, ridges, and valleys.
 */

export const WORLD_SIZE = 100
export const HALF_SIZE = WORLD_SIZE / 2

/**
 * Convert 2D simulated coordinate { x, y } (0 to 100) to 3D world coordinates [X, Y, Z]
 */
export function gridToWorld(coordX, coordY) {
  const worldX = (coordX - 50) * 1.0
  const worldZ = (coordY - 50) * 1.0
  const worldY = getTerrainElevation(worldX, worldZ)
  return [worldX, worldY, worldZ]
}

/**
 * Smooth elevation function defining the 3D topography:
 * - North Canopy Ridge (elevated terrain)
 * - East River Basin (carved trench / riverbed)
 * - South Corridor (gentle rolling pass)
 * - West Buffer (flat savanna boundary)
 */
export function getTerrainElevation(x, z) {
  // Base undulating ground
  let y = Math.sin(x * 0.06) * 0.9 + Math.cos(z * 0.06) * 0.9

  // North Canopy Ridge elevation (X < 0, Z < 0)
  if (x < 5 && z < 5) {
    const ridgeWeight = Math.max(0, 1 - (Math.abs(x + 25) + Math.abs(z + 25)) / 45)
    y += ridgeWeight * 2.8
  }

  // Eastern Ridge elevation (X > 25, Z > 25)
  if (x > 20 && z > 20) {
    const eastRidge = Math.max(0, 1 - (Math.abs(x - 35) + Math.abs(z - 35)) / 40)
    y += eastRidge * 1.6
  }

  // Riverbed depression curving through East River Basin
  // Parametric river curve from top to bottom
  const t = (z + HALF_SIZE) / WORLD_SIZE // 0 to 1
  const riverCenterlineX = 12 + t * 24 + Math.sin(t * Math.PI * 2.5) * 6
  const distFromRiver = Math.abs(x - riverCenterlineX)

  if (distFromRiver < 8.5) {
    const riverBedDepth = Math.cos((distFromRiver / 8.5) * (Math.PI / 2)) * 1.8
    y -= riverBedDepth
  }

  return y
}

/**
 * Returns color tint for a given 3D world position based on forest zone
 */
export function getZoneGroundColor(x, z) {
  if (x <= 0 && z <= 0) return '#13281c' // Zone 1: North Canopy (deep dark forest green)
  if (x > 0 && z <= 0) return '#102b28'  // Zone 2: East River Basin (wetland teal green)
  if (x <= 0 && z > 0) return '#1a2b1b'  // Zone 3: South Wildlife Corridor (woodland green)
  return '#242b16'                       // Zone 4: West Buffer Zone (olive prairie green)
}
