/**
 * EcoSentry 3D Terrain & Coordinate Utilities
 * 
 * Maps normalized 2D coordinates (0-100) to centered 3D world space (-50 to +50)
 * and computes realistic undulating elevations with hills, ridges, valleys, and riverbeds.
 */

export const WORLD_SIZE = 100
export const HALF_SIZE = WORLD_SIZE / 2
export const BASE_HEIGHT = -6.0 // Bottom of the 3D diorama platform slab

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
 * Returns the river centerline X position at a given Z position.
 * Smoothly curves through the reserve from North to South.
 */
export function getRiverCenterlineX(z) {
  const t = (z + HALF_SIZE) / WORLD_SIZE // 0 at north, 1 at south
  return 12 + Math.sin(t * Math.PI * 2.2) * 16 + Math.cos(t * Math.PI * 4.0) * 4
}

/**
 * Comprehensive elevation function for realistic 3D isometric terrain:
 * - High North Canopy mountain ridge (up to 13.5 units)
 * - Eastern forested foothill ridge (up to 8.5 units)
 * - Carved river gorge and valley floor (1.0 to 1.6 units)
 * - Rolling southern hills and wildlife corridor passes (5.0 to 7.5 units)
 * - Perimeter blending to uniform platform boundary
 */
export function getTerrainElevation(x, z) {
  // 1. Multi-octave natural terrain base waves
  let elev = 
    Math.sin(x * 0.055) * 1.8 +
    Math.cos(z * 0.05) * 1.6 +
    Math.sin(x * 0.12 + z * 0.09) * 0.8 +
    Math.cos(x * 0.08 - z * 0.11) * 0.6 +
    3.5 // Base ground level

  // 2. North Canopy Mountain Range (Zone 1: x < 0, z < 0)
  if (x < 10 && z < 10) {
    const distToNorthPeak = Math.hypot(x - (-24), z - (-24))
    const northMountainWeight = Math.max(0, 1 - distToNorthPeak / 36)
    // Smooth cosine bell mountain peak
    elev += (1 + Math.cos((distToNorthPeak / 36) * Math.PI)) * 4.2 * northMountainWeight
  }

  // 3. Eastern Basin Ridge (Zone 2: x > 15, z < 15)
  if (x > 10 && z < 15) {
    const distToEastRidge = Math.hypot(x - 30, z - (-16))
    const eastRidgeWeight = Math.max(0, 1 - distToEastRidge / 32)
    elev += (1 + Math.cos((distToEastRidge / 32) * Math.PI)) * 2.8 * eastRidgeWeight
  }

  // 4. Southern Wildlife Corridor Hills (Zone 3: x < 10, z > 5)
  if (x < 12 && z > 0) {
    const distToSouthHill = Math.hypot(x - (-20), z - 28)
    const southHillWeight = Math.max(0, 1 - distToSouthHill / 32)
    elev += (1 + Math.cos((distToSouthHill / 32) * Math.PI)) * 2.4 * southHillWeight
  }

  // 5. West Buffer Foothills (Zone 4: x > 15, z > 15)
  if (x > 15 && z > 15) {
    const distToBufferHill = Math.hypot(x - 32, z - 30)
    const bufferHillWeight = Math.max(0, 1 - distToBufferHill / 30)
    elev += (1 + Math.cos((distToBufferHill / 30) * Math.PI)) * 1.8 * bufferHillWeight
  }

  // 6. River Valley Carving
  const riverX = getRiverCenterlineX(z)
  const distFromRiver = Math.abs(x - riverX)
  const riverValleyWidth = 10.0

  if (distFromRiver < riverValleyWidth) {
    // Carve deep, smooth riverbed
    const valleyFactor = Math.cos((distFromRiver / riverValleyWidth) * (Math.PI / 2))
    const carveDepth = valleyFactor * 3.8
    elev = Math.max(1.1, elev - carveDepth)
  }

  // 7. Smooth outer boundary lip for the 3D platform edges
  const maxEdgeDist = Math.max(Math.abs(x), Math.abs(z))
  if (maxEdgeDist > 44) {
    const edgeT = Math.min(1, (maxEdgeDist - 44) / 5.5)
    // Smoothly transition to 3.4 at the perimeter edge so the 3D diorama skirt is neat
    elev = elev * (1 - edgeT) + 3.4 * edgeT
  }

  return elev
}

/**
 * Formats sensor ID into compact display tag matching user reference
 * e.g. CAM-N01 -> CAM-01, AC-W02 -> MIC-05
 */
export function getSensorDisplayTag(id) {
  const map = {
    'CAM-N01': 'CAM-01',
    'CAM-N02': 'CAM-02',
    'CAM-E01': 'CAM-03',
    'CAM-S01': 'CAM-04',
    'CAM-W01': 'CAM-05',
    'AC-N01': 'MIC-01',
    'AC-E01': 'MIC-02',
    'AC-S01': 'MIC-03',
    'AC-W01': 'MIC-04',
    'AC-W02': 'MIC-05'
  }
  return map[id] || id.replace('AC-', 'MIC-')
}
