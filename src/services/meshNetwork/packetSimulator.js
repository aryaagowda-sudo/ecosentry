/**
 * EcoSentry Mesh Network - Packet Transmission & Automatic Rerouting Simulator
 * 
 * Simulates discrete packet propagation along Dijkstra routes through intermediate relays to BASE.
 * Integrates Store-and-Forward local queuing, automatic failover, and dynamic rerouting.
 */

import { findShortestPath } from './dijkstra.js'
import {
  createMeshMessage,
  handleSensorFailureStoreAndForward,
  resumeStoreAndForwardQueues,
  MESSAGE_STATUS
} from './storeAndForward.js'

/**
 * Creates a new simulated telemetry packet / store-and-forward message for a fused incident.
 * 
 * @param {string} packetId 
 * @param {string} incidentId 
 * @param {string} sourceId Originating sensor ID
 * @param {Array<string>} initialPath Calculated Dijkstra path from source to BASE
 * @param {number} routeCost Total Euclidean path distance
 * @param {Object} [payload={}] Incident payload metadata
 * @returns {Object} Initialized packet object
 */
export function createMeshPacket(packetId, incidentId, sourceId, initialPath, routeCost, payload = {}) {
  const hasRoute = Array.isArray(initialPath) && initialPath.length > 1

  return createMeshMessage({
    messageId: packetId,
    incidentId: incidentId,
    originSensorId: sourceId,
    currentSensorId: sourceId,
    destination: 'BASE',
    messageType: payload?.type || 'incident_alert',
    payload: { ...payload },
    priority: payload?.priority || 'high',
    route: hasRoute ? initialPath : [],
    routeCost: routeCost || 0
  })
}

/**
 * Advances a packet's progress along its route by delta * speed.
 * 
 * @param {Object} packet The packet to update (mutates or returns updated)
 * @param {number} deltaSeconds Elapsed time in seconds
 * @param {number} speedMultiplier e.g. 1.0, 2.0, 4.0
 * @param {Function} onPacketDelivered Callback triggered when packet reaches BASE
 * @returns {{ delivered: boolean, hopChanged: boolean, packet: Object }}
 */
export function stepMeshPacket(packet, deltaSeconds, speedMultiplier = 1.0, onPacketDelivered = null) {
  if (!packet) {
    return { delivered: false, hopChanged: false, packet }
  }

  const status = String(packet.status || '').toLowerCase()
  if (status !== 'in_transit' && status !== 'rerouting') {
    return { delivered: false, hopChanged: false, packet }
  }

  const baseHopDuration = 1.6 // Seconds to traverse one communication hop
  const stepIncrement = (deltaSeconds * speedMultiplier) / baseHopDuration

  packet.hopProgress = (packet.hopProgress || 0.0) + stepIncrement

  if (packet.hopProgress >= 1.0) {
    // Current hop completed
    packet.hopProgress = 0.0
    packet.currentHopIndex = (packet.currentHopIndex || 0) + 1
    packet.hopCount = packet.currentHopIndex

    // Set new current node to the node just reached
    packet.currentNode = packet.nextNode
    packet.currentSensorId = packet.nextNode

    if (packet.currentNode === 'BASE') {
      // Reached destination!
      packet.status = 'delivered'
      packet.nextNode = null
      packet.deliveredAt = new Date().toISOString()
      onPacketDelivered?.(packet)
      return { delivered: true, hopChanged: true, packet }
    }

    // Advance to next hop
    const currentPath = packet.route || packet.path || []
    const nextHopIdx = packet.currentHopIndex + 1
    if (nextHopIdx < currentPath.length) {
      packet.nextNode = currentPath[nextHopIdx]
      return { delivered: false, hopChanged: true, packet }
    } else {
      // If path ended but not at BASE (unexpected disconnect)
      packet.status = 'undeliverable'
      return { delivered: false, hopChanged: true, packet }
    }
  }

  return { delivered: false, hopChanged: false, packet }
}

/**
 * Evaluates active packets against graph changes (e.g. sensor failure).
 * Automatically recalculates routes or buffers packets in local sensor queues.
 * 
 * @param {Array<Object>} packets List of active packets
 * @param {Object} graph Adjacency map from buildMeshGraph()
 * @param {string} failedNodeId ID of the node that just failed
 * @param {Array<Object>} [sensors=[]] List of sensors for local queue buffering
 * @returns {{
 *   updatedPackets: Array<Object>,
 *   updatedSensors?: Array<Object>,
 *   reroutedCount: number,
 *   queuedCount: number,
 *   notifications: Array<string>
 * }}
 */
export function handleSensorFailureOnPackets(packets, graph, failedNodeId, sensors = []) {
  return handleSensorFailureStoreAndForward(sensors, packets, graph, failedNodeId)
}

/**
 * Re-evaluates queued packets and sensor queues when a sensor is restored or network recovers.
 * 
 * @param {Array<Object>} packets
 * @param {Object} graph
 * @param {Array<Object>} [sensors=[]]
 * @returns {{
 *   updatedPackets: Array<Object>,
 *   updatedSensors?: Array<Object>,
 *   resumedCount: number,
 *   notifications: Array<string>
 * }}
 */
export function resumeQueuedPackets(packets, graph, sensors = []) {
  return resumeStoreAndForwardQueues(sensors, packets, graph)
}

