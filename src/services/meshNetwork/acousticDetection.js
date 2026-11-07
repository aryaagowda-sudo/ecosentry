/**
 * EcoSentry Mesh Network - Acoustic Detection Engine
 * 
 * Evaluates whether simulated sound events fall within the acoustic hearing radius
 * of operational sensors. Computes 3D Euclidean propagation distances and SNR estimates.
 * Failed or offline sensors cannot register detections.
 */

import { calculate3DDistance, gridCoordsToWorld } from './distanceMath.js'
import { getTerrainElevation } from '../../components/forest3d/terrainHelper.js'
import { findShortestPath } from './dijkstra.js'

/**
 * Checks which operational sensors hear an acoustic sound event.
 * Detects all online sensors within their acoustic detection radius and
 * sorts them strictly by 3D Euclidean distance (nearest first).
 * 
 * @param {Array<Object>} sensors List of all acoustic sensors
 * @param {{
 *   x?: number,
 *   y?: number,
 *   z?: number,
 *   worldPosition?: { x: number, y?: number, z?: number },
 *   gridX?: number,
 *   gridY?: number,
 *   coordinates?: { x: number, y: number },
 *   type?: string,
 *   id?: string
 * }} eventCoord 3D world or 2D grid coordinates of the sound event
 * @param {string} [eventType='gunshot_sound']
 * @returns {{
 *   eventPosition: { x: number, y: number, z: number },
 *   detections: Array<Object>,
 *   detectingSensorIds: Array<string>,
 *   detectionCount: number,
 *   heard: boolean
 * }}
 */
export function detectAcousticEvent(sensors, eventCoord, eventType = 'gunshot_sound') {
  let eventPos = { x: 0, y: 0, z: 0 }

  if (eventCoord.worldPosition && typeof eventCoord.worldPosition.x === 'number') {
    const wx = eventCoord.worldPosition.x
    const wz = eventCoord.worldPosition.z ?? 0
    const wy = eventCoord.worldPosition.y ?? getTerrainElevation(wx, wz)
    eventPos = { x: wx, y: wy, z: wz }
  } else if (eventCoord.x !== undefined && eventCoord.z !== undefined) {
    const ex = eventCoord.x
    const ez = eventCoord.z
    const ey = eventCoord.y ?? getTerrainElevation(ex, ez)
    eventPos = { x: ex, y: ey, z: ez }
  } else if (eventCoord.gridX !== undefined && eventCoord.gridY !== undefined) {
    eventPos = gridCoordsToWorld(eventCoord.gridX, eventCoord.gridY)
  } else if (eventCoord.coordinates?.x !== undefined && eventCoord.coordinates?.y !== undefined) {
    eventPos = gridCoordsToWorld(eventCoord.coordinates.x, eventCoord.coordinates.y)
  }

  const detections = []
  const timestamp = new Date().toISOString()

  sensors.forEach((sensor) => {
    // Only operational sensors can register detections
    if (sensor.status !== 'online') return

    const dist = calculate3DDistance(sensor.position, eventPos)
    const hearingRadius = sensor.acousticDetectionRange || 0

    if (dist <= hearingRadius) {
      // Calculate realistic simulated Signal-to-Noise Ratio (inverse quadratic falloff)
      const normalizedDist = Math.max(0.1, dist / hearingRadius)
      const snr = Number(Math.max(0.05, 1.0 - Math.pow(normalizedDist, 1.8)).toFixed(3))

      const detectionRecord = {
        sensorId: sensor.id,
        sensorName: sensor.name,
        sensorPosition: { ...sensor.position },
        gridCoordinates: { ...sensor.gridCoordinates },
        distance: Number(dist.toFixed(2)),
        hearingRadius: hearingRadius,
        snr: snr,
        eventType: eventType,
        timestamp: timestamp
      }

      detections.push(detectionRecord)

      // Optionally attach detection to sensor history
      if (Array.isArray(sensor.detections)) {
        sensor.detections.unshift(detectionRecord)
        if (sensor.detections.length > 20) sensor.detections.pop()
        sensor.lastHeardAt = timestamp
      }
    }
  })

  // Sort detections strictly by 3D Euclidean distance ascending (nearest first)
  detections.sort((a, b) => a.distance - b.distance)

  return {
    eventPosition: eventPos,
    detections,
    detectingSensorIds: detections.map((d) => d.sensorId),
    detectionCount: detections.length,
    heard: detections.length > 0
  }
}

/**
 * Selects the optimal packet-originating sensor from acoustic detections
 * based on proximity to the incident, with dynamic failover/bypass when the
 * nearest sensor is isolated from the Base Station.
 * 
 * Invariants:
 * 1. Nearest eligible sensor by 3D distance is chosen as primary source.
 * 2. If nearest sensor cannot reach BASE, bypass to the next-nearest eligible sensor.
 * 3. Records bypassedNearestSensor and bypassReason.
 * 4. If all detecting sensors are isolated, origin remains the nearest sensor and
 *    packet is buffered into its local Store-and-Forward queue.
 * 
 * @param {Array<Object>} detections Acoustic detections, sorted ascending by 3D distance
 * @param {Object} graph Mesh network graph with adjacency mapping
 * @returns {{
 *   nearestSensorId: string|null,
 *   nearestSensorDistance: number|null,
 *   originatingSensorId: string|null,
 *   originSensorDistance: number|null,
 *   bypassedNearestSensor: boolean,
 *   bypassReason: string|null,
 *   route: { path: Array<string>, totalCost: number, reachable: boolean },
 *   otherDetectingSensors: Array<{ sensorId: string, distance: number }>
 * }}
 */
export function selectPacketOriginator(detections, graph) {
  if (!detections || detections.length === 0) {
    return {
      nearestSensorId: null,
      nearestSensorDistance: null,
      originatingSensorId: null,
      originSensorDistance: null,
      bypassedNearestSensor: false,
      bypassReason: null,
      route: { path: [], totalCost: Infinity, reachable: false },
      otherDetectingSensors: []
    }
  }

  // Ensure detections are strictly ordered by 3D Euclidean distance ascending
  const sorted = [...detections].sort((a, b) => a.distance - b.distance)
  const nearest = sorted[0]
  const nearestId = nearest.sensorId
  const nearestDistance = Number(nearest.distance.toFixed(1))

  // 1. Evaluate route from nearest sensor to BASE
  const nearestRoute = graph?.adjacency
    ? findShortestPath(graph.adjacency, nearestId, 'BASE')
    : { reachable: false, path: [], totalCost: Infinity }

  if (nearestRoute.reachable && nearestRoute.path.length > 0) {
    // Nearest sensor has a valid mesh path to BASE
    const otherDetecting = sorted
      .filter((d) => d.sensorId !== nearestId)
      .map((d) => ({ sensorId: d.sensorId, distance: Number(d.distance.toFixed(1)) }))

    return {
      nearestSensorId: nearestId,
      nearestSensorDistance: nearestDistance,
      originatingSensorId: nearestId,
      originSensorDistance: nearestDistance,
      bypassedNearestSensor: false,
      bypassReason: null,
      route: nearestRoute,
      otherDetectingSensors: otherDetecting
    }
  }

  // 2. Nearest sensor is isolated or has no path to BASE.
  // Evaluate next-nearest eligible detecting sensors in order of 3D distance.
  let bypassCandidate = null
  let bypassRoute = null

  for (let i = 1; i < sorted.length; i++) {
    const candidate = sorted[i]
    const candRoute = graph?.adjacency
      ? findShortestPath(graph.adjacency, candidate.sensorId, 'BASE')
      : { reachable: false, path: [], totalCost: Infinity }

    if (candRoute.reachable && candRoute.path.length > 0) {
      bypassCandidate = candidate
      bypassRoute = candRoute
      break
    }
  }

  if (bypassCandidate && bypassRoute) {
    const candidateDist = Number(bypassCandidate.distance.toFixed(1))
    const otherDetecting = sorted
      .filter((d) => d.sensorId !== bypassCandidate.sensorId)
      .map((d) => ({ sensorId: d.sensorId, distance: Number(d.distance.toFixed(1)) }))

    return {
      nearestSensorId: nearestId,
      nearestSensorDistance: nearestDistance,
      originatingSensorId: bypassCandidate.sensorId,
      originSensorDistance: candidateDist,
      bypassedNearestSensor: true,
      bypassReason: `Nearest sensor ${nearestId} (${nearestDistance}m) is isolated from Base Station. Rerouted via next-nearest sensor ${bypassCandidate.sensorId} (${candidateDist}m).`,
      route: bypassRoute,
      otherDetectingSensors: otherDetecting
    }
  }

  // 3. All detecting sensors are isolated from BASE.
  // Default origin to nearest sensor and buffer packet in its Store-and-Forward queue.
  const otherDetecting = sorted
    .filter((d) => d.sensorId !== nearestId)
    .map((d) => ({ sensorId: d.sensorId, distance: Number(d.distance.toFixed(1)) }))

  return {
    nearestSensorId: nearestId,
    nearestSensorDistance: nearestDistance,
    originatingSensorId: nearestId,
    originSensorDistance: nearestDistance,
    bypassedNearestSensor: false,
    bypassReason: 'All detecting sensors are isolated from Base Station; packet buffered locally in Store-and-Forward queue.',
    route: { path: [], totalCost: Infinity, reachable: false },
    otherDetectingSensors: otherDetecting
  }
}
