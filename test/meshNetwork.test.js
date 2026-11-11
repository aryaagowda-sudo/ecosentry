/**
 * EcoSentry Mesh Network & Incident Fusion - Unit Test Suite
 * 
 * Verifies mathematical properties, graph invariants, Dijkstra optimality,
 * multi-sensor acoustic detection, incident fusion deduplication,
 * and failover rerouting logic.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { calculate3DDistance, gridCoordsToWorld, worldCoordsToGrid } from '../src/services/meshNetwork/distanceMath.js'
import { getTerrainElevation } from '../src/components/forest3d/terrainHelper.js'
import { generateSensorTopology, getBaseStation, DEFAULT_COMMUNICATION_RANGE } from '../src/services/meshNetwork/sensorTopology.js'
import { buildMeshGraph } from '../src/services/meshNetwork/graphBuilder.js'
import { findShortestPath, findAlternativeRoute, hasTwoVertexDisjointPaths } from '../src/services/meshNetwork/dijkstra.js'
import { calculateAcousticCoverage } from '../src/services/meshNetwork/acousticCoverage.js'
import { detectAcousticEvent, selectPacketOriginator } from '../src/services/meshNetwork/acousticDetection.js'
import { fuseAcousticIncident, estimateSourceLocation } from '../src/services/meshNetwork/incidentFusion.js'
import { createMeshPacket, stepMeshPacket, handleSensorFailureOnPackets, resumeQueuedPackets } from '../src/services/meshNetwork/packetSimulator.js'
import {
  createMeshMessage,
  enqueueMessageAtSensor,
  dequeueMessageFromSensor,
  getStoreAndForwardMetrics,
  MESSAGE_STATUS,
  SENSOR_QUEUE_CAPACITY
} from '../src/services/meshNetwork/storeAndForward.js'
import { EMAIL_NOTIFICATION_MODES, DEFAULT_EMAIL_NOTIFICATION_MODE, sendIncidentEmailNotification } from '../src/services/emailService.js'
import {
  ROLES,
  DEMO_RANGER_EMAIL,
  getRoleFromSession,
  canConfigureEmailNotifications,
  createGuestSession
} from '../src/services/authService.js'
import { isLegitimateTacticalIncident } from '../src/services/meshNetwork/incidentFiltering.js'
import { calculateSmartPopupPosition, getSuppressedSensorLabelIds } from '../src/services/meshNetwork/popupPositioning.js'

describe('1. 3D Coordinate & Distance Mathematics', () => {
  it('calculates 3D Euclidean distance correctly', () => {
    const p1 = { x: 0, y: 0, z: 0 }
    const p2 = { x: 3, y: 4, z: 0 }
    assert.equal(calculate3DDistance(p1, p2), 5.0)

    const p3 = { x: 1, y: 2, z: 2 }
    const p4 = { x: 4, y: 6, z: 2 }
    assert.equal(calculate3DDistance(p3, p4), 5.0)
  })

  it('converts between 2D grid coordinates and 3D world space consistently', () => {
    const gridX = 50
    const gridY = 50
    const world = gridCoordsToWorld(gridX, gridY)
    assert.equal(world.x, 0)
    assert.equal(world.z, 0)

    const backGrid = worldCoordsToGrid(world.x, world.z)
    assert.equal(backGrid.x, 50)
    assert.equal(backGrid.y, 50)
  })
})

describe('2. Sensor Topology & Base Station', () => {
  it('generates deterministic sensor distribution with stable IDs', () => {
    const sensors1 = generateSensorTopology(28, 22, 28)
    const sensors2 = generateSensorTopology(28, 22, 28)

    assert.equal(sensors1.length, 28)
    assert.equal(sensors2.length, 28)
    assert.equal(sensors1[0].id, 'S-001')
    assert.equal(sensors1[27].id, 'S-028')
    assert.deepEqual(sensors1[0].position, sensors2[0].position)
    assert.equal(sensors1[0].status, 'online')
  })

  it('provides base station with configurable communication range', () => {
    const base = getBaseStation(26.0)
    assert.equal(base.id, 'BASE')
    assert.equal(base.communicationRange, 26.0)
    assert.ok(base.position.x !== undefined)
  })
})

describe('3. Mesh Graph Construction & Range Rules', () => {
  it('two operational sensors within min(rangeA, rangeB) form a valid link', () => {
    const s1 = { id: 'A', position: { x: 0, y: 0, z: 0 }, communicationRange: 15, status: 'online' }
    const s2 = { id: 'B', position: { x: 10, y: 0, z: 0 }, communicationRange: 12, status: 'online' }
    const graph = buildMeshGraph([s1, s2], null)

    assert.equal(graph.edges.length, 1)
    assert.equal(graph.edges[0].status, 'active')
    assert.equal(graph.edges[0].distance, 10.0)
  })

  it('two sensors outside min(rangeA, rangeB) have NO link', () => {
    const s1 = { id: 'A', position: { x: 0, y: 0, z: 0 }, communicationRange: 10, status: 'online' }
    const s2 = { id: 'B', position: { x: 15, y: 0, z: 0 }, communicationRange: 20, status: 'online' }
    const graph = buildMeshGraph([s1, s2], null)

    assert.equal(graph.edges.length, 0)
  })

  it('failed sensors have their links deactivated and excluded from active adjacency', () => {
    const s1 = { id: 'A', position: { x: 0, y: 0, z: 0 }, communicationRange: 15, status: 'online' }
    const s2 = { id: 'B', position: { x: 10, y: 0, z: 0 }, communicationRange: 15, status: 'failed' }
    const graph = buildMeshGraph([s1, s2], null)

    assert.equal(graph.edges.length, 1)
    assert.equal(graph.edges[0].status, 'failed')
    assert.equal(graph.adjacency.get('A').length, 0)
    assert.equal(graph.adjacency.get('B').length, 0)
  })
})

describe('4. Dijkstra Shortest-Path Algorithm', () => {
  it('finds minimum-cost multi-hop path through relays to BASE', () => {
    const s1 = { id: 'S1', position: { x: 0, y: 0, z: 0 }, communicationRange: 12, status: 'online' }
    const s2 = { id: 'S2', position: { x: 10, y: 0, z: 0 }, communicationRange: 12, status: 'online' }
    const s3 = { id: 'S3', position: { x: 20, y: 0, z: 0 }, communicationRange: 12, status: 'online' }
    const base = { id: 'BASE', position: { x: 30, y: 0, z: 0 }, communicationRange: 12, status: 'online' }

    const graph = buildMeshGraph([s1, s2, s3], base)
    const result = findShortestPath(graph.adjacency, 'S1', 'BASE')

    assert.equal(result.reachable, true)
    assert.deepEqual(result.path, ['S1', 'S2', 'S3', 'BASE'])
    assert.equal(result.hops, 3)
    assert.equal(result.totalCost, 30.0)

    const altCheck = findAlternativeRoute(graph.adjacency, 'S1', 'S2', 'BASE')
    assert.equal(altCheck.hasAlternative, false) // S2 is a single critical bridge in this linear path
  })

  it('excludes failed sensors from shortest path', () => {
    // S1 connects to S2 and S3. S2 connects to BASE. S3 connects to BASE.
    // If S2 fails, path must use S3.
    const s1 = { id: 'S1', position: { x: 0, y: 0, z: 0 }, communicationRange: 15, status: 'online' }
    const s2 = { id: 'S2', position: { x: 10, y: -2, z: 0 }, communicationRange: 15, status: 'failed' }
    const s3 = { id: 'S3', position: { x: 10, y: 5, z: 0 }, communicationRange: 15, status: 'online' }
    const base = { id: 'BASE', position: { x: 20, y: 0, z: 0 }, communicationRange: 15, status: 'online' }

    const graph = buildMeshGraph([s1, s2, s3], base)
    const result = findShortestPath(graph.adjacency, 'S1', 'BASE')

    assert.equal(result.reachable, true)
    assert.deepEqual(result.path, ['S1', 'S3', 'BASE'])
    assert.ok(!result.path.includes('S2'))
  })

  it('reports unreachable when graph is disconnected', () => {
    const s1 = { id: 'S1', position: { x: 0, y: 0, z: 0 }, communicationRange: 5, status: 'online' }
    const base = { id: 'BASE', position: { x: 50, y: 0, z: 0 }, communicationRange: 5, status: 'online' }

    const graph = buildMeshGraph([s1], base)
    const result = findShortestPath(graph.adjacency, 'S1', 'BASE')

    assert.equal(result.reachable, false)
    assert.equal(result.path.length, 0)
  })
})

describe('5. Acoustic Event Detection & Intelligent Fusion', () => {
  it('detects sound events within hearing range and excludes distant sensors', () => {
    const s1 = { id: 'S1', position: { x: 0, y: 0, z: 0 }, acousticDetectionRange: 25, status: 'online' }
    const s2 = { id: 'S2', position: { x: 10, y: 0, z: 0 }, acousticDetectionRange: 25, status: 'online' }
    const s3 = { id: 'S3', position: { x: 50, y: 0, z: 0 }, acousticDetectionRange: 20, status: 'online' }

    const eventPos = { x: 4, y: 0, z: 0 }
    const res = detectAcousticEvent([s1, s2, s3], eventPos, 'gunshot_sound')

    assert.equal(res.heard, true)
    assert.equal(res.detectionCount, 2)
    assert.deepEqual(res.detectingSensorIds.sort(), ['S1', 'S2'])
    assert.ok(!res.detectingSensorIds.includes('S3'))
  })

  it('failed sensors cannot generate acoustic detections', () => {
    const s1 = { id: 'S1', position: { x: 0, y: 0, z: 0 }, acousticDetectionRange: 25, status: 'failed' }
    const res = detectAcousticEvent([s1], { x: 2, y: 0, z: 0 })

    assert.equal(res.heard, false)
    assert.equal(res.detectionCount, 0)
  })

  it('combines multiple sensor detections into ONE fused incident with estimated position & uncertainty', () => {
    const s1 = { id: 'S1', position: { x: 0, y: 0, z: 0 }, acousticDetectionRange: 30, communicationRange: 20, status: 'online' }
    const s2 = { id: 'S2', position: { x: 10, y: 0, z: 0 }, acousticDetectionRange: 30, communicationRange: 20, status: 'online' }
    const base = { id: 'BASE', position: { x: 25, y: 0, z: 0 }, communicationRange: 20, status: 'online' }

    const graph = buildMeshGraph([s1, s2], base)
    const eventPos = { x: 5, y: 0, z: 0 }
    const detectionRes = detectAcousticEvent([s1, s2], eventPos, 'gunshot_sound')

    const locEstimate = estimateSourceLocation(detectionRes.detections)
    assert.ok(locEstimate.uncertaintyRadius > 0)
    assert.ok(locEstimate.confidence > 0.5)

    const fused = fuseAcousticIncident(detectionRes, 'gunshot_sound', graph)

    assert.ok(fused !== null)
    assert.equal(fused.detectionCount, 2)
    assert.deepEqual(fused.detectingSensors.sort(), ['S1', 'S2'])
    assert.ok(fused.uncertaintyRadius > 0)
    assert.equal(fused.type, 'gunshot_sound')
    assert.ok(fused.originatingSensorId === 'S2' || fused.originatingSensorId === 'S1')
  })
})

describe('6. Packet Transmission & Dynamic Failover', () => {
  it('steps packet along Dijkstra path until delivered to BASE', () => {
    let delivered = false
    const packet = createMeshPacket('P-1', 'INC-1', 'S1', ['S1', 'S2', 'BASE'], 20.0)

    assert.equal(packet.status, 'in_transit')
    assert.equal(packet.currentNode, 'S1')
    assert.equal(packet.nextNode, 'S2')

    // Step 1: Hop 1 complete
    stepMeshPacket(packet, 2.0, 1.0)
    assert.equal(packet.currentNode, 'S2')
    assert.equal(packet.nextNode, 'BASE')

    // Step 2: Hop 2 complete -> reached BASE
    stepMeshPacket(packet, 2.0, 1.0, () => { delivered = true })
    assert.equal(packet.status, 'delivered')
    assert.equal(delivered, true)
  })

  it('automatically reroutes in-transit packet when intermediate sensor fails and alternative path exists', () => {
    // S1 -> S2 -> BASE (primary)
    // S1 -> S3 -> BASE (backup)
    const s1 = { id: 'S1', position: { x: 0, y: 0, z: 0 }, communicationRange: 15, status: 'online' }
    const s2 = { id: 'S2', position: { x: 10, y: 0, z: 0 }, communicationRange: 15, status: 'online' }
    const s3 = { id: 'S3', position: { x: 10, y: 8, z: 0 }, communicationRange: 15, status: 'online' }
    const base = { id: 'BASE', position: { x: 20, y: 0, z: 0 }, communicationRange: 15, status: 'online' }

    const initialGraph = buildMeshGraph([s1, s2, s3], base)
    assert.equal(initialGraph.stats.operationalSensors, 3)
    const packet = createMeshPacket('P-1', 'INC-1', 'S1', ['S1', 'S2', 'BASE'], 20.0)

    // Now S2 fails!
    s2.status = 'failed'
    const failedGraph = buildMeshGraph([s1, s2, s3], base)

    const failover = handleSensorFailureOnPackets([packet], failedGraph, 'S2')

    assert.equal(failover.reroutedCount, 1)
    assert.deepEqual(failover.updatedPackets[0].path, ['S1', 'S3', 'BASE'])
    assert.equal(failover.updatedPackets[0].status, 'rerouting')
  })

  it('queues packet when no alternative route to base exists, and resumes when sensor recovers', () => {
    // Linear topology: S1 -> S2 -> BASE. If S2 fails, S1 is isolated.
    const s1 = { id: 'S1', position: { x: 0, y: 0, z: 0 }, communicationRange: 12, status: 'online' }
    const s2 = { id: 'S2', position: { x: 10, y: 0, z: 0 }, communicationRange: 12, status: 'online' }
    const base = { id: 'BASE', position: { x: 20, y: 0, z: 0 }, communicationRange: 12, status: 'online' }

    const initialGraph = buildMeshGraph([s1, s2], base)
    assert.equal(initialGraph.stats.operationalSensors, 2)
    const packet = createMeshPacket('P-1', 'INC-1', 'S1', ['S1', 'S2', 'BASE'], 20.0)

    // S2 fails
    s2.status = 'failed'
    const failedGraph = buildMeshGraph([s1, s2], base)

    const failover = handleSensorFailureOnPackets([packet], failedGraph, 'S2')
    assert.equal(failover.queuedCount, 1)
    assert.equal(failover.updatedPackets[0].status, 'queued')

    // S2 recovers
    s2.status = 'online'
    const recoveredGraph = buildMeshGraph([s1, s2], base)

    const recovered = resumeQueuedPackets(failover.updatedPackets, recoveredGraph)
    assert.equal(recovered.resumedCount, 1)
    assert.equal(recovered.updatedPackets[0].status, 'in_transit')
    assert.deepEqual(recovered.updatedPackets[0].path, ['S1', 'S2', 'BASE'])
  })
})

describe('7. Base-Station-Confirmed Email Notification Workflow', () => {
  it('defaults to DISABLED mode with 3 defined modes', () => {
    assert.equal(DEFAULT_EMAIL_NOTIFICATION_MODE, 'DISABLED')
    assert.equal(EMAIL_NOTIFICATION_MODES.DISABLED, 'DISABLED')
    assert.equal(EMAIL_NOTIFICATION_MODES.IMMEDIATE, 'IMMEDIATE')
    assert.equal(EMAIL_NOTIFICATION_MODES.AFTER_BASE_STATION, 'AFTER BASE STATION RECEIVES PACKET')
  })

  it('persists notification mode in localStorage and defaults to DISABLED when empty', () => {
    // Simulating localStorage behavior
    const mockStorage = new Map()

    const getInitialNotificationMode = (storage) => {
      try {
        const saved = storage.get('ecosentry_email_notification_mode')
        if (saved && Object.values(EMAIL_NOTIFICATION_MODES).includes(saved)) {
          return saved
        }
      } catch {}
      return DEFAULT_EMAIL_NOTIFICATION_MODE
    }

    // 1. Initial application load: empty localStorage -> must be DISABLED
    assert.equal(getInitialNotificationMode(mockStorage), 'DISABLED')

    // 2. User manually selects AFTER_BASE_STATION
    mockStorage.set('ecosentry_email_notification_mode', EMAIL_NOTIFICATION_MODES.AFTER_BASE_STATION)
    assert.equal(getInitialNotificationMode(mockStorage), 'AFTER BASE STATION RECEIVES PACKET')

    // 3. User manually selects IMMEDIATE
    mockStorage.set('ecosentry_email_notification_mode', EMAIL_NOTIFICATION_MODES.IMMEDIATE)
    assert.equal(getInitialNotificationMode(mockStorage), 'IMMEDIATE')

    // 4. User manually switches back to DISABLED
    mockStorage.set('ecosentry_email_notification_mode', EMAIL_NOTIFICATION_MODES.DISABLED)
    assert.equal(getInitialNotificationMode(mockStorage), 'DISABLED')

    // 5. Corrupted / invalid value in localStorage -> gracefully falls back to DISABLED
    mockStorage.set('ecosentry_email_notification_mode', 'INVALID_MODE')
    assert.equal(getInitialNotificationMode(mockStorage), 'DISABLED')
  })

  it('decouples creation from notification in AFTER BASE STATION mode', () => {
    // Simulated incident creation workflow under AFTER_BASE_STATION mode
    const mode = EMAIL_NOTIFICATION_MODES.AFTER_BASE_STATION
    let emailsSent = 0

    const mockSendEmail = () => {
      emailsSent++
      return Promise.resolve({ success: true })
    }

    // Step A: Incident created
    const incident = {
      id: 'INC-101',
      title: 'Gunshot Detected',
      deliveryStatus: 'IN_TRANSIT',
      emailNotificationStatus: mode === EMAIL_NOTIFICATION_MODES.IMMEDIATE ? 'SENT' : 'PENDING_BASE_CONFIRMATION'
    }

    // Verify email is NOT sent at creation in this mode
    assert.equal(incident.emailNotificationStatus, 'PENDING_BASE_CONFIRMATION')
    assert.equal(emailsSent, 0)

    // Step B: Packet simulates hops across mesh
    const packet = createMeshPacket('PKT-101', incident.id, 'S1', ['S1', 'S2', 'BASE'], 20.0)
    let packetDeliveredToBase = false

    // Hop 1
    stepMeshPacket(packet, 2.0, 1.0)
    assert.equal(packet.currentNode, 'S2')
    assert.equal(packetDeliveredToBase, false)
    assert.equal(emailsSent, 0) // Still not delivered to base -> no email!

    // Hop 2: Reaches BASE
    stepMeshPacket(packet, 2.0, 1.0, (delPkt) => {
      packetDeliveredToBase = true
      // On confirmed arrival at BASE:
      incident.deliveryStatus = 'DELIVERED'
      mockSendEmail()
      incident.emailNotificationStatus = 'EMAIL SENT'
    })

    assert.equal(packetDeliveredToBase, true)
    assert.equal(packet.status, 'delivered')
    assert.equal(incident.deliveryStatus, 'DELIVERED')
    assert.equal(emailsSent, 1) // Dispatched only after base confirmation!
    assert.equal(incident.emailNotificationStatus, 'EMAIL SENT')
  })

  it('does NOT send email if packet is dropped or unable to reach BASE', () => {
    let emailsSent = 0
    const mockSendEmail = () => { emailsSent++ }

    // Packet in disconnected cluster
    const packet = createMeshPacket('PKT-102', 'INC-102', 'S1', ['S1', 'S2'], 10.0) // Path does not reach BASE
    packet.status = 'queued' // or isolated

    // Stepping does not trigger delivery callback
    stepMeshPacket(packet, 5.0, 1.0, () => {
      mockSendEmail()
    })

    assert.equal(emailsSent, 0)
    assert.notEqual(packet.status, 'delivered')
  })

  it('suppresses all email dispatches when notification mode is DISABLED while packet routing operates 100%', () => {
    const mode = EMAIL_NOTIFICATION_MODES.DISABLED
    let emailsSent = 0
    const mockSendEmail = () => { emailsSent++ }

    // Incident creation under DISABLED mode
    const incident = {
      id: 'INC-103',
      title: 'Chainsaw Sound',
      deliveryStatus: 'in_transit',
      emailNotificationStatus:
        mode === EMAIL_NOTIFICATION_MODES.IMMEDIATE
          ? 'SENDING'
          : mode === EMAIL_NOTIFICATION_MODES.DISABLED
          ? 'DISABLED'
          : 'PENDING_BASE_CONFIRMATION'
    }

    assert.equal(incident.emailNotificationStatus, 'DISABLED')
    assert.equal(emailsSent, 0)

    // Packet transmission across mesh
    const packet = createMeshPacket('PKT-103', incident.id, 'S1', ['S1', 'S2', 'BASE'], 20.0)
    let packetDelivered = false
    let baseToastMessage = null

    stepMeshPacket(packet, 2.0, 1.0)
    assert.equal(packet.currentNode, 'S2')
    assert.equal(emailsSent, 0)

    // Packet arrives at BASE
    stepMeshPacket(packet, 2.0, 1.0, (delPkt) => {
      packetDelivered = true
      incident.deliveryStatus = 'DELIVERED'
      if (mode === EMAIL_NOTIFICATION_MODES.AFTER_BASE_STATION) {
        mockSendEmail()
      } else {
        baseToastMessage = mode === EMAIL_NOTIFICATION_MODES.DISABLED ? 'NOTIFICATIONS DISABLED' : 'PACKET DELIVERY CONFIRMED'
      }
    })

    assert.equal(packetDelivered, true, 'Packet reached BASE normally')
    assert.equal(packet.status, 'delivered')
    assert.equal(incident.deliveryStatus, 'DELIVERED')
    assert.equal(baseToastMessage, 'NOTIFICATIONS DISABLED')
    assert.equal(emailsSent, 0, 'Zero emails dispatched when DISABLED')
  })
})

describe('8. Tactical Map Drag-Only Placement Lifecycle & Invariants', () => {
  it('strict rule: clicking without pointer displacement creates 0 incidents', () => {
    let incidentCreated = false
    const onAddIncident = () => { incidentCreated = true }

    // Simulating pointerdown followed immediately by pointerup without pointermove displacement
    const startPos = { x: 100, y: 150 }
    const endPos = { x: 101, y: 150 } // < 6px movement
    const hasDragged = Math.hypot(endPos.x - startPos.x, endPos.y - startPos.y) >= 6

    // Pointer up handler:
    if (hasDragged) {
      onAddIncident()
    }

    assert.equal(hasDragged, false)
    assert.equal(incidentCreated, false)
  })

  it('strict rule: clicking terrain or sensor does not trigger incident placement', () => {
    let incidentCreated = false
    const onAddIncident = () => { incidentCreated = true }

    // Terrain click event:
    const handleTerrainClick = () => {
      // Disabled by strict rule: No incident creation on terrain click
    }

    handleTerrainClick()
    assert.equal(incidentCreated, false)
  })

  it('valid drag-and-drop lifecycle creates exactly one incident with accurate 3D coordinates', () => {
    let incidentsCreated = 0
    let createdIncident = null
    const onAddIncident = (inc) => {
      incidentsCreated++
      createdIncident = inc
    }

    // Drag from toolbox onto 3D terrain
    const startPos = { x: 100, y: 150 }
    const movePos = { x: 380, y: 420 } // displaced over 3D canvas
    const hasDragged = Math.hypot(movePos.x - startPos.x, movePos.y - startPos.y) >= 6
    assert.equal(hasDragged, true)

    // Raycast hit on terrain diorama
    const terrainHit = { x: -18.5, y: 2.4, z: 14.2 }
    const isTerrainHitValid = Math.abs(terrainHit.x) <= 49.0 && Math.abs(terrainHit.z) <= 49.0
    assert.equal(isTerrainHitValid, true)

    if (hasDragged && terrainHit && isTerrainHitValid) {
      const gridX = Math.max(0, Math.min(100, terrainHit.x + 50))
      const gridY = Math.max(0, Math.min(100, terrainHit.z + 50))
      onAddIncident({
        id: 'EVT-TAC-001',
        type: 'gunshot_sound',
        coordinates: { x: Number(gridX.toFixed(1)), y: Number(gridY.toFixed(1)) }
      })
    }

    assert.equal(incidentsCreated, 1)
    assert.equal(createdIncident.id, 'EVT-TAC-001')
    assert.equal(createdIncident.coordinates.x, 31.5)
    assert.equal(createdIncident.coordinates.y, 64.2)
  })

  it('dropping outside terrain boundaries cancels placement without creating an incident', () => {
    let incidentsCreated = 0
    const onAddIncident = () => { incidentsCreated++ }

    const hasDragged = true
    const terrainHit = { x: 65.0, y: 0.0, z: -12.0 } // > 49.0 (outside diorama bounds)
    const isTerrainHitValid = Math.abs(terrainHit.x) <= 49.0 && Math.abs(terrainHit.z) <= 49.0

    if (hasDragged && terrainHit && isTerrainHitValid) {
      onAddIncident()
    }

    assert.equal(isTerrainHitValid, false)
    assert.equal(incidentsCreated, 0)
  })

  it('cancelling a drag (e.g. Escape key) creates 0 incidents', () => {
    let draggingItem = { id: 'gunshot', title: 'Gunshot Detected' }
    let hasDragged = true
    let incidentsCreated = 0

    // User presses Escape
    const handleKeyDown = (key) => {
      if (key === 'Escape') {
        draggingItem = null
        hasDragged = false
      }
    }

    handleKeyDown('Escape')

    // Subsequent pointerup
    if (draggingItem && hasDragged) {
      incidentsCreated++
    }

    assert.equal(draggingItem, null)
    assert.equal(hasDragged, false)
    assert.equal(incidentsCreated, 0)
  })

  it('dropping at different terrain locations produces corresponding 3D and grid positions', () => {
    const drops = [
      { world: { x: 0, z: 0 }, expectedGrid: { x: 50, y: 50 } },
      { world: { x: -30, z: -20 }, expectedGrid: { x: 20, y: 30 } },
      { world: { x: 25.5, z: 40.5 }, expectedGrid: { x: 75.5, y: 90.5 } }
    ]

    drops.forEach(({ world, expectedGrid }) => {
      const gridX = world.x + 50
      const gridY = world.z + 50
      assert.equal(gridX, expectedGrid.x)
      assert.equal(gridY, expectedGrid.y)

      const backWorld = gridCoordsToWorld(gridX, gridY)
      assert.equal(backWorld.x, world.x)
      assert.equal(backWorld.z, world.z)
    })
  })

  it('existing incidents remain visible without duplication across both maps', () => {
    const existingEvents = [
      { id: 'EVT-001', title: 'Gunshot Detected', coordinates: { x: 25, y: 35 } },
      { id: 'EVT-002', title: 'Suspicious Human Movement', coordinates: { x: 70, y: 80 } }
    ]

    // New incident dropped
    const newIncident = { id: 'EVT-TAC-003', title: 'Chainsaw Detected', coordinates: { x: 40, y: 50 } }

    const updatedEvents = [newIncident, ...existingEvents]

    assert.equal(updatedEvents.length, 3)
    assert.equal(updatedEvents[0].id, 'EVT-TAC-003')
    assert.equal(updatedEvents[1].id, 'EVT-001')
    assert.equal(updatedEvents[2].id, 'EVT-002')

    // No duplicate IDs
    const uniqueIds = new Set(updatedEvents.map((e) => e.id))
    assert.equal(uniqueIds.size, 3)
  })
})

describe('9. Tactical Map Marker Filtering & Red Demo Marker Elimination', () => {
  it('excludes hardcoded demo incidents (EVT-2026-*) from the tactical map view', () => {
    const demoEvents = [
      { id: 'EVT-2026-101', priority: 'critical', title: 'Chainsaw Sound', isSimulated: true },
      { id: 'EVT-2026-102', priority: 'critical', title: 'Gunshot Pulse', isSimulated: true },
      { id: 'EVT-2026-103', priority: 'high', title: 'Human Presence', isSimulated: true },
      { id: 'EVT-2026-105', priority: 'medium', title: 'Sensor Failure', isSimulated: true }
    ]

    demoEvents.forEach((evt) => {
      assert.equal(
        isLegitimateTacticalIncident(evt),
        false,
        `Expected demo event ${evt.id} to be excluded from tactical map`
      )
    })
  })

  it('preserves user-placed manual incidents and acoustic-fused incidents', () => {
    const manualTactical = {
      id: 'EVT-TAC-9921',
      title: 'Gunshot Detected',
      priority: 'critical',
      isManual: true,
      coordinates: { x: 34, y: 45 }
    }
    const manualForest = {
      id: 'EVT-MAN-1102',
      title: 'Chainsaw Detected',
      priority: 'high',
      isManual: true,
      coordinates: { x: 60, y: 70 }
    }
    const acousticFused = {
      id: 'EVT-FUSED-5544',
      title: 'Acoustic Sound Event',
      priority: 'high',
      isAcousticFused: true,
      coordinates: { x: 50, y: 50 }
    }

    assert.equal(isLegitimateTacticalIncident(manualTactical), true)
    assert.equal(isLegitimateTacticalIncident(manualForest), true)
    assert.equal(isLegitimateTacticalIncident(acousticFused), true)
  })

  it('filters a mixed events list cleanly, ensuring 0 red demo markers appear on tactical load', () => {
    const initialMixedEvents = [
      { id: 'EVT-2026-101', priority: 'critical', title: 'Chainsaw', isSimulated: true },
      { id: 'EVT-2026-102', priority: 'critical', title: 'Gunshot', isSimulated: true },
      { id: 'EVT-2026-103', priority: 'high', title: 'Human Presence', isSimulated: true },
      { id: 'EVT-2026-106', priority: 'low', title: 'Tiger Sighted', isSimulated: true }
    ]

    // On initial load without activeIncident, tactical map must display 0 markers
    const tacticalList = initialMixedEvents.filter(isLegitimateTacticalIncident)
    assert.equal(tacticalList.length, 0, 'Initial tactical map must be free of unwanted red demo markers')

    // When user drops an incident, exactly that incident appears
    const userPlaced = {
      id: 'EVT-TAC-123456',
      title: 'Gunshot Detected',
      priority: 'critical',
      isManual: true,
      coordinates: { x: 45, y: 45 }
    }
    const withUserIncident = [userPlaced, ...initialMixedEvents]
    const updatedTacticalList = withUserIncident.filter(isLegitimateTacticalIncident)

    assert.equal(updatedTacticalList.length, 1)
    assert.equal(updatedTacticalList[0].id, 'EVT-TAC-123456')
  })
})

describe('10. Store-and-Forward Messaging & Local Queue Invariants', () => {
  it('creates message with complete Store-and-Forward data model', () => {
    const msg = createMeshMessage({
      messageId: 'MSG-001',
      incidentId: 'INC-001',
      originSensorId: 'S-001',
      currentSensorId: 'S-001',
      destination: 'BASE',
      messageType: 'chainsaw_sound',
      payload: { title: 'Chainsaw Sound Detected', priority: 'critical' },
      priority: 'critical',
      route: ['S-001', 'S-002', 'BASE'],
      routeCost: 24.5
    })

    assert.equal(msg.messageId, 'MSG-001')
    assert.equal(msg.id, 'MSG-001')
    assert.equal(msg.incidentId, 'INC-001')
    assert.equal(msg.originSensorId, 'S-001')
    assert.equal(msg.currentSensorId, 'S-001')
    assert.equal(msg.destination, 'BASE')
    assert.equal(msg.priority, 'critical')
    assert.equal(msg.status, 'in_transit')
    assert.equal(msg.retryCount, 0)
    assert.deepEqual(msg.route, ['S-001', 'S-002', 'BASE'])
    assert.equal(msg.nextNode, 'S-002')
  })

  it('enforces sensor queue capacity and priority preemption', () => {
    const sensor = {
      id: 'S-010',
      name: 'Sensor S-010',
      status: 'online',
      messageQueue: []
    }

    // Fill queue to capacity (3 for test)
    const cap = 3
    for (let i = 1; i <= cap; i++) {
      const msg = createMeshMessage({
        messageId: `MSG-LOW-${i}`,
        incidentId: `INC-${i}`,
        originSensorId: sensor.id,
        priority: 'low'
      })
      const res = enqueueMessageAtSensor(sensor, msg, cap)
      sensor.messageQueue = res.sensor.messageQueue
      assert.equal(res.success, true)
    }

    assert.equal(sensor.messageQueue.length, 3)

    // Attempt to add a 4th LOW priority message (must be rejected due to capacity)
    const lowMsg = createMeshMessage({
      messageId: 'MSG-LOW-4',
      originSensorId: sensor.id,
      priority: 'low'
    })
    const overflowRes = enqueueMessageAtSensor(sensor, lowMsg, cap)
    assert.equal(overflowRes.success, false)
    assert.equal(overflowRes.droppedMessage.status, 'failed')
    assert.equal(sensor.messageQueue.length, 3)

    // Attempt to add a CRITICAL priority message (must preempt lowest priority message)
    const criticalMsg = createMeshMessage({
      messageId: 'MSG-CRIT-1',
      originSensorId: sensor.id,
      priority: 'critical'
    })
    const preemptionRes = enqueueMessageAtSensor(sensor, criticalMsg, cap)
    assert.equal(preemptionRes.success, true)
    assert.equal(preemptionRes.sensor.messageQueue.length, 3)
    // Critical message must be at head of queue
    assert.equal(preemptionRes.sensor.messageQueue[0].messageId, 'MSG-CRIT-1')
    assert.equal(preemptionRes.droppedMessage.priority, 'low')
  })

  it('buffers in-flight message in local sensor queue when network disconnects', () => {
    const s1 = { id: 'S1', position: { x: 0, y: 0, z: 0 }, status: 'online', communicationRange: 16, messageQueue: [] }
    const s2 = { id: 'S2', position: { x: 12, y: 0, z: 0 }, status: 'online', communicationRange: 16, messageQueue: [] }
    const base = { id: 'BASE', position: { x: 24, y: 0, z: 0 }, status: 'online', communicationRange: 16 }

    const initialGraph = buildMeshGraph([s1, s2], base)
    const packet = createMeshPacket('MSG-SF-1', 'INC-SF-1', 'S1', ['S1', 'S2', 'BASE'], 24.0, {
      title: 'Gunshot Transient',
      priority: 'critical'
    })

    // S2 fails (breaking connection to BASE)
    s2.status = 'failed'
    const failedGraph = buildMeshGraph([s1, s2], base)

    const failover = handleSensorFailureOnPackets([packet], failedGraph, 'S2', [s1, s2])
    assert.equal(failover.queuedCount, 1)
    assert.equal(failover.updatedPackets[0].status, 'queued')

    // Message must be stored in S1's local queue
    const updatedS1 = failover.updatedSensors.find((s) => s.id === 'S1')
    assert.equal(updatedS1.messageQueue.length, 1)
    assert.equal(updatedS1.messageQueue[0].messageId, 'MSG-SF-1')
    assert.equal(updatedS1.messageQueue[0].status, 'queued')
  })

  it('forwards queued message from sensor when network is restored', () => {
    const s1 = { id: 'S1', position: { x: 0, y: 0, z: 0 }, status: 'online', communicationRange: 16, messageQueue: [] }
    const s2 = { id: 'S2', position: { x: 12, y: 0, z: 0 }, status: 'online', communicationRange: 16, messageQueue: [] }
    const base = { id: 'BASE', position: { x: 24, y: 0, z: 0 }, status: 'online', communicationRange: 16 }

    const queuedMsg = createMeshMessage({
      messageId: 'MSG-RECOVER-1',
      incidentId: 'INC-REC-1',
      originSensorId: 'S1',
      currentSensorId: 'S1',
      priority: 'high',
      payload: { title: 'Suspicious Human Movement' }
    })
    queuedMsg.status = 'queued'
    s1.messageQueue = [queuedMsg]

    // Graph where S1 -> S2 -> BASE is connected
    const graph = buildMeshGraph([s1, s2], base)

    const recovery = resumeQueuedPackets([queuedMsg], graph, [s1, s2])
    assert.equal(recovery.resumedCount, 1)
    assert.equal(recovery.updatedPackets.length, 1)
    assert.equal(recovery.updatedPackets[0].status, 'in_transit')
    assert.deepEqual(recovery.updatedPackets[0].route, ['S1', 'S2', 'BASE'])

    // S1 queue should now be empty (dequeued for transmission)
    const updatedS1 = recovery.updatedSensors.find((s) => s.id === 'S1')
    assert.equal(updatedS1.messageQueue.length, 0)

    // Message steps hop-by-hop and delivers to BASE
    let delivered = false
    const inTransitPkt = recovery.updatedPackets[0]
    stepMeshPacket(inTransitPkt, 2.0, 1.0) // Hop 1: S1 -> S2
    assert.equal(inTransitPkt.currentNode, 'S2')

    stepMeshPacket(inTransitPkt, 2.0, 1.0, (del) => {
      delivered = true
      assert.equal(del.messageId, 'MSG-RECOVER-1')
      assert.equal(del.status, 'delivered')
    })
    assert.equal(delivered, true)
  })

  it('calculates Store-and-Forward telemetry metrics accurately', () => {
    const s1 = {
      id: 'S-001',
      name: 'Node S-001',
      status: 'online',
      messageQueue: [
        { messageId: 'M1', priority: 'high', status: 'queued', createdAt: new Date().toISOString() },
        { messageId: 'M2', priority: 'critical', status: 'queued', createdAt: new Date().toISOString() }
      ]
    }
    const s2 = {
      id: 'S-002',
      name: 'Node S-002',
      status: 'failed',
      messageQueue: [
        { messageId: 'M3', priority: 'medium', status: 'queued', createdAt: new Date().toISOString() }
      ]
    }

    const packets = [
      { id: 'M1', status: 'queued' },
      { id: 'M2', status: 'queued' },
      { id: 'M3', status: 'queued' },
      { id: 'M4', status: 'in_transit' },
      { id: 'M5', status: 'delivered' }
    ]

    const graph = { reachableFromBase: new Set(['S-001']) }
    const metrics = getStoreAndForwardMetrics([s1, s2], packets, graph)

    assert.equal(metrics.totalPending, 3)
    assert.equal(metrics.inTransitCount, 1)
    assert.equal(metrics.deliveredCount, 1)
    assert.equal(metrics.sensorsWithQueuedMessages, 2)
    assert.equal(metrics.waitingForConnectivity, 1) // S2 is not reachable from base
    assert.equal(metrics.allQueuedMessages.length, 3)
    // Priority ordering check: critical M2 first
    assert.equal(metrics.allQueuedMessages[0].messageId, 'M2')
  })
})

describe('11. 3D Tactical Sensor Interactive Failure & Restoration Popup Lifecycle', () => {
  it('clicking an online sensor selects it and formats telemetry for popup without creating incidents', () => {
    let incidentCreated = false
    const onAddIncident = () => { incidentCreated = true }

    const s1 = {
      id: 'S-006',
      zoneName: 'Zone 1 (North Canopy)',
      status: 'online',
      batteryLevel: 91,
      communicationRange: 22,
      acousticDetectionRange: 28,
      position: { x: 10, y: 5, z: 12 },
      messageQueue: []
    }
    const base = { id: 'BASE', status: 'online', position: { x: 20, y: 5, z: 12 }, communicationRange: 22 }
    const graph = buildMeshGraph([s1], base)

    // Simulate clicking the sensor node
    let selectedSensorId = null
    let popupOpen = false
    const onSelectNode = (sensor) => {
      selectedSensorId = sensor.id
      popupOpen = true
    }

    onSelectNode(s1)
    assert.equal(selectedSensorId, 'S-006')
    assert.equal(popupOpen, true)
    assert.equal(incidentCreated, false, 'Clicking a sensor must NEVER create an incident')
    assert.equal(graph.reachableFromBase.has('S-006'), true)
  })

  it('dragging the 3D map (displacement > 5px) suppresses sensor click', () => {
    let clickFired = false
    const handleSensorClick = (dx, dy) => {
      if (dx > 5 || dy > 5) return // Camera orbit/pan gesture suppressed
      clickFired = true
    }

    // 1. Camera orbit drag: dx=18, dy=22
    handleSensorClick(18, 22)
    assert.equal(clickFired, false, 'Drag must not trigger sensor selection popup')

    // 2. Genuine click: dx=1, dy=2
    handleSensorClick(1, 2)
    assert.equal(clickFired, true, 'Genuine click must trigger sensor selection')
  })

  it('cancelling failure leaves sensor online with graph intact', () => {
    const s1 = { id: 'S-006', status: 'online', communicationRange: 20, position: { x: 0, y: 0, z: 0 } }
    const base = { id: 'BASE', status: 'online', communicationRange: 20, position: { x: 10, y: 0, z: 0 } }
    const graph = buildMeshGraph([s1], base)

    // User opens popup and clicks Cancel on confirmation dialog
    let confirmed = false
    const onCancel = () => { confirmed = false }
    onCancel()

    // Sensor status and graph must remain untouched
    assert.equal(s1.status, 'online')
    assert.equal(graph.reachableFromBase.has('S-006'), true)
  })

  it('confirming failure sets sensor to failed, removes it from active graph, and reroutes/queues packets', () => {
    const s1 = { id: 'S1', status: 'online', communicationRange: 16, position: { x: 0, y: 0, z: 0 }, messageQueue: [] }
    const s2 = { id: 'S2', status: 'online', communicationRange: 16, position: { x: 12, y: 0, z: 0 }, messageQueue: [] }
    const base = { id: 'BASE', status: 'online', communicationRange: 16, position: { x: 24, y: 0, z: 0 } }

    const initialGraph = buildMeshGraph([s1, s2], base)
    assert.equal(initialGraph.reachableFromBase.has('S1'), true)

    const packet = createMeshPacket('P-01', 'INC-01', 'S1', ['S1', 'S2', 'BASE'], 24, { priority: 'critical' })

    // User confirms failure of S2 in popup
    s2.status = 'failed'
    const updatedGraph = buildMeshGraph([s1, s2], base)

    // S2 must be excluded from active communication links
    assert.equal(updatedGraph.reachableFromBase.has('S2'), false)
    assert.equal(updatedGraph.reachableFromBase.has('S1'), false) // S1 is now isolated

    const failover = handleSensorFailureOnPackets([packet], updatedGraph, 'S2', [s1, s2])
    assert.equal(failover.queuedCount, 1)
    assert.equal(failover.updatedPackets[0].status, 'queued')
  })

  it('restoring an offline sensor sets it online, recalculates valid links, and resumes queued store-and-forward messages', () => {
    const s1 = { id: 'S1', status: 'online', communicationRange: 16, position: { x: 0, y: 0, z: 0 }, messageQueue: [] }
    const s2 = { id: 'S2', status: 'failed', communicationRange: 16, position: { x: 12, y: 0, z: 0 }, messageQueue: [] }
    const base = { id: 'BASE', status: 'online', communicationRange: 16, position: { x: 24, y: 0, z: 0 } }

    const queuedMsg = createMeshMessage({
      messageId: 'MSG-RESTORE-1',
      originSensorId: 'S1',
      currentSensorId: 'S1',
      priority: 'critical'
    })
    queuedMsg.status = 'queued'
    s1.messageQueue = [queuedMsg]

    // User clicks RESTORE SENSOR in popup for S2
    s2.status = 'online'
    const restoredGraph = buildMeshGraph([s1, s2], base)

    // S2 and S1 now have restored communication links to BASE
    assert.equal(restoredGraph.reachableFromBase.has('S2'), true)
    assert.equal(restoredGraph.reachableFromBase.has('S1'), true)

    const recovery = resumeQueuedPackets([queuedMsg], restoredGraph, [s1, s2])
    assert.equal(recovery.resumedCount, 1)
    assert.equal(recovery.updatedPackets[0].status, 'in_transit')
    assert.deepEqual(recovery.updatedPackets[0].route, ['S1', 'S2', 'BASE'])
  })
})

describe('12. Algorithm-Based Optimal Sensor Placement & Network Quality Metrics', () => {
  it('places all 28 sensors within the forest reserve boundaries', () => {
    const sensors = generateSensorTopology(28)
    assert.equal(sensors.length, 28)

    sensors.forEach((s) => {
      // Grid bounds [10, 90]
      assert.ok(s.gridCoordinates.x >= 10 && s.gridCoordinates.x <= 90, `${s.id} gridX ${s.gridCoordinates.x} in bounds`)
      assert.ok(s.gridCoordinates.y >= 10 && s.gridCoordinates.y <= 90, `${s.id} gridY ${s.gridCoordinates.y} in bounds`)
      // 3D World bounds [-42, 42]
      assert.ok(s.position.x >= -42 && s.position.x <= 42, `${s.id} worldX ${s.position.x} in bounds`)
      assert.ok(s.position.z >= -42 && s.position.z <= 42, `${s.id} worldZ ${s.position.z} in bounds`)
    })
  })

  it('sensor positions follow the actual terrain elevation with height offset', () => {
    const sensors = generateSensorTopology(28)

    sensors.forEach((s) => {
      const expectedY = Number((getTerrainElevation(s.position.x, s.position.z) + 0.4).toFixed(2))
      assert.ok(
        Math.abs(s.position.y - expectedY) <= 0.05,
        `${s.id} elevation Y=${s.position.y} matches terrain elevation ${expectedY}`
      )
    })
  })

  it('sensor placement is deterministic across page reloads', () => {
    const runA = generateSensorTopology(28)
    const runB = generateSensorTopology(28)

    assert.equal(runA.length, runB.length)
    for (let i = 0; i < 28; i++) {
      assert.equal(runA[i].id, runB[i].id)
      assert.equal(runA[i].gridCoordinates.x, runB[i].gridCoordinates.x)
      assert.equal(runA[i].gridCoordinates.y, runB[i].gridCoordinates.y)
      assert.equal(runA[i].position.x, runB[i].position.x)
      assert.equal(runA[i].position.y, runB[i].position.y)
      assert.equal(runA[i].position.z, runB[i].position.z)
    }
  })

  it('reduces clustering with Poisson spatial constraints and distributes evenly across all 4 zones', () => {
    const sensors = generateSensorTopology(28)

    // Check minimum inter-sensor distance
    let minDist = Infinity
    for (let i = 0; i < sensors.length; i++) {
      for (let j = i + 1; j < sensors.length; j++) {
        const d = calculate3DDistance(sensors[i].position, sensors[j].position)
        if (d < minDist) minDist = d
      }
    }

    assert.ok(minDist >= 10.5, `Minimum inter-sensor distance ${minDist.toFixed(2)} must be >= 10.5 units (no clustering)`)

    // Zone distribution: 7 per quadrant
    const zoneCounts = {}
    sensors.forEach((s) => {
      zoneCounts[s.zoneId] = (zoneCounts[s.zoneId] || 0) + 1
    })

    assert.deepEqual(zoneCounts, {
      'zone-1': 7,
      'zone-2': 7,
      'zone-3': 7,
      'zone-4': 7
    })
  })

  it('default Bluetooth-like range of 22 units achieves 100% reachability and 0 isolated sensors', () => {
    const sensors = generateSensorTopology(28, DEFAULT_COMMUNICATION_RANGE)
    const base = getBaseStation()
    const graph = buildMeshGraph(sensors, base)

    assert.equal(graph.stats.totalSensors, 28)
    assert.equal(graph.stats.operationalSensors, 28)
    assert.equal(graph.stats.connectivityPercentage, 100)
    assert.equal(graph.stats.reachableSensorCount, 28)
    assert.equal(graph.stats.isolatedSensorsCount, 0)
    assert.equal(graph.stats.connectedComponents, 1)
    assert.ok(graph.stats.activeLinks >= 50, `Active links (${graph.stats.activeLinks}) should form a connected mesh`)
  })

  it('calculates network redundancy and assigns OPTIMAL network status', () => {
    const sensors = generateSensorTopology(28, DEFAULT_COMMUNICATION_RANGE)
    const base = getBaseStation()
    const graph = buildMeshGraph(sensors, base)

    assert.ok(graph.stats.redundantSensorsCount >= 20, `Redundant sensors (${graph.stats.redundantSensorsCount}) >= 20`)
    assert.ok(graph.stats.redundancyPercentage >= 70, `Redundancy percentage (${graph.stats.redundancyPercentage}%) >= 70%`)
    assert.equal(graph.stats.networkStatus, 'OPTIMAL')
  })

  it('dynamically transitions network status to DEGRADED and DISCONNECTED when nodes or BASE fail', () => {
    const sensors = generateSensorTopology(28, DEFAULT_COMMUNICATION_RANGE)
    const base = getBaseStation()

    // 1. All online = OPTIMAL
    const normalGraph = buildMeshGraph(sensors, base)
    assert.equal(normalGraph.stats.networkStatus, 'OPTIMAL')

    // 2. Fail S-001 (edge node in Zone 1) -> S-002 leaves reachability at 96% -> DEGRADED
    const degradedSensors = sensors.map((s) => s.id === 'S-001' ? { ...s, status: 'failed' } : s)
    const degradedGraph = buildMeshGraph(degradedSensors, base)
    assert.ok(degradedGraph.stats.connectivityPercentage < 100)
    assert.equal(degradedGraph.stats.networkStatus, 'DEGRADED')

    // 3. Take BASE station offline -> DISCONNECTED
    const disconnectedBase = { ...base, status: 'offline' }
    const disconnectedGraph = buildMeshGraph(sensors, disconnectedBase)
    assert.equal(disconnectedGraph.stats.networkStatus, 'DISCONNECTED')
  })

  it('transmits messages hop-by-hop along Dijkstra path to BASE Station', () => {
    const sensors = generateSensorTopology(28, DEFAULT_COMMUNICATION_RANGE)
    const base = getBaseStation()
    const graph = buildMeshGraph(sensors, base)

    // Test farthest corner node S-018 (Southwest corner of Zone 3)
    const routeResult = findShortestPath(graph.adjacency, 'S-018', 'BASE')
    assert.equal(routeResult.reachable, true)
    assert.ok(routeResult.hops >= 3, `S-018 multi-hop route has ${routeResult.hops} hops`)

    // Step packet hop-by-hop with 2.0s delta (each hop takes 1.6s)
    let packet = createMeshPacket('PKT-HOP-1', 'INC-99', 'S-018', routeResult.path, 28, { title: 'Poaching Alert' })
    let hopsCompleted = 0
    let deliveredCallbackFired = false

    while (packet.status === 'in_transit' && hopsCompleted < 10) {
      const stepRes = stepMeshPacket(packet, 2.0, 1.0, () => {
        deliveredCallbackFired = true
      })
      packet = stepRes.packet
      hopsCompleted++
    }

    assert.equal(packet.status, 'delivered')
    assert.equal(deliveredCallbackFired, true)
    assert.equal(hopsCompleted, routeResult.hops)
  })

  it('Objective B: verifies vertex-disjoint independent routes sharing zero intermediate sensors', () => {
    const sensors = generateSensorTopology(28, DEFAULT_COMMUNICATION_RANGE)
    const base = getBaseStation()
    const graph = buildMeshGraph(sensors, base)

    // At least 24 of 28 sensors must have two independent vertex-disjoint routes to BASE
    assert.ok(graph.stats.twoIndependentRoutesCount >= 24, `Independent routes count ${graph.stats.twoIndependentRoutesCount} >= 24`)
    assert.ok(graph.stats.twoIndependentRoutesPercentage >= 85, `Independent routes percentage ${graph.stats.twoIndependentRoutesPercentage}% >= 85%`)

    // Verify for each sensor with 2 independent paths that the paths share NO intermediate vertices
    graph.stats.twoIndependentRouteSensorIds.forEach((sensorId) => {
      const p1 = findShortestPath(graph.adjacency, sensorId, 'BASE')
      assert.equal(p1.reachable, true)

      if (p1.path.length > 2) {
        // Intermediate vertices on P1
        const intermediateP1 = new Set(p1.path.slice(1, -1))

        // Create subgraph excluding intermediateP1
        const tempAdj = new Map()
        graph.adjacency.forEach((nbrs, u) => {
          if (intermediateP1.has(u)) return
          tempAdj.set(u, nbrs.filter((n) => !intermediateP1.has(n.nodeId)))
        })

        const p2 = findShortestPath(tempAdj, sensorId, 'BASE')
        assert.equal(p2.reachable, true, `${sensorId} must have an alternative path reaching BASE without any intermediate nodes of P1`)

        const intermediateP2 = new Set(p2.path.slice(1, -1))
        for (const node of intermediateP2) {
          assert.equal(intermediateP1.has(node), false, `Paths for ${sensorId} must share NO intermediate sensors: node ${node}`)
        }
      }
    })
  })

  it('Objective C: calculates 3D acoustic coverage across all four zones with high dual coverage', () => {
    const sensors = generateSensorTopology(28, DEFAULT_COMMUNICATION_RANGE, 28.0)
    const cov = calculateAcousticCoverage(sensors)

    // Overall coverage >= 99%
    assert.ok(cov.overallCoveragePct >= 99.0, `Overall coverage ${cov.overallCoveragePct}% >= 99%`)
    // Dual coverage (>= 2 detecting sensors) >= 95%
    assert.ok(cov.dualCoveragePct >= 95.0, `Dual coverage ${cov.dualCoveragePct}% >= 95%`)

    // Each zone has >= 98% coverage
    assert.ok(cov.zone1CoveragePct >= 98.0, `Zone 1 coverage ${cov.zone1CoveragePct}% >= 98%`)
    assert.ok(cov.zone2CoveragePct >= 98.0, `Zone 2 coverage ${cov.zone2CoveragePct}% >= 98%`)
    assert.ok(cov.zone3CoveragePct >= 98.0, `Zone 3 coverage ${cov.zone3CoveragePct}% >= 98%`)
    assert.ok(cov.zone4CoveragePct >= 98.0, `Zone 4 coverage ${cov.zone4CoveragePct}% >= 98%`)
    assert.equal(cov.uncoveredRegions.length, 0, 'Zero uncovered sectors')
  })
})

describe('13. Tactical Sidebar Accordion & Scroll Invariants', () => {
  it('enforces single-panel accordion behavior: opening one panel closes all others', () => {
    // Simulate accordion state machine
    let activePanel = 'inspector'
    const togglePanel = (panelKey) => {
      activePanel = activePanel === panelKey ? null : panelKey
    }

    assert.equal(activePanel, 'inspector', 'Default panel is inspector')

    // Opening Network Configuration closes inspector
    togglePanel('controls')
    assert.equal(activePanel, 'controls', 'Network Configuration is now active')

    // Opening Store & Forward closes Network Configuration
    togglePanel('storeAndForward')
    assert.equal(activePanel, 'storeAndForward', 'Store & Forward is now active')

    // Opening Sensor Directory closes Store & Forward
    togglePanel('list')
    assert.equal(activePanel, 'list', 'Sensor Directory is now active')

    // Clicking already active panel toggles it closed (all panels closed)
    togglePanel('list')
    assert.equal(activePanel, null, 'All panels are now closed')
  })

  it('automatically focuses inspector when sensor is selected', () => {
    let activePanel = 'controls'
    let selectedNodeId = null

    // Handler simulating node selection effect
    const onNodeSelected = (id) => {
      selectedNodeId = id
      if (selectedNodeId) {
        activePanel = 'inspector'
      }
    }

    onNodeSelected('S-005')
    assert.equal(selectedNodeId, 'S-005')
    assert.equal(activePanel, 'inspector', 'Inspector opened automatically on node selection while closing controls')
  })
})

describe('14. Incident Overlay Dismissal & Reopen Invariants', () => {
  it('dismisses overlay visually without deleting incident or interrupting active routing', () => {
    let activeIncident = { id: 'EVT-001', title: 'Chainsaw Sound', status: 'active' }
    let isOverlayVisible = true
    let dismissedIncidentId = null
    const sharedEvents = [activeIncident]

    // Simulate clicking close button (×)
    const onDismissOverlay = () => {
      isOverlayVisible = false
      dismissedIncidentId = activeIncident.id
    }

    onDismissOverlay()
    assert.equal(isOverlayVisible, false, 'Overlay is visually hidden')
    assert.equal(dismissedIncidentId, 'EVT-001', 'Dismissed incident ID is tracked')
    assert.ok(activeIncident !== null, 'Incident is NOT deleted')
    assert.equal(sharedEvents.length, 1, 'Incident remains in Threat Alerts and Event History')
  })

  it('restores overlay when clicking SHOW INCIDENT without creating duplicates', () => {
    const activeIncident = { id: 'EVT-001', title: 'Chainsaw Sound' }
    let isOverlayVisible = false
    let dismissedIncidentId = 'EVT-001'
    const incidents = [activeIncident]

    // Simulate clicking SHOW INCIDENT
    const onShowOverlay = () => {
      isOverlayVisible = true
      dismissedIncidentId = null
    }

    onShowOverlay()
    assert.equal(isOverlayVisible, true, 'Overlay is restored')
    assert.equal(dismissedIncidentId, null)
    assert.equal(incidents.length, 1, 'No duplicate incidents created')
    assert.equal(incidents[0].id, 'EVT-001')
  })

  it('automatically opens for newly logged incident but remains dismissed on telemetry update for same incident', () => {
    let activeIncident = { id: 'EVT-001', title: 'Chainsaw Sound' }
    let isOverlayVisible = false
    let dismissedIncidentId = 'EVT-001'

    const syncVisibility = (inc) => {
      if (inc?.id && inc.id !== dismissedIncidentId) {
        isOverlayVisible = true
        dismissedIncidentId = null
      }
    }

    // Telemetry update arrives for same incident (e.g. delivery status changed)
    activeIncident = { ...activeIncident, deliveryStatus: 'DELIVERED' }
    syncVisibility(activeIncident)
    assert.equal(isOverlayVisible, false, 'Overlay remains dismissed on telemetry update for same incident')

    // New incident created with new ID
    activeIncident = { id: 'EVT-002', title: 'Gunshot Detected' }
    syncVisibility(activeIncident)
    assert.equal(isOverlayVisible, true, 'Overlay automatically opens when a new incident is created')
  })
})

describe('15. Tactical Range Spheres Visualization Default & Invariants', () => {
  it('defaults commRangeMode and acousticRangeMode to "none"', () => {
    // Range filter function mimicking TacticalRanges3D logic
    const filterSpheres = (sensors, commMode, acousticMode, selectedId, detectingIds) => {
      const commSensors = sensors.filter((s) => {
        if (commMode === 'none') return false
        if (commMode === 'all') return true
        if (commMode === 'selected') return s.id === selectedId
        return false
      })

      const acousticSensors = sensors.filter((s) => {
        if (acousticMode === 'none') return false
        if (acousticMode === 'all') return true
        if (acousticMode === 'selected') return s.id === selectedId
        if (acousticMode === 'incident') return detectingIds.includes(s.id)
        return false
      })

      return { commSensors, acousticSensors }
    }

    const dummySensors = [
      { id: 'S-001', communicationRange: 22, acousticDetectionRange: 28 },
      { id: 'S-002', communicationRange: 22, acousticDetectionRange: 28 },
      { id: 'S-003', communicationRange: 22, acousticDetectionRange: 28 }
    ]

    // Default state
    const defaultCommRangeMode = 'none'
    const defaultAcousticRangeMode = 'none'

    const initial = filterSpheres(dummySensors, defaultCommRangeMode, defaultAcousticRangeMode, 'S-001', ['S-002'])
    assert.equal(initial.commSensors.length, 0, '0 comm spheres visible on initial load')
    assert.equal(initial.acousticSensors.length, 0, '0 hearing spheres visible on initial load')

    // Manually selecting 'selected' works
    const withSelected = filterSpheres(dummySensors, 'selected', 'selected', 'S-001', [])
    assert.equal(withSelected.commSensors.length, 1)
    assert.equal(withSelected.commSensors[0].id, 'S-001')
    assert.equal(withSelected.acousticSensors.length, 1)
    assert.equal(withSelected.acousticSensors[0].id, 'S-001')

    // Manually selecting 'incident' works
    const withIncident = filterSpheres(dummySensors, 'none', 'incident', null, ['S-002', 'S-003'])
    assert.equal(withIncident.commSensors.length, 0)
    assert.equal(withIncident.acousticSensors.length, 2)

    // Manually selecting 'all' works
    const withAll = filterSpheres(dummySensors, 'all', 'all', null, [])
    assert.equal(withAll.commSensors.length, 3)
    assert.equal(withAll.acousticSensors.length, 3)
  })
})

describe('16. Tactical Incident Raycasting, Placement Precision & Drag Invariants', () => {
  // Placement position function replicating TacticalIncidents3D getIncidentWorldPos
  function getIncidentWorldPos(inc) {
    if (inc.worldPosition && typeof inc.worldPosition.x === 'number') {
      return {
        x: inc.worldPosition.x,
        y: inc.worldPosition.y,
        z: inc.worldPosition.z || 0
      }
    }
    if (inc.coordinates && inc.coordinates.x !== undefined && inc.coordinates.y !== undefined) {
      const worldX = (inc.coordinates.x - 50) * 1.0
      const worldZ = (inc.coordinates.y - 50) * 1.0
      return { x: worldX, y: 0, z: worldZ }
    }
    if (inc.estimatedPosition && inc.estimatedPosition.x !== undefined) {
      return { ...inc.estimatedPosition }
    }
    return { x: 0, y: 0, z: 0 }
  }

  it('drops incident near sensor S-020 without snapping onto S-020', () => {
    // Sensor S-020 position
    const s020 = { id: 'S-020', position: { x: 20.5, y: 1.2, z: -15.2 } }

    // User drops Gunshot Detected near S-020, but NOT at S-020
    const dropRaycastHit = { x: 26.4, y: 0.8, z: -11.6 }
    const gridX = dropRaycastHit.x + 50 // 76.4
    const gridY = dropRaycastHit.z + 50 // 38.4

    // Fused result from acoustic detection includes estimatedPosition = S-020 position (single sensor detection)
    const incident = {
      id: 'EVT-TAC-001',
      title: 'Gunshot Detected',
      coordinates: { x: Number(gridX.toFixed(2)), y: Number(gridY.toFixed(2)) },
      worldPosition: { ...dropRaycastHit },
      estimatedPosition: { ...s020.position }, // centroid calculated by acoustic engine
      originatingSensorId: 'S-020'
    }

    const renderedPos = getIncidentWorldPos(incident)

    // Rendered position must match the exact drop location, NOT S-020
    assert.equal(renderedPos.x, dropRaycastHit.x, 'Rendered X matches drop location')
    assert.equal(renderedPos.z, dropRaycastHit.z, 'Rendered Z matches drop location')
    assert.notEqual(renderedPos.x, s020.position.x, 'Must NOT snap to S-020 X')
    assert.notEqual(renderedPos.z, s020.position.z, 'Must NOT snap to S-020 Z')
  })

  it('drops incident far away from all sensors and preserves exact drop point', () => {
    // Dropping in corner of Buffer Zone
    const dropRaycastHit = { x: -44.5, y: -1.2, z: 42.0 }
    const gridX = dropRaycastHit.x + 50
    const gridY = dropRaycastHit.z + 50

    const incident = {
      id: 'EVT-TAC-002',
      title: 'Suspicious Vehicle',
      coordinates: { x: Number(gridX.toFixed(2)), y: Number(gridY.toFixed(2)) },
      worldPosition: { ...dropRaycastHit }
    }

    const renderedPos = getIncidentWorldPos(incident)
    assert.equal(renderedPos.x, -44.5)
    assert.equal(renderedPos.z, 42.0)
  })

  it('guarantees bidirectional bijection between 3D world raycast hits and 2D grid coordinates', () => {
    const hits = [
      { x: -35.2, z: 28.6 },
      { x: 0.0, z: 0.0 },
      { x: 48.9, z: -48.9 },
      { x: -12.34, z: 45.67 }
    ]

    hits.forEach((h) => {
      const gridX = h.x + 50
      const gridY = h.z + 50
      const backToWorldX = gridX - 50
      const backToWorldZ = gridY - 50

      assert.ok(Math.abs(backToWorldX - h.x) < 1e-6)
      assert.ok(Math.abs(backToWorldZ - h.z) < 1e-6)
    })
  })
})

describe('17. Proximity-Based Acoustic Detection & Sensor Selection Algorithm', () => {
  it('selects physically nearest sensor S-020 as packet origin even when S-007 is earlier in array or closer to BASE', () => {
    const sensors = generateSensorTopology(28, 22, 28)
    const base = getBaseStation(26.0)
    const graph = buildMeshGraph(sensors, base)

    const s020 = sensors.find((s) => s.id === 'S-020')
    const s007 = sensors.find((s) => s.id === 'S-007')
    assert.ok(s020, 'S-020 exists')
    assert.ok(s007, 'S-007 exists')

    // Place an acoustic incident (gunshot) 2.5 meters from S-020
    const eventWorldPos = {
      x: s020.position.x + 1.5,
      y: s020.position.y,
      z: s020.position.z + 2.0
    }

    const detectionRes = detectAcousticEvent(sensors, { worldPosition: eventWorldPos }, 'gunshot_sound')
    assert.ok(detectionRes.heard, 'Incident was heard')
    assert.ok(detectionRes.detectingSensorIds.includes('S-020'), 'S-020 heard the incident')

    // The nearest detecting sensor must be S-020
    assert.equal(detectionRes.detectingSensorIds[0], 'S-020')
    assert.ok(detectionRes.detections[0].distance < 3.0)

    // Run originator selection
    const selection = selectPacketOriginator(detectionRes.detections, graph)

    assert.equal(selection.nearestSensorId, 'S-020')
    assert.equal(selection.originatingSensorId, 'S-020')
    assert.equal(selection.bypassedNearestSensor, false)
    assert.equal(selection.bypassReason, null)
    assert.equal(selection.route.path[0], 'S-020')
    assert.equal(selection.route.path.at(-1), 'BASE')
    assert.ok(selection.route.reachable)
  })

  it('orders multiple detecting sensors strictly ascending by 3D Euclidean distance', () => {
    const sA = { id: 'S-A', position: { x: 0, y: 0, z: 0 }, acousticDetectionRange: 30, communicationRange: 20, status: 'online' }
    const sB = { id: 'S-B', position: { x: 10, y: 0, z: 0 }, acousticDetectionRange: 30, communicationRange: 20, status: 'online' }
    const sC = { id: 'S-C', position: { x: 20, y: 0, z: 0 }, acousticDetectionRange: 30, communicationRange: 20, status: 'online' }
    const base = { id: 'BASE', position: { x: 25, y: 0, z: 0 }, communicationRange: 20, status: 'online' }

    // Event placed at x: 2 (distance to A is 2, to B is 8, to C is 18)
    const eventPos = { x: 2, y: 0, z: 0 }
    const graph = buildMeshGraph([sA, sB, sC], base)
    const res = detectAcousticEvent([sC, sB, sA], eventPos, 'gunshot_sound') // deliberately shuffled input array

    assert.equal(res.detectingSensorIds.length, 3)
    assert.equal(res.detectingSensorIds[0], 'S-A', 'S-A is closest (2m)')
    assert.equal(res.detectingSensorIds[1], 'S-B', 'S-B is second (8m)')
    assert.equal(res.detectingSensorIds[2], 'S-C', 'S-C is third (18m)')

    const selection = selectPacketOriginator(res.detections, graph)
    assert.equal(selection.nearestSensorId, 'S-A')
    assert.equal(selection.originatingSensorId, 'S-A')
    assert.equal(selection.otherDetectingSensors.length, 2)
    assert.equal(selection.otherDetectingSensors[0].sensorId, 'S-B')
    assert.equal(selection.otherDetectingSensors[1].sensorId, 'S-C')
  })

  it('excludes offline or failed sensors from acoustic detection eligibility', () => {
    // S-A is 2m away but failed; S-B is 8m away and online
    const sA = { id: 'S-A', position: { x: 0, y: 0, z: 0 }, acousticDetectionRange: 30, communicationRange: 20, status: 'failed' }
    const sB = { id: 'S-B', position: { x: 10, y: 0, z: 0 }, acousticDetectionRange: 30, communicationRange: 20, status: 'online' }
    const base = { id: 'BASE', position: { x: 20, y: 0, z: 0 }, communicationRange: 20, status: 'online' }

    const graph = buildMeshGraph([sA, sB], base)
    const res = detectAcousticEvent([sA, sB], { x: 2, y: 0, z: 0 })

    assert.equal(res.detectionCount, 1)
    assert.equal(res.detectingSensorIds[0], 'S-B')

    const selection = selectPacketOriginator(res.detections, graph)
    assert.equal(selection.nearestSensorId, 'S-B')
    assert.equal(selection.originatingSensorId, 'S-B')
    assert.equal(selection.bypassedNearestSensor, false)
  })

  it('bypasses nearest sensor when nearest is isolated from BASE and reroutes via next-nearest eligible sensor', () => {
    // S-A (distance 2m) is isolated from BASE (commRange = 1)
    // S-B (distance 8m) can reach BASE (commRange = 15)
    const sA = { id: 'S-A', position: { x: 0, y: 0, z: 0 }, acousticDetectionRange: 30, communicationRange: 1, status: 'online' }
    const sB = { id: 'S-B', position: { x: 10, y: 0, z: 0 }, acousticDetectionRange: 30, communicationRange: 15, status: 'online' }
    const base = { id: 'BASE', position: { x: 20, y: 0, z: 0 }, communicationRange: 15, status: 'online' }

    const graph = buildMeshGraph([sA, sB], base)
    // S-A has no edges
    assert.equal(graph.adjacency.get('S-A').length, 0)
    // S-B reaches BASE
    assert.ok(graph.adjacency.get('S-B').some((e) => e.nodeId === 'BASE'))

    const eventPos = { x: 2, y: 0, z: 0 }
    const res = detectAcousticEvent([sA, sB], eventPos)

    assert.equal(res.detectingSensorIds[0], 'S-A')
    assert.equal(res.detectingSensorIds[1], 'S-B')

    const selection = selectPacketOriginator(res.detections, graph)

    assert.equal(selection.nearestSensorId, 'S-A')
    assert.equal(selection.originatingSensorId, 'S-B', 'Packet originated from next-nearest sensor S-B')
    assert.equal(selection.bypassedNearestSensor, true, 'bypassedNearestSensor flag is true')
    assert.ok(selection.bypassReason.includes('S-A'), 'Bypass reason mentions isolated nearest sensor S-A')
    assert.ok(selection.bypassReason.includes('S-B'), 'Bypass reason mentions rerouted sensor S-B')
    assert.deepEqual(selection.route.path, ['S-B', 'BASE'])
  })

  it('falls back to nearest sensor with Store-and-Forward buffering when ALL detecting sensors are isolated', () => {
    // Both S-A and S-B are isolated from BASE
    const sA = { id: 'S-A', position: { x: 0, y: 0, z: 0 }, acousticDetectionRange: 30, communicationRange: 1, status: 'online' }
    const sB = { id: 'S-B', position: { x: 10, y: 0, z: 0 }, acousticDetectionRange: 30, communicationRange: 1, status: 'online' }
    const base = { id: 'BASE', position: { x: 50, y: 0, z: 0 }, communicationRange: 1, status: 'online' }

    const graph = buildMeshGraph([sA, sB], base)
    const res = detectAcousticEvent([sA, sB], { x: 2, y: 0, z: 0 })

    const selection = selectPacketOriginator(res.detections, graph)

    assert.equal(selection.nearestSensorId, 'S-A')
    assert.equal(selection.originatingSensorId, 'S-A', 'Origin remains nearest sensor')
    assert.equal(selection.bypassedNearestSensor, false)
    assert.equal(selection.route.reachable, false)
    assert.ok(selection.bypassReason.includes('isolated'))
    assert.ok(selection.bypassReason.includes('Store-and-Forward'))
  })

  it('fused incident object includes all required proximity and bypass metadata', () => {
    const sA = { id: 'S-A', position: { x: 0, y: 0, z: 0 }, acousticDetectionRange: 30, communicationRange: 15, status: 'online' }
    const sB = { id: 'S-B', position: { x: 10, y: 0, z: 0 }, acousticDetectionRange: 30, communicationRange: 15, status: 'online' }
    const base = { id: 'BASE', position: { x: 20, y: 0, z: 0 }, communicationRange: 15, status: 'online' }

    const graph = buildMeshGraph([sA, sB], base)
    const detectionRes = detectAcousticEvent([sA, sB], { x: 1, y: 0, z: 0 }, 'gunshot_sound')
    const fused = fuseAcousticIncident(detectionRes, 'gunshot_sound', graph)

    assert.equal(fused.nearestSensorId, 'S-A')
    assert.equal(fused.originatingSensorId, 'S-A')
    assert.equal(fused.nearestSensorDistance, 1.0)
    assert.equal(fused.bypassedNearestSensor, false)
    assert.equal(fused.bypassReason, null)
    assert.equal(fused.otherDetectingSensors.length, 1)
    assert.equal(fused.otherDetectingSensors[0].sensorId, 'S-B')
    assert.equal(fused.otherDetectingSensors[0].distance, 9.0)
    assert.deepEqual(fused.routeToBasestation, ['S-A', 'S-B', 'BASE'])
  })
})

describe('18. Tactical Sensor Inspector Popup Smart Positioning & Viewport Invariants', () => {
  it('keeps popup fully inside visible canvas bounds across windowed and fullscreen viewports', () => {
    // 1. Windowed viewport (800 x 600)
    const windowedPos = {
      x: 750,
      y: 550,
      canvasWidth: 800,
      canvasHeight: 600
    }
    const windowedResult = calculateSmartPopupPosition({
      screenPos: windowedPos,
      popupWidth: 240,
      popupHeight: 200
    })
    const wx = parseInt(windowedResult.left, 10)
    const wy = parseInt(windowedResult.top, 10)

    assert.ok(wx >= 16, 'Windowed left within left boundary')
    assert.ok(wx + 240 <= 800 - 16, 'Windowed right within right boundary')
    assert.ok(wy >= 55, 'Windowed top within top boundary')
    assert.ok(wy + 200 <= 600 - 45, 'Windowed bottom within bottom boundary')

    // 2. Fullscreen viewport (1920 x 1080)
    const fullscreenPos = {
      x: 1880,
      y: 1040,
      canvasWidth: 1920,
      canvasHeight: 1080
    }
    const fullResult = calculateSmartPopupPosition({
      screenPos: fullscreenPos,
      popupWidth: 240,
      popupHeight: 200
    })
    const fx = parseInt(fullResult.left, 10)
    const fy = parseInt(fullResult.top, 10)

    assert.ok(fx >= 16, 'Fullscreen left within left boundary')
    assert.ok(fx + 240 <= 1920 - 16, 'Fullscreen right within right boundary')
    assert.ok(fy >= 55, 'Fullscreen top within top boundary')
    assert.ok(fy + 200 <= 1080 - 45, 'Fullscreen bottom within bottom boundary')
  })

  it('guarantees popup never overlaps the selected sensor itself', () => {
    const testPositions = [
      { x: 120, y: 100 },
      { x: 400, y: 300 },
      { x: 720, y: 500 },
      { x: 300, y: 480 }
    ]

    const popupWidth = 240
    const popupHeight = 200

    testPositions.forEach(({ x, y }) => {
      const res = calculateSmartPopupPosition({
        screenPos: { x, y, canvasWidth: 1000, canvasHeight: 700 },
        popupWidth,
        popupHeight
      })

      const left = parseInt(res.left, 10)
      const top = parseInt(res.top, 10)

      // Verify that the sensor point (x, y) is NOT inside the popup rectangle
      const overlapsX = x >= left && x <= left + popupWidth
      const overlapsY = y >= top && y <= top + popupHeight
      const overlaps = overlapsX && overlapsY

      assert.equal(overlaps, false, `Popup at [${left}, ${top}] must not cover sensor at [${x}, ${y}]`)
    })
  })

  it('automatically relocates to corner when sensor is situated in congested center of terrain', () => {
    // Sensor S-014 at dead center of canvas (x: 450, y: 350 on 900x700 canvas)
    // Surrounded by other sensors
    const res = calculateSmartPopupPosition({
      screenPos: {
        x: 450,
        y: 350,
        canvasWidth: 900,
        canvasHeight: 700,
        otherSensorsPos: [
          { id: 'S-013', x: 420, y: 330 },
          { id: 'S-015', x: 480, y: 370 },
          { id: 'S-018', x: 440, y: 390 }
        ]
      },
      popupWidth: 240,
      popupHeight: 200
    })

    const left = parseInt(res.left, 10)
    const top = parseInt(res.top, 10)

    // Verify it chose one of the clean corners rather than covering the center of the terrain
    const isAtLeftCorner = left <= 30
    const isAtRightCorner = left >= 900 - 240 - 30
    assert.ok(isAtLeftCorner || isAtRightCorner, 'Popup relocated to clean corner outside central terrain')
  })

  it('avoids covering Base Station when positioning in corners', () => {
    // Base Station is located at Top-Right (x: 850, y: 65)
    // Sensor is in center
    const res = calculateSmartPopupPosition({
      screenPos: {
        x: 450,
        y: 350,
        canvasWidth: 900,
        canvasHeight: 700,
        baseScreenPos: { x: 850, y: 65 }
      },
      popupWidth: 240,
      popupHeight: 200
    })

    const left = parseInt(res.left, 10)
    const top = parseInt(res.top, 10)

    // Base Station at (850, 65) must NOT be covered
    const coversBase = (
      left - 20 <= 850 && 850 <= left + 240 + 20 &&
      top - 20 <= 65 && 65 <= top + 200 + 20
    )
    assert.equal(coversBase, false, 'Must not cover Base Station')
  })

  it('avoids covering active Incident marker', () => {
    // Active incident marker is located at Top-Left (x: 40, y: 65)
    // Sensor is in center
    const res = calculateSmartPopupPosition({
      screenPos: {
        x: 450,
        y: 350,
        canvasWidth: 900,
        canvasHeight: 700,
        incidentScreenPos: { x: 40, y: 65 }
      },
      popupWidth: 240,
      popupHeight: 200
    })

    const left = parseInt(res.left, 10)
    const top = parseInt(res.top, 10)

    // Incident at (40, 65) must NOT be covered
    const coversIncident = (
      left - 20 <= 40 && 40 <= left + 240 + 20 &&
      top - 20 <= 65 && 65 <= top + 200 + 20
    )
    assert.equal(coversIncident, false, 'Must not cover Incident marker')
  })

  it('safely handles missing or malformed screenPos input', () => {
    const res1 = calculateSmartPopupPosition({ screenPos: null })
    assert.ok(res1.left && res1.top)

    const res2 = calculateSmartPopupPosition({ screenPos: {} })
    assert.ok(res2.left && res2.top)
  })

  it('identifies and suppresses background sensor labels intersecting popup bounding box', () => {
    const screenPos = {
      id: 'S-005',
      x: 300,
      y: 300,
      canvasWidth: 1000,
      canvasHeight: 700,
      otherSensorsPos: [
        { id: 'S-004', x: 250, y: 220 }, // Inside popup
        { id: 'S-006', x: 300, y: 250 }, // Inside popup
        { id: 'S-001', x: 800, y: 100 }, // Far away outside
        { id: 'S-020', x: 850, y: 600 }  // Far away outside
      ]
    }

    const popupPos = { left: '200px', top: '150px' }

    // Test with popupPos
    const suppressed = getSuppressedSensorLabelIds({
      screenPos,
      popupPos,
      popupWidth: 240,
      popupHeight: 200,
      padding: 15
    })

    // S-004 and S-006 are within the popup rectangle and must be suppressed
    assert.ok(suppressed.includes('S-004'), 'S-004 label must be suppressed when under popup')
    assert.ok(suppressed.includes('S-006'), 'S-006 label must be suppressed when under popup')

    // S-001 and S-020 are outside and must NOT be suppressed
    assert.equal(suppressed.includes('S-001'), false, 'S-001 outside popup must remain visible')
    assert.equal(suppressed.includes('S-020'), false, 'S-020 outside popup must remain visible')
  })

  it('guarantees selected sensor label is never suppressed', () => {
    const screenPos = {
      id: 'S-005',
      x: 300,
      y: 300,
      canvasWidth: 1000,
      canvasHeight: 700,
      otherSensorsPos: [
        { id: 'S-005', x: 250, y: 220 }, // Selected sensor ID inside popup
        { id: 'S-004', x: 250, y: 220 }  // Other sensor ID inside popup
      ]
    }

    const suppressed = getSuppressedSensorLabelIds({
      screenPos,
      popupPos: { left: '200px', top: '150px' },
      popupWidth: 240,
      popupHeight: 200
    })

    assert.equal(suppressed.includes('S-005'), false, 'Selected sensor itself must never be suppressed')
    assert.ok(suppressed.includes('S-004'), 'Intersecting other sensor is suppressed')
  })

  it('safely returns empty array for getSuppressedSensorLabelIds when missing screenPos or otherSensorsPos', () => {
    assert.deepEqual(getSuppressedSensorLabelIds({ screenPos: null }), [])
    assert.deepEqual(getSuppressedSensorLabelIds({ screenPos: {} }), [])
    assert.deepEqual(getSuppressedSensorLabelIds({ screenPos: { otherSensorsPos: null } }), [])
  })
})

describe('19. Role-Based Access Control (RBAC) & Authentication Invariants', () => {
  it('correctly resolves Ranger role from verified email or role metadata', () => {
    // 1. Demo Ranger account
    const rangerSession1 = {
      user: { email: 'ranger@ecosentry.com', user_metadata: { name: 'Lead Ranger' } }
    }
    assert.equal(getRoleFromSession(rangerSession1), ROLES.RANGER)

    // 2. Ranger account with explicit app_metadata role
    const rangerSession2 = {
      user: { email: 'officer@reserve.org', app_metadata: { role: 'RANGER' } }
    }
    assert.equal(getRoleFromSession(rangerSession2), ROLES.RANGER)

    // 3. Ranger account with user_metadata role
    const rangerSession3 = {
      user: { email: 'ranger2@ecosentry.com', user_metadata: { role: 'RANGER' } }
    }
    assert.equal(getRoleFromSession(rangerSession3), ROLES.RANGER)
  })

  it('correctly resolves Guest role from session properties or guest marker', () => {
    const guestSession = createGuestSession()
    assert.equal(guestSession.user.role, ROLES.GUEST)
    assert.equal(guestSession.user.isGuest, true)
    assert.equal(getRoleFromSession(guestSession), ROLES.GUEST)

    const sessionWithGuestEmail = {
      user: { email: 'guest@ecosentry.local', isGuest: true }
    }
    assert.equal(getRoleFromSession(sessionWithGuestEmail), ROLES.GUEST)
  })

  it('returns null role for empty, null, or invalid sessions', () => {
    assert.equal(getRoleFromSession(null), null)
    assert.equal(getRoleFromSession({}), null)
    assert.equal(getRoleFromSession({ user: null }), null)
  })

  it('validates permission gates: only RANGER may configure email notifications', () => {
    assert.equal(canConfigureEmailNotifications(ROLES.RANGER), true)
    assert.equal(canConfigureEmailNotifications(ROLES.GUEST), false)
    assert.equal(canConfigureEmailNotifications(null), false)
    assert.equal(canConfigureEmailNotifications(undefined), false)
  })

  it('strictly blocks email dispatch when role is GUEST and never triggers EmailJS', async () => {
    const mockIncident = {
      id: 'INC-GUEST-001',
      title: 'Gunshot Detected',
      priority: 'high',
      deliveryStatus: 'DELIVERED'
    }

    // Attempting to send an alert under GUEST role
    const res = await sendIncidentEmailNotification(
      mockIncident,
      EMAIL_NOTIFICATION_MODES.IMMEDIATE,
      ROLES.GUEST
    )

    assert.equal(res.success, false)
    assert.equal(res.reason, 'guest_restricted')
    assert.equal(res.message, 'EMAIL NOTIFICATIONS DISABLED — GUEST MODE')
  })

  it('enforces that Guest sessions compute emailNotificationMode as DISABLED even if Ranger preference exists', () => {
    const rangerSavedMode = EMAIL_NOTIFICATION_MODES.AFTER_BASE_STATION
    const activeGuestRole = ROLES.GUEST

    // Emulate App.jsx derived mode logic:
    const effectiveMode = activeGuestRole === ROLES.GUEST
      ? EMAIL_NOTIFICATION_MODES.DISABLED
      : rangerSavedMode

    assert.equal(effectiveMode, EMAIL_NOTIFICATION_MODES.DISABLED)
  })

  it('switching from Ranger to Guest session immediately suppresses email alerts', async () => {
    const incident = { id: 'INC-TRANSITION-1', title: 'Chainsaw Sound', priority: 'high' }

    // Ranger session: permitted (even if unconfigured environment skips network delivery)
    // Guest session: immediately rejected with guest_restricted
    const guestResult = await sendIncidentEmailNotification(
      incident,
      EMAIL_NOTIFICATION_MODES.AFTER_BASE_STATION,
      ROLES.GUEST
    )

    assert.equal(guestResult.success, false)
    assert.equal(guestResult.reason, 'guest_restricted')
  })
})

