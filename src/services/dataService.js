/**
 * EcoSentry Data Service
 * 
 * Centralized data management and calculation layer.
 * Designed to seamlessly interface with a Python FastAPI backend in the future.
 */

import { SIMULATED_ZONES, ANIMAL_TRAILS, INITIAL_SENSORS, INITIAL_EVENTS } from '../data/mockData'

/**
 * Fetch initial mock sensors (can be replaced by `fetch('/api/sensors')` later)
 */
export async function getSensors() {
  return [...INITIAL_SENSORS]
}

/**
 * Fetch initial mock events (can be replaced by `fetch('/api/events')` later)
 */
export async function getEvents() {
  return [...INITIAL_EVENTS]
}

/**
 * Fetch simulated forest zones
 */
export function getZones() {
  return [...SIMULATED_ZONES]
}

/**
 * Fetch animal trails
 */
export function getTrails() {
  return [...ANIMAL_TRAILS]
}

/**
 * Dynamically calculate all dashboard statistics from live application state.
 * No statistics are hardcoded; all derive purely from current sensors and events.
 */
export function calculateDashboardStats(sensors, events) {
  // 1. Camera Sensor Statistics
  const cameraSensors = sensors.filter((s) => s.type === 'camera')
  const onlineCameras = cameraSensors.filter((s) => s.status === 'online').length
  const offlineCameras = cameraSensors.length - onlineCameras
  const cameraUptimePct = cameraSensors.length > 0 
    ? Math.round((onlineCameras / cameraSensors.length) * 100) 
    : 0

  // 2. Acoustic Sensor Statistics
  const acousticSensors = sensors.filter((s) => s.type === 'acoustic')
  const onlineAcoustics = acousticSensors.filter((s) => s.status === 'online').length
  const offlineAcoustics = acousticSensors.length - onlineAcoustics
  const acousticUptimePct = acousticSensors.length > 0
    ? Math.round((onlineAcoustics / acousticSensors.length) * 100)
    : 0

  // 3. Sensor Connectivity Status (Total Network)
  const totalSensors = sensors.length
  const onlineSensors = sensors.filter((s) => s.status === 'online').length
  const offlineSensors = totalSensors - onlineSensors
  const networkUptimePct = totalSensors > 0
    ? Math.round((onlineSensors / totalSensors) * 100)
    : 0

  // 4. Wildlife Detections
  const wildlifeEvents = events.filter((e) => e.category === 'wildlife')
  const boundaryCrossingEvents = events.filter((e) => e.type === 'animal_boundary_crossing')
  const totalWildlifeDetections = wildlifeEvents.length + boundaryCrossingEvents.length
  
  // Extract unique wildlife species observed
  const speciesSet = new Set()
  wildlifeEvents.forEach((e) => {
    if (e.title.includes('Tiger')) speciesSet.add('Bengal Tiger')
    else if (e.title.includes('Elephant')) speciesSet.add('Asian Elephant')
    else if (e.title.includes('Leopard')) speciesSet.add('Indian Leopard')
    else speciesSet.add('Native Fauna')
  })
  if (boundaryCrossingEvents.length > 0) speciesSet.add('Asian Elephant Herd')

  // 5. Threat Incidents (Separated from sensor hardware failures)
  const threatEvents = events.filter((e) => e.category === 'threat' || (e.isManual && e.category !== 'system'))
  const activeIncidents = threatEvents.filter((e) => e.status === 'active')
  const acknowledgedIncidents = threatEvents.filter((e) => e.status === 'acknowledged')
  const resolvedIncidents = threatEvents.filter((e) => e.status === 'resolved')
  const criticalThreats = threatEvents.filter((e) => e.priority === 'critical' && e.status !== 'resolved')

  // Threat breakdown counts
  const chainsawCount = threatEvents.filter((e) => e.type === 'chainsaw_sound' && e.status !== 'resolved').length
  const gunshotCount = threatEvents.filter((e) => e.type === 'gunshot_sound' && e.status !== 'resolved').length
  const humanCount = threatEvents.filter((e) => e.type === 'human_detection' && e.status !== 'resolved').length
  const boundaryCount = threatEvents.filter((e) => e.type === 'animal_boundary_crossing' && e.status !== 'resolved').length

  // 6. Sensor Hardware Failures (Explicitly separated from poaching/threat classifications)
  const systemFailureEvents = events.filter((e) => e.category === 'system' && e.status !== 'resolved')

  return {
    camera: {
      total: cameraSensors.length,
      online: onlineCameras,
      offline: offlineCameras,
      uptimePct: cameraUptimePct
    },
    acoustic: {
      total: acousticSensors.length,
      online: onlineAcoustics,
      offline: offlineAcoustics,
      uptimePct: acousticUptimePct
    },
    connectivity: {
      total: totalSensors,
      online: onlineSensors,
      offline: offlineSensors,
      uptimePct: networkUptimePct
    },
    wildlife: {
      totalDetections: totalWildlifeDetections,
      uniqueSpeciesCount: speciesSet.size,
      speciesList: Array.from(speciesSet),
      recentList: wildlifeEvents.slice(0, 3)
    },
    incidents: {
      totalThreats: threatEvents.length,
      active: activeIncidents.length,
      acknowledged: acknowledgedIncidents.length,
      resolved: resolvedIncidents.length,
      criticalCount: criticalThreats.length,
      chainsawCount,
      gunshotCount,
      humanCount,
      boundaryCount
    },
    systemFailures: {
      activeFailures: systemFailureEvents.length,
      list: systemFailureEvents
    }
  }
}

/**
 * Helper to simulate generating a new incident during a live demo
 */
export function generateRandomDemoIncident(sensors) {
  const onlineSensors = sensors.filter((s) => s.status === 'online')
  const targetSensor = onlineSensors[Math.floor(Math.random() * onlineSensors.length)] || sensors[0]

  const templates = [
    {
      type: 'chainsaw_sound',
      category: 'threat',
      title: 'Chainsaw-like Sound Classification',
      description: 'Simulated harmonic acoustic signature detected in high-frequency spectrum. High pattern similarity to mechanical tree-felling equipment.',
      sensorType: 'acoustic',
      confidence: 0.91,
      priority: 'critical',
      disclaimer: 'Simulated classification: similarity to chainsaw engine noise only. Does not prove illegal logging. Ground check required.'
    },
    {
      type: 'gunshot_sound',
      category: 'threat',
      title: 'Gunshot-like Acoustic Impulse Classification',
      description: 'Simulated sharp acoustic transient shockwave recorded. Characteristic explosive signature requiring verification.',
      sensorType: 'acoustic',
      confidence: 0.94,
      priority: 'critical',
      disclaimer: 'Simulated acoustic transient. May be acoustic artifact, natural cracking timber, or firearm. Investigation advised.'
    },
    {
      type: 'human_detection',
      category: 'threat',
      title: 'Human Presence Optical Detection',
      description: 'Simulated infrared camera snapshot flagged human silhouette walking off marked ecotourism trails during nighttime hours.',
      sensorType: 'camera',
      confidence: 0.88,
      priority: 'high',
      disclaimer: 'Simulated optical detector output. Possible authorized ranger or local community member. Confirm identity.'
    },
    {
      type: 'animal_boundary_crossing',
      category: 'threat',
      title: 'Animal Boundary Crossing Alert',
      description: 'Simulated motion trigger confirms tiger/elephant movement past boundary geofence toward nearby buffer village boundary.',
      sensorType: targetSensor.type,
      confidence: 0.96,
      priority: 'medium',
      disclaimer: 'Simulated wildlife crossing alert. Monitor buffer zone to mitigate human-wildlife conflict.'
    }
  ]

  const chosen = templates[Math.floor(Math.random() * templates.length)]
  const id = `EVT-2026-${Math.floor(110 + Math.random() * 890)}`
  const now = new Date()
  const timeStr = now.toISOString().replace('T', ' ').substring(0, 19)

  return {
    id,
    type: chosen.type,
    category: chosen.category,
    title: chosen.title,
    description: chosen.description,
    sensorId: targetSensor.id,
    sensorType: targetSensor.type,
    zoneId: targetSensor.zoneId,
    zoneName: targetSensor.zoneName,
    coordinates: {
      x: Math.max(10, Math.min(90, targetSensor.coordinates.x + (Math.random() * 6 - 3))),
      y: Math.max(10, Math.min(90, targetSensor.coordinates.y + (Math.random() * 6 - 3))),
      simulatedLat: targetSensor.coordinates.simulatedLat,
      simulatedLng: targetSensor.coordinates.simulatedLng
    },
    timestamp: timeStr,
    timeAgo: 'Just now',
    confidence: chosen.confidence,
    priority: chosen.priority,
    status: 'active',
    isSimulated: true,
    disclaimer: chosen.disclaimer
  }
}
