/**
 * EcoSentry Mesh Network - 3D Terrain Acoustic Coverage Analysis
 * 
 * Computes acoustic detection coverage across the undulating 3D forest diorama
 * by evaluating 3D Euclidean distances from terrain surface sample points
 * to all operational acoustic sensor nodes.
 */

import { getTerrainElevation } from '../../components/forest3d/terrainHelper.js'
import { calculate3DDistance } from './distanceMath.js'

/**
 * Calculates acoustic coverage statistics across all 4 forest zones.
 * 
 * @param {Array<Object>} sensors List of acoustic sensor nodes
 * @param {Object} [options={}] Configuration options
 * @param {number} [options.gridResolution=2.5] Sampling grid resolution in grid units
 * @param {number} [options.boundaryMin=12] Minimum grid coordinate (boundary margin)
 * @param {number} [options.boundaryMax=88] Maximum grid coordinate
 * @returns {Object} Coverage metrics
 */
export function calculateAcousticCoverage(sensors, options = {}) {
  const res = options.gridResolution || 2.5
  const minCoord = options.boundaryMin ?? 12
  const maxCoord = options.boundaryMax ?? 88

  const operationalSensors = (sensors || []).filter((s) => s.status === 'online')

  let totalSamples = 0
  let coveredSamples = 0
  let dualSamples = 0

  const zoneBuckets = {
    'zone-1': { total: 0, covered: 0, dual: 0, name: 'Zone 1: North Canopy' },
    'zone-2': { total: 0, covered: 0, dual: 0, name: 'Zone 2: East River Basin' },
    'zone-3': { total: 0, covered: 0, dual: 0, name: 'Zone 3: South Corridor' },
    'zone-4': { total: 0, covered: 0, dual: 0, name: 'Zone 4: West Buffer' }
  }

  const uncoveredCoordinates = []

  for (let gx = minCoord; gx <= maxCoord; gx += res) {
    for (let gy = minCoord; gy <= maxCoord; gy += res) {
      totalSamples++

      const wx = gx - 50
      const wz = gy - 50
      const wy = getTerrainElevation(wx, wz)
      const p = { x: wx, y: wy, z: wz }

      let zoneId = 'zone-4'
      if (gx <= 50 && gy <= 50) zoneId = 'zone-1'
      else if (gx > 50 && gy <= 50) zoneId = 'zone-2'
      else if (gx <= 50 && gy > 50) zoneId = 'zone-3'

      zoneBuckets[zoneId].total++

      let detectingCount = 0
      for (let i = 0; i < operationalSensors.length; i++) {
        const s = operationalSensors[i]
        const range = s.acousticDetectionRange || 28.0
        const d = calculate3DDistance(p, s.position)
        if (d <= range) {
          detectingCount++
        }
      }

      if (detectingCount >= 1) {
        coveredSamples++
        zoneBuckets[zoneId].covered++
      } else {
        uncoveredCoordinates.push({ gridX: Number(gx.toFixed(1)), gridY: Number(gy.toFixed(1)), zoneId })
      }

      if (detectingCount >= 2) {
        dualSamples++
        zoneBuckets[zoneId].dual++
      }
    }
  }

  const overallCoveragePct = totalSamples > 0 ? Number(((coveredSamples / totalSamples) * 100).toFixed(1)) : 0
  const dualCoveragePct = totalSamples > 0 ? Number(((dualSamples / totalSamples) * 100).toFixed(1)) : 0

  const zone1CoveragePct = zoneBuckets['zone-1'].total > 0
    ? Number(((zoneBuckets['zone-1'].covered / zoneBuckets['zone-1'].total) * 100).toFixed(1))
    : 0
  const zone2CoveragePct = zoneBuckets['zone-2'].total > 0
    ? Number(((zoneBuckets['zone-2'].covered / zoneBuckets['zone-2'].total) * 100).toFixed(1))
    : 0
  const zone3CoveragePct = zoneBuckets['zone-3'].total > 0
    ? Number(((zoneBuckets['zone-3'].covered / zoneBuckets['zone-3'].total) * 100).toFixed(1))
    : 0
  const zone4CoveragePct = zoneBuckets['zone-4'].total > 0
    ? Number(((zoneBuckets['zone-4'].covered / zoneBuckets['zone-4'].total) * 100).toFixed(1))
    : 0

  const uncoveredRegions = []
  if (overallCoveragePct < 100) {
    for (const [zId, zData] of Object.entries(zoneBuckets)) {
      if (zData.covered < zData.total) {
        const missed = zData.total - zData.covered
        const pct = ((zData.covered / zData.total) * 100).toFixed(1)
        uncoveredRegions.push(`${zData.name} (${pct}% covered, ${missed} unmonitored sectors)`)
      }
    }
  }

  return {
    totalSamples,
    coveredSamples,
    dualSamples,
    overallCoveragePct,
    dualCoveragePct,
    zone1CoveragePct,
    zone2CoveragePct,
    zone3CoveragePct,
    zone4CoveragePct,
    zoneBuckets,
    uncoveredRegions,
    isFullyCovered: overallCoveragePct >= 99.5
  }
}
