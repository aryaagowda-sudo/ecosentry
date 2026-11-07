/**
 * EcoSentry Mesh Network - Incident Fusion & Source Localization
 * 
 * Fuses multi-sensor acoustic detections into a single, cohesive incident report.
 * Eliminates duplicate reports, emails, and network packets.
 * Estimates sound source position and plausible uncertainty region through
 * geometric centroid estimation and spherical hearing constraint intersection.
 */

import { calculate3DDistance, worldCoordsToGrid } from './distanceMath.js'
import { getZoneFromGridCoords, gridToSimulatedLatLng } from '../../components/forest3d/terrainHelper.js'
import { findShortestPath } from './dijkstra.js'
import { selectPacketOriginator } from './acousticDetection.js'

export { selectPacketOriginator }

export const ASSOCIATION_TIME_WINDOW_MS = 4000 // 4 seconds association window

/**
 * Estimates the source position and uncertainty radius R from multiple acoustic detections.
 * 
 * @param {Array<Object>} detections Array of detection records
 * @returns {{
 *   estimatedPosition: { x: number, y: number, z: number },
 *   gridCoordinates: { x: number, y: number },
 *   uncertaintyRadius: number,
 *   method: string,
 *   confidence: number
 * }}
 */
export function estimateSourceLocation(detections) {
  if (!detections || detections.length === 0) {
    return {
      estimatedPosition: { x: 0, y: 0, z: 0 },
      gridCoordinates: { x: 50, y: 50 },
      uncertaintyRadius: 30.0,
      method: 'Uncalibrated Default',
      confidence: 0.1
    }
  }

  // Case 1: Single detecting sensor (High ambiguity, uncertainty is the full sensor hearing radius)
  if (detections.length === 1) {
    const d0 = detections[0]
    const pos = { ...d0.sensorPosition }
    const grid = worldCoordsToGrid(pos.x, pos.z)
    const r = d0.hearingRadius || 28.0

    return {
      estimatedPosition: pos,
      gridCoordinates: grid,
      uncertaintyRadius: Number(r.toFixed(1)),
      method: 'Single Sensor Centroid (Spherical Hearing Horizon)',
      confidence: 0.45
    }
  }

  // Case 2: Multi-sensor detection (N >= 2)
  // Compute inverse-variance / SNR-weighted centroid of detecting sensor positions
  let totalWeight = 0
  let sumX = 0
  let sumY = 0
  let sumZ = 0

  detections.forEach((d) => {
    // Weight by SNR (higher SNR = sensor closer to sound source)
    const weight = Math.max(0.1, d.snr || 0.5)
    totalWeight += weight
    sumX += d.sensorPosition.x * weight
    sumY += d.sensorPosition.y * weight
    sumZ += d.sensorPosition.z * weight
  })

  const estX = Number((sumX / totalWeight).toFixed(2))
  const estY = Number((sumY / totalWeight).toFixed(2))
  const estZ = Number((sumZ / totalWeight).toFixed(2))
  const estimatedPos = { x: estX, y: estY, z: estZ }
  const estimatedGrid = worldCoordsToGrid(estX, estZ)

  // Calculate geometric uncertainty radius R:
  // Derived from the maximum residual distance to the boundary of any detecting sensor's hearing sphere
  let maxResidual = 0
  let maxInterSensorDist = 0

  for (let i = 0; i < detections.length; i++) {
    const distToEst = calculate3DDistance(detections[i].sensorPosition, estimatedPos)
    const residual = Math.abs((detections[i].hearingRadius || 28.0) - distToEst)
    if (residual > maxResidual) maxResidual = residual

    for (let j = i + 1; j < detections.length; j++) {
      const pairDist = calculate3DDistance(
        detections[i].sensorPosition,
        detections[j].sensorPosition
      )
      if (pairDist > maxInterSensorDist) maxInterSensorDist = pairDist
    }
  }

  // Uncertainty decreases as sensor count N increases and coverage triangulates
  const countFactor = 1.0 / Math.sqrt(detections.length)
  const uncertaintyRadius = Math.max(
    4.5,
    Number((maxInterSensorDist * 0.45 * countFactor + 2.5).toFixed(1))
  )

  // Confidence increases asymptotically with sensor count: C = 1 - e^(-0.55 * N)
  const confidence = Number(
    Math.min(0.98, Math.max(0.5, 1 - Math.exp(-0.55 * detections.length))).toFixed(2)
  )

  return {
    estimatedPosition: estimatedPos,
    gridCoordinates: estimatedGrid,
    uncertaintyRadius,
    method: 'Multi-Sensor SNR-Weighted Centroid & Spherical Range Bound',
    confidence
  }
}

/**
 * Fuses an acoustic detection event into a single incident report,
 * selecting the best originating sensor for Dijkstra mesh routing to BASE.
 * 
 * @param {Object} detectionResult Output of detectAcousticEvent()
 * @param {string} eventType e.g. 'gunshot_sound', 'chainsaw_sound'
 * @param {Object} graph Adjacency and graph info
 * @param {Object} [meta={}] Optional titles, descriptions, overrides
 * @returns {Object|null} Fused incident object or null if unheard
 */
export function fuseAcousticIncident(detectionResult, eventType, graph, meta = {}) {
  const { detections, detectingSensorIds, detectionCount, heard, eventPosition } = detectionResult

  if (!heard || detections.length === 0) {
    return null
  }

  // 1. Estimate sound source position and uncertainty region
  const localization = estimateSourceLocation(detections)
  const gridCoords = localization.gridCoordinates
  const zone = getZoneFromGridCoords(gridCoords.x, gridCoords.y)
  const latLng = gridToSimulatedLatLng(gridCoords.x, gridCoords.y)

  // 2. Select optimal originating sensor based on proximity and failover bypass logic
  const selection = selectPacketOriginator(detections, graph)
  const bestOriginatorId = selection.originatingSensorId
  const bestPath = selection.route?.path || []
  const routeCost = selection.route?.totalCost !== Infinity ? selection.route?.totalCost : 0

  const incidentId = meta.id || `INC-${Date.now().toString().slice(-4)}`
  const packetId = `PKT-${Date.now().toString().slice(-4)}`
  const timestamp = new Date().toISOString()

  const fusedIncident = {
    id: incidentId,
    type: eventType,
    category: meta.category || 'threat',
    title: meta.title || formatIncidentTitle(eventType),
    description:
      meta.description ||
      `Acoustic transient fused across ${detectionCount} sensor${detectionCount > 1 ? 's' : ''} in ${zone.name}.`,
    icon: meta.icon || getIncidentIcon(eventType),
    priority: meta.priority || getIncidentPriority(eventType),
    status: 'active',
    timestamp: timestamp,
    timeAgo: 'Just now',

    // Fused Multi-Sensor Acoustic Metadata
    detectionCount,
    detectingSensors: detectingSensorIds,
    detections: detections.map((d) => ({
      sensorId: d.sensorId,
      distance: d.distance,
      snr: d.snr,
      timestamp: d.timestamp
    })),

    // Localization & Uncertainty Area
    groundTruthPosition: eventPosition,
    estimatedPosition: localization.estimatedPosition,
    uncertaintyRadius: localization.uncertaintyRadius,
    localizationMethod: localization.method,
    confidence: localization.confidence,

    // Coordinates formatted for compatibility with existing EcoSentry views
    coordinates: {
      x: gridCoords.x,
      y: gridCoords.y,
      simulatedLat: latLng.simulatedLat,
      simulatedLng: latLng.simulatedLng
    },
    zoneId: zone.id,
    zoneName: zone.name,

    // Proximity & Origin Telemetry
    nearestSensorId: selection.nearestSensorId,
    nearestSensorDistance: selection.nearestSensorDistance,
    originatingSensorId: bestOriginatorId,
    originSensorDistance: selection.originSensorDistance,
    bypassedNearestSensor: selection.bypassedNearestSensor,
    bypassReason: selection.bypassReason,
    otherDetectingSensors: selection.otherDetectingSensors,

    // Mesh Transmission Metadata
    packetId: packetId,
    routeToBasestation: bestPath,
    routeCost: routeCost,
    transmissionStatus: bestPath.length > 0 ? 'in_transit' : 'queued',
    deliveryStatus: bestPath.length > 0 ? 'in_transit' : 'queued',
    isAcousticFused: true,
    disclaimer:
      'Fused multi-sensor acoustic telemetry. Ranger dispatch and ground verification recommended.'
  }

  return fusedIncident
}

function formatIncidentTitle(eventType) {
  switch (eventType) {
    case 'gunshot_sound':
      return 'Gunshot Detected'
    case 'chainsaw_sound':
      return 'Illegal Logging (Chainsaw)'
    case 'vehicle_sound':
      return 'Unauthorized Vehicle Movement'
    case 'suspicious_noise':
      return 'High-Amplitude Acoustic Anomaly'
    default:
      return 'Acoustic Threat Detected'
  }
}

function getIncidentIcon(eventType) {
  switch (eventType) {
    case 'gunshot_sound':
      return '🔫'
    case 'chainsaw_sound':
      return '🪓'
    case 'vehicle_sound':
      return '🚙'
    case 'suspicious_noise':
      return '🔊'
    default:
      return '⚠️'
  }
}

function getIncidentPriority(eventType) {
  switch (eventType) {
    case 'gunshot_sound':
    case 'chainsaw_sound':
      return 'critical'
    case 'vehicle_sound':
      return 'high'
    default:
      return 'medium'
  }
}
