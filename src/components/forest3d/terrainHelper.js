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
 * River Width in world/grid units.
 * Slightly wider in the wetland delta basin (Zone 2).
 */
export function getRiverWidth(z) {
  return 3.8 + (1 - Math.abs(z / HALF_SIZE)) * 1.6
}

/**
 * Centerline X in 2D coordinate space (0 to 100) at a given Y (0 to 100)
 */
export function getRiver2DCenterlineX(y) {
  const z = y - 50
  return getRiverCenterlineX(z) + 50
}

/**
 * Returns SVG path data for the 2D river water body or outer bank polygon.
 * Coordinates run 0 to 100.
 */
export function getRiver2DPolygonPath(stepCount = 60, bankPadding = 0) {
  const leftPoints = []
  const rightPoints = []

  for (let i = 0; i <= stepCount; i++) {
    const y = (i / stepCount) * 100
    const z = y - 50
    const centerX = getRiverCenterlineX(z) + 50
    const w = getRiverWidth(z) + bankPadding

    const leftX = centerX - w / 2
    const rightX = centerX + w / 2

    rightPoints.push(`${rightX.toFixed(2)},${y.toFixed(2)}`)
    leftPoints.unshift(`${leftX.toFixed(2)},${y.toFixed(2)}`)
  }

  return `M ${rightPoints.join(' L ')} L ${leftPoints.join(' L ')} Z`
}

/**
 * Returns SVG path data for the 2D river centerline (used for downstream flow animation).
 */
export function getRiver2DCenterlinePath(stepCount = 60) {
  const points = []
  for (let i = 0; i <= stepCount; i++) {
    const y = (i / stepCount) * 100
    const z = y - 50
    const centerX = getRiverCenterlineX(z) + 50
    points.push(`${centerX.toFixed(2)},${y.toFixed(2)}`)
  }
  return `M ${points.join(' L ')}`
}

/**
 * Returns SVG path data for a line offset perpendicular to the river centerline.
 * Used for multi-lane current flow lines.
 */
export function getRiver2DOffsetLinePath(stepCount = 60, offset = 0) {
  const points = []
  for (let i = 0; i <= stepCount; i++) {
    const y = (i / stepCount) * 100
    const z = y - 50
    const centerX = getRiverCenterlineX(z) + 50

    const deltaY = 1.0
    const zNext = Math.min(50, z + deltaY)
    const zPrev = Math.max(-50, z - deltaY)
    const dx = (getRiverCenterlineX(zNext) - getRiverCenterlineX(zPrev)) / (zNext - zPrev)
    const len = Math.hypot(-1, dx)
    const nx = -1 / len
    const ny = dx / len

    const px = centerX + nx * offset
    const py = y + ny * offset

    points.push(`${px.toFixed(2)},${py.toFixed(2)}`)
  }
  return `M ${points.join(' L ')}`
}

/**
 * Generates stylized top-down tree canopies matching the 3D diorama density.
 * Clears sensors, threat sites, and the riverbed.
 */
export function generateTacticalTreeCanopies(clearedSensors = [], clearedEvents = []) {
  const canopies = []
  let seed = 789456
  function rnd() {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }

  const clearings = [
    ...clearedSensors.map((s) => ({ x: s.coordinates.x, y: s.coordinates.y, r: 4.8 })),
    ...clearedEvents.map((e) => ({ x: e.coordinates.x, y: e.coordinates.y, r: 4.5 }))
  ]

  let attempts = 0
  const targetCount = 380

  while (canopies.length < targetCount && attempts < 1400) {
    attempts++
    const x = 5 + rnd() * 90
    const y = 5 + rnd() * 90

    // 1. Avoid river
    const riverCenterX = getRiver2DCenterlineX(y)
    const z = y - 50
    const riverHalfW = getRiverWidth(z) / 2 + 1.8
    if (Math.abs(x - riverCenterX) < riverHalfW) continue

    // 2. Avoid sensors / alerts
    let tooClose = false
    for (let c = 0; c < clearings.length; c++) {
      const cl = clearings[c]
      const distSq = (x - cl.x) * (x - cl.x) + (y - cl.y) * (y - cl.y)
      if (distSq < cl.r * cl.r) {
        tooClose = true
        break
      }
    }
    if (tooClose) continue

    // Zone-specific canopy attributes
    let color = '#235237'
    let radius = 1.6 + rnd() * 1.4

    if (x <= 50 && y <= 50) {
      // Zone 1: Dense North Rainforest
      const shades = ['#1a4329', '#214e32', '#2a5f3e', '#163b24']
      color = shades[Math.floor(rnd() * shades.length)]
      radius = 1.9 + rnd() * 1.6
    } else if (x > 50 && y <= 50) {
      // Zone 2: River Basin & Wetlands
      const shades = ['#205445', '#2a6353', '#1b4a3c', '#2c6d5b']
      color = shades[Math.floor(rnd() * shades.length)]
      radius = 1.5 + rnd() * 1.3
    } else if (x <= 50 && y > 50) {
      // Zone 3: South Migration Woods
      const shades = ['#1d4930', '#25593c', '#184028', '#2e6344']
      color = shades[Math.floor(rnd() * shades.length)]
      radius = 1.7 + rnd() * 1.5
    } else {
      // Zone 4: West Buffer Savannah
      const shades = ['#2d5032', '#365e3c', '#26442a', '#3f6844']
      color = shades[Math.floor(rnd() * shades.length)]
      radius = 1.4 + rnd() * 1.2
    }

    canopies.push({
      id: `tc-${attempts}`,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      r: Number(radius.toFixed(2)),
      color
    })
  }

  return canopies
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

  // 6. Smooth outer boundary lip for the 3D diorama platform edges
  const maxEdgeDist = Math.max(Math.abs(x), Math.abs(z))
  if (maxEdgeDist > 44) {
    const edgeT = Math.min(1, (maxEdgeDist - 44) / 5.5)
    elev = elev * (1 - edgeT) + 3.4 * edgeT
  }

  // 7. River Valley Carving: Deep, smooth natural channel running through the reserve
  // Applied after edge blend so the river channel cuts cleanly through the platform boundary
  const riverX = getRiverCenterlineX(z)
  const distFromRiver = Math.abs(x - riverX)
  const riverValleyWidth = 11.5

  if (distFromRiver < riverValleyWidth) {
    const valleyFactor = Math.cos((distFromRiver / riverValleyWidth) * (Math.PI / 2))
    const carveDepth = valleyFactor * 4.8
    elev = Math.max(1.1, elev - carveDepth)
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
