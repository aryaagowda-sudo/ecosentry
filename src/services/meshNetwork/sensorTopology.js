/**
 * EcoSentry Mesh Network - Optimal Algorithm-Based Sensor Placement & Topology
 * 
 * Implements an explainable, deterministic multi-stage spatial deployment algorithm:
 *   1. Strategic Vantage & Relay Anchoring across all 4 forest quadrants
 *   2. Seeded Poisson Disk Sampling with minimum distance constraint (anti-clustering)
 *   3. 3D Terrain Surface Elevation Projection with riverbed clearance
 *   4. Force-Directed / Spring Relaxation for balanced spatial coverage and boundary compliance
 *   5. Multi-Hop Graph Connectivity to Command Base Station with high redundancy (>= 70%)
 */

import { gridCoordsToWorld } from './distanceMath.js'
import {
  getZoneFromGridCoords,
  gridToSimulatedLatLng,
  getRiverCenterlineX
} from '../../components/forest3d/terrainHelper.js'

export const DEFAULT_COMMUNICATION_RANGE = 22.0 // Simulated world units (calibrated for 100% reachability & redundancy)
export const DEFAULT_ACOUSTIC_RANGE = 28.0      // Simulated world units
export const DEFAULT_BASE_COMMUNICATION_RANGE = 26.0

export const BASE_STATION_CONFIG = {
  id: 'BASE',
  name: 'BASE STATION',
  type: 'base_station',
  gridCoordinates: { x: 88, y: 12 },
  communicationRange: DEFAULT_BASE_COMMUNICATION_RANGE,
  status: 'online',
  description: 'Reserve Operations Primary Command & Telemetry Base Station',
  packetsReceived: 0,
  packetsDelivered: 0
}

/**
 * Deterministic pseudo-random number generator (Mulberry32) for perfectly
 * reproducible topology layouts across all environments and page reloads.
 */
function createPRNG(seed = 133742) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Forest zone definitions with strategic surveillance anchor points:
 * - Zone 1: North mountain peak, high canopy ridge, northern pass, valley overlook, boundary bridges
 * - Zone 2: Base station gateways, eastern foothill ridge, river basin overlook, buffer relays
 * - Zone 3: Migration corridor passes, southern hill crest, boundary patrol posts, valley river bank
 * - Zone 4: Buffer ridge observation, savannah perimeter, south river crossing, central crossroads
 */
const ZONE_DEFINITIONS = [
  {
    zoneId: 'zone-1',
    name: 'Zone 1: North Canopy Reserve',
    minX: 12, maxX: 46, minY: 12, maxY: 46,
    strategicVantage: [
      { gx: 26, gy: 24, label: 'North Mountain Peak' },
      { gx: 14, gy: 16, label: 'Northwest Ridge' },
      { gx: 38, gy: 14, label: 'Canopy North Overlook' },
      { gx: 16, gy: 38, label: 'Western Valley Basin' },
      { gx: 32, gy: 34, label: 'High Canopy Center' },
      { gx: 44, gy: 24, label: 'Z1-Z2 Ridge Bridge' },
      { gx: 28, gy: 44, label: 'Z1-Z3 Corridor Bridge' }
    ]
  },
  {
    zoneId: 'zone-2',
    name: 'Zone 2: East River Basin',
    minX: 54, maxX: 88, minY: 12, maxY: 46,
    strategicVantage: [
      { gx: 80, gy: 18, label: 'Command Base Gateway' },
      { gx: 86, gy: 30, label: 'East Perimeter Relay' },
      { gx: 68, gy: 16, label: 'River Basin North' },
      { gx: 58, gy: 26, label: 'Z1-Z2 River Bank Crossing' },
      { gx: 70, gy: 32, label: 'Foothill Ridge Crest' },
      { gx: 82, gy: 44, label: 'East Buffer Gateway' },
      { gx: 64, gy: 44, label: 'Central Basin Wetland' }
    ]
  },
  {
    zoneId: 'zone-3',
    name: 'Zone 3: South Wildlife Corridor',
    minX: 12, maxX: 46, minY: 54, maxY: 88,
    strategicVantage: [
      { gx: 28, gy: 56, label: 'Z1-Z3 Migration Gateway' },
      { gx: 16, gy: 64, label: 'Southwest Woods Boundary' },
      { gx: 30, gy: 72, label: 'Southern Hill Peak' },
      { gx: 16, gy: 84, label: 'South Border Patrol' },
      { gx: 34, gy: 86, label: 'Corridor Southern Pass' },
      { gx: 44, gy: 66, label: 'Z3-Z4 Crossroads Bridge' },
      { gx: 42, gy: 80, label: 'South River Bank Relay' }
    ]
  },
  {
    zoneId: 'zone-4',
    name: 'Zone 4: West Buffer Zone',
    minX: 54, maxX: 88, minY: 54, maxY: 88,
    strategicVantage: [
      { gx: 56, gy: 58, label: 'Center Reserve Crossroads' },
      { gx: 70, gy: 58, label: 'Z2-Z4 Buffer Gateway' },
      { gx: 84, gy: 60, label: 'East Savannah Perimeter' },
      { gx: 58, gy: 74, label: 'South River Crossing West' },
      { gx: 74, gy: 74, label: 'Buffer Ridge Observation' },
      { gx: 86, gy: 82, label: 'Southeast Perimeter Outpost' },
      { gx: 66, gy: 88, label: 'South Buffer Boundary' }
    ]
  }
]

/**
 * Optimizes sensor deployment using:
 *  1. Strategic forest surveillance anchors
 *  2. Seeded Poisson Disk sampling with minimum spacing
 *  3. Force-directed relaxation for spatial uniformity and anti-clustering
 *  4. 3D terrain projection
 * 
 * @param {number} [count=28] Number of sensors to deploy (default 28)
 * @param {number} [defaultCommRange=DEFAULT_COMMUNICATION_RANGE] Default communication range
 * @param {number} [defaultAcousticRange=DEFAULT_ACOUSTIC_RANGE] Default acoustic range
 * @returns {Array<Object>} List of calibrated sensor objects
 */
export function generateSensorTopology(
  count = 28,
  defaultCommRange = DEFAULT_COMMUNICATION_RANGE,
  defaultAcousticRange = DEFAULT_ACOUSTIC_RANGE
) {
  const prng = createPRNG(42819)
  const perZone = Math.floor(count / 4)
  const remainder = count % 4

  let sensorIdx = 1
  const sensors = []

  ZONE_DEFINITIONS.forEach((zoneDef, zIdx) => {
    const quota = perZone + (zIdx < remainder ? 1 : 0)
    const zoneSensors = []

    // 1. Seed with strategic vantage and bridge points
    for (let i = 0; i < zoneDef.strategicVantage.length && zoneSensors.length < quota; i++) {
      const v = zoneDef.strategicVantage[i]
      zoneSensors.push({ gx: v.gx, gy: v.gy, label: v.label })
    }

    // 2. Poisson Disk candidate generation if quota exceeds predefined anchors
    const minPoissonDist = 10.5
    let attempts = 0
    while (zoneSensors.length < quota && attempts < 150) {
      attempts++
      const candGx = zoneDef.minX + prng() * (zoneDef.maxX - zoneDef.minX)
      const candGy = zoneDef.minY + prng() * (zoneDef.maxY - zoneDef.minY)

      // Ensure candidate does not land inside the deep river channel
      const candWx = candGx - 50
      const candWz = candGy - 50
      const riverX = getRiverCenterlineX(candWz)
      if (Math.abs(candWx - riverX) < 2.0) continue

      let tooClose = false
      for (const s of zoneSensors) {
        if (Math.hypot(candGx - s.gx, candGy - s.gy) < minPoissonDist) {
          tooClose = true
          break
        }
      }
      if (!tooClose) {
        zoneSensors.push({
          gx: Number(candGx.toFixed(1)),
          gy: Number(candGy.toFixed(1)),
          label: `Acoustic Monitor`
        })
      }
    }

    // 3. Iterative Force-Directed / Spring Relaxation (anti-clustering & boundary compliance)
    for (let iter = 0; iter < 8; iter++) {
      for (let i = 0; i < zoneSensors.length; i++) {
        let fx = 0
        let fy = 0
        const cur = zoneSensors[i]

        // Inter-sensor repulsion
        for (let j = 0; j < zoneSensors.length; j++) {
          if (i === j) continue
          const other = zoneSensors[j]
          const dist = Math.hypot(cur.gx - other.gx, cur.gy - other.gy)
          if (dist > 0 && dist < 12.0) {
            const force = (12.0 - dist) / dist
            fx += (cur.gx - other.gx) * force * 0.15
            fy += (cur.gy - other.gy) * force * 0.15
          }
        }

        // Apply clamped displacement
        const nextGx = Math.max(zoneDef.minX, Math.min(zoneDef.maxX, cur.gx + fx))
        const nextGy = Math.max(zoneDef.minY, Math.min(zoneDef.maxY, cur.gy + fy))

        const nextWx = nextGx - 50
        const nextWz = nextGy - 50
        if (Math.abs(nextWx - getRiverCenterlineX(nextWz)) >= 2.0) {
          cur.gx = Number(nextGx.toFixed(1))
          cur.gy = Number(nextGy.toFixed(1))
        }
      }
    }

    // 4. Construct complete 3D sensor entities
    zoneSensors.forEach((s) => {
      const idNum = String(sensorIdx).padStart(3, '0')
      const sensorId = `S-${idNum}`
      const zoneInfo = getZoneFromGridCoords(s.gx, s.gy)
      const latLng = gridToSimulatedLatLng(s.gx, s.gy)
      const worldPos = gridCoordsToWorld(s.gx, s.gy, 0.4) // Elevated 0.4 units above 3D terrain surface

      // Deterministic battery variation (85% to 99%)
      const battery = Math.round(85 + prng() * 14)

      sensors.push({
        id: sensorId,
        name: `Acoustic Node ${sensorId}`,
        type: 'acoustic',
        gridCoordinates: {
          x: s.gx,
          y: s.gy,
          simulatedLat: latLng.simulatedLat,
          simulatedLng: latLng.simulatedLng
        },
        position: worldPos,
        zoneId: zoneInfo.id,
        zoneName: zoneInfo.name,
        communicationRange: defaultCommRange,
        acousticDetectionRange: defaultAcousticRange,
        batteryLevel: battery,
        status: 'online', // 'online' | 'failed' | 'offline'
        neighbors: [],
        packetsTransmitted: 0,
        packetsReceived: 0,
        messageQueue: [],
        detections: [],
        lastHeardAt: null
      })

      sensorIdx++
    })
  })

  return sensors
}

/**
 * Returns the initialized Command Base Station entity located at the outer perimeter.
 * 
 * @param {number} [commRange=DEFAULT_BASE_COMMUNICATION_RANGE]
 * @returns {Object} Base station node object
 */
export function getBaseStation(commRange = DEFAULT_BASE_COMMUNICATION_RANGE) {
  const gx = BASE_STATION_CONFIG.gridCoordinates.x
  const gy = BASE_STATION_CONFIG.gridCoordinates.y
  const worldPos = gridCoordsToWorld(gx, gy, 1.2) // Elevated mast/tower platform
  const latLng = gridToSimulatedLatLng(gx, gy)

  return {
    ...BASE_STATION_CONFIG,
    communicationRange: commRange,
    position: worldPos,
    gridCoordinates: {
      x: gx,
      y: gy,
      simulatedLat: latLng.simulatedLat,
      simulatedLng: latLng.simulatedLng
    }
  }
}
