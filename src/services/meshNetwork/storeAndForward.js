/**
 * EcoSentry Mesh Network - Store-and-Forward Messaging Engine
 * 
 * Implements a realistic simulated Store-and-Forward messaging architecture for
 * the distributed wireless sensor mesh network.
 * 
 * Core Features:
 * - Distributed per-sensor local message queues with capacity limits and priority ordering.
 * - Dynamic Dijkstra-based hop-by-hop forwarding to BASE.
 * - Fault tolerance: when links or sensors fail, in-transit messages are buffered in the
 *   current sensor's local queue without being discarded.
 * - Recovery forwarder: when connectivity is restored, queues are evaluated and messages
 *   are forwarded through the newly available shortest routes.
 * - Single-delivery and single-email guarantees.
 */

import { findShortestPath } from './dijkstra.js'

export const SENSOR_QUEUE_CAPACITY = 10
export const MAX_RETRY_COUNT = 15

export const MESSAGE_STATUS = {
  CREATED: 'created',
  QUEUED: 'queued',
  IN_TRANSIT: 'in_transit',
  REROUTING: 'rerouting',
  DELIVERED: 'delivered',
  FAILED: 'failed'
}

export const PRIORITY_RANKS = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
}

/**
 * Normalizes priority strings.
 */
export function getPriorityRank(priority = 'high') {
  const p = String(priority).toLowerCase()
  return PRIORITY_RANKS[p] !== undefined ? PRIORITY_RANKS[p] : 1
}

/**
 * Creates a Store-and-Forward mesh message / packet.
 * Unifies the packet and message data model for both transmission simulation and telemetry.
 */
export function createMeshMessage({
  messageId,
  incidentId,
  originSensorId,
  currentSensorId,
  destination = 'BASE',
  messageType = 'incident_alert',
  payload = {},
  priority = 'high',
  route = [],
  routeCost = 0
}) {
  const id = messageId || `MSG-${Date.now().toString().slice(-6)}`
  const incId = incidentId || `INC-${Date.now().toString().slice(-4)}`
  const sourceId = originSensorId || 'S-001'
  const currId = currentSensorId || sourceId
  const hasRoute = Array.isArray(route) && route.length > 1
  const initialStatus = hasRoute ? MESSAGE_STATUS.IN_TRANSIT : MESSAGE_STATUS.QUEUED

  return {
    // Primary Store-and-Forward Message Fields
    messageId: id,
    id: id, // backward compatibility alias for 3D visualizer
    incidentId: incId,
    originSensorId: sourceId,
    source: sourceId, // backward compatibility alias
    currentSensorId: currId,
    currentNode: currId, // backward compatibility alias
    destination: destination || 'BASE',
    messageType: messageType || payload?.type || 'incident_alert',
    payload: { ...payload },
    priority: String(priority || payload?.priority || 'high').toLowerCase(),
    status: initialStatus,
    hopCount: 0,
    currentHopIndex: 0, // backward compatibility alias
    retryCount: 0,
    maxRetries: MAX_RETRY_COUNT,
    route: hasRoute ? [...route] : [],
    path: hasRoute ? [...route] : [], // backward compatibility alias
    nextNode: hasRoute ? route[1] : null,
    hopProgress: 0.0,
    totalHops: hasRoute ? route.length - 1 : 0,
    routeCost: Number((routeCost || 0).toFixed(2)),
    previousPath: null,
    rerouteReason: null,
    failureReason: null,
    createdAt: new Date().toISOString(),
    lastAttemptAt: new Date().toISOString(),
    deliveredAt: null
  }
}

/**
 * Sorts a sensor's message queue by priority (critical first), then by creation timestamp.
 */
export function sortSensorQueue(queue = []) {
  return [...queue].sort((a, b) => {
    const rankA = getPriorityRank(a.priority)
    const rankB = getPriorityRank(b.priority)
    if (rankA !== rankB) return rankA - rankB
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}

/**
 * Enqueues a message into a sensor's local queue with capacity and priority-preemption handling.
 * 
 * @param {Object} sensor
 * @param {Object} message
 * @param {number} [capacity=SENSOR_QUEUE_CAPACITY]
 * @returns {{
 *   success: boolean,
 *   sensor: Object,
 *   enqueuedMessage: Object,
 *   droppedMessage: Object|null,
 *   error: string|null
 * }}
 */
export function enqueueMessageAtSensor(sensor, message, capacity = SENSOR_QUEUE_CAPACITY) {
  if (!sensor) {
    return {
      success: false,
      sensor: null,
      enqueuedMessage: message,
      droppedMessage: message,
      error: 'Invalid sensor object'
    }
  }

  const currentQueue = Array.isArray(sensor.messageQueue) ? [...sensor.messageQueue] : []

  // Update existing message if already present in queue
  const existingIdx = currentQueue.findIndex(
    (m) => m.messageId === message.messageId || m.id === message.id
  )

  const updatedMsg = {
    ...message,
    status: MESSAGE_STATUS.QUEUED,
    currentSensorId: sensor.id,
    currentNode: sensor.id,
    lastAttemptAt: new Date().toISOString()
  }

  if (existingIdx >= 0) {
    currentQueue[existingIdx] = updatedMsg
    const sorted = sortSensorQueue(currentQueue)
    return {
      success: true,
      sensor: { ...sensor, messageQueue: sorted },
      enqueuedMessage: updatedMsg,
      droppedMessage: null,
      error: null
    }
  }

  // If under capacity, simply insert
  if (currentQueue.length < capacity) {
    currentQueue.push(updatedMsg)
    const sorted = sortSensorQueue(currentQueue)
    return {
      success: true,
      sensor: { ...sensor, messageQueue: sorted },
      enqueuedMessage: updatedMsg,
      droppedMessage: null,
      error: null
    }
  }

  // Queue is at capacity: check priority preemption
  const sortedExisting = sortSensorQueue(currentQueue)
  const lowestPriorityItem = sortedExisting[sortedExisting.length - 1]
  const incomingRank = getPriorityRank(updatedMsg.priority)
  const lowestRank = getPriorityRank(lowestPriorityItem.priority)

  if (incomingRank < lowestRank) {
    // Incoming message has strictly higher priority than the lowest item in queue -> Evict lowest
    const evicted = {
      ...lowestPriorityItem,
      status: MESSAGE_STATUS.FAILED,
      failureReason: `QUEUE_OVERFLOW: Evicted by higher-priority message ${updatedMsg.messageId} at sensor ${sensor.id}`
    }
    sortedExisting.pop() // remove evicted
    sortedExisting.push(updatedMsg)
    const newSorted = sortSensorQueue(sortedExisting)

    return {
      success: true,
      sensor: { ...sensor, messageQueue: newSorted },
      enqueuedMessage: updatedMsg,
      droppedMessage: evicted,
      error: `Queue capacity (${capacity}) reached at ${sensor.id}: evicted message ${evicted.messageId}`
    }
  }

  // Incoming message cannot fit
  const rejected = {
    ...updatedMsg,
    status: MESSAGE_STATUS.FAILED,
    failureReason: `QUEUE_OVERFLOW: Sensor ${sensor.id} queue capacity (${capacity}) full`
  }

  return {
    success: false,
    sensor,
    enqueuedMessage: null,
    droppedMessage: rejected,
    error: `Queue capacity (${capacity}) reached at ${sensor.id}: message ${rejected.messageId} rejected`
  }
}

/**
 * Dequeues a message by ID from a sensor's local queue.
 */
export function dequeueMessageFromSensor(sensor, messageId) {
  if (!sensor || !Array.isArray(sensor.messageQueue)) {
    return { sensor, dequeuedMessage: null }
  }

  const idx = sensor.messageQueue.findIndex(
    (m) => m.messageId === messageId || m.id === messageId
  )

  if (idx === -1) {
    return { sensor, dequeuedMessage: null }
  }

  const dequeuedMessage = sensor.messageQueue[idx]
  const nextQueue = sensor.messageQueue.filter((_, i) => i !== idx)

  return {
    sensor: { ...sensor, messageQueue: nextQueue },
    dequeuedMessage
  }
}

/**
 * Handles sensor failure:
 * - Detects packets whose remaining route or current sensor is affected.
 * - Attempts alternative Dijkstra routing.
 * - If no alternative route exists, buffers the message directly into the holding sensor's local queue.
 */
export function handleSensorFailureStoreAndForward(
  sensors = [],
  packets = [],
  graph = null,
  failedSensorId = ''
) {
  let reroutedCount = 0
  let queuedCount = 0
  const notifications = []
  let updatedSensors = [...sensors]

  const updatedPackets = packets.map((p) => {
    // Normalize status check
    const statusUpper = String(p.status || '').toUpperCase()
    if (statusUpper !== 'IN_TRANSIT' && statusUpper !== 'REROUTING' && statusUpper !== 'QUEUED') {
      return p
    }

    const currentHopIdx = p.currentHopIndex ?? p.hopCount ?? 0
    const remainingPath = (p.route || p.path || []).slice(currentHopIdx)
    const isAffected =
      remainingPath.includes(failedSensorId) ||
      p.currentSensorId === failedSensorId ||
      p.currentNode === failedSensorId

    if (!isAffected && statusUpper !== 'QUEUED') {
      return p
    }

    // Determine current holding sensor
    let holdingSensorId = p.currentSensorId || p.currentNode || p.originSensorId || p.source
    if (holdingSensorId === failedSensorId) {
      // If the sensor holding the packet failed, buffer at the origin or previous node if available
      holdingSensorId = p.originSensorId || p.source || 'S-001'
    }

    // Attempt Dijkstra recalculation from holding sensor to BASE
    const newRoute = graph?.adjacency
      ? findShortestPath(graph.adjacency, holdingSensorId, 'BASE')
      : { reachable: false, path: [] }

    if (newRoute.reachable && newRoute.path.length > 1) {
      // Alternative path found through operational mesh!
      reroutedCount++
      notifications.push(
        `${failedSensorId} FAILED — ALTERNATIVE ROUTE FOUND FOR ${p.messageId || p.id}`
      )

      return {
        ...p,
        previousPath: p.route || p.path,
        route: newRoute.path,
        path: newRoute.path,
        currentHopIndex: 0,
        hopCount: 0,
        currentSensorId: newRoute.path[0],
        currentNode: newRoute.path[0],
        nextNode: newRoute.path[1],
        hopProgress: 0.0,
        status: MESSAGE_STATUS.REROUTING,
        totalHops: newRoute.hops,
        routeCost: newRoute.totalCost,
        rerouteReason: `Sensor ${failedSensorId} bypass`,
        retryCount: (p.retryCount || 0) + 1,
        lastAttemptAt: new Date().toISOString()
      }
    } else {
      // No valid route to base exists -> buffer into holding sensor's local queue
      queuedCount++
      notifications.push(
        `NO ROUTE TO BASE — MESSAGE ${p.messageId || p.id} BUFFERED AT SENSOR ${holdingSensorId}`
      )

      const queuedMsg = {
        ...p,
        currentSensorId: holdingSensorId,
        currentNode: holdingSensorId,
        status: MESSAGE_STATUS.QUEUED,
        route: [],
        path: [],
        nextNode: null,
        hopProgress: 0.0,
        rerouteReason: `Isolated by node ${failedSensorId} failure (buffered in local queue)`,
        lastAttemptAt: new Date().toISOString()
      }

      // Enqueue into sensor
      const targetSensorIdx = updatedSensors.findIndex((s) => s.id === holdingSensorId)
      if (targetSensorIdx >= 0) {
        const enqRes = enqueueMessageAtSensor(updatedSensors[targetSensorIdx], queuedMsg)
        if (enqRes.success) {
          updatedSensors[targetSensorIdx] = enqRes.sensor
        }
      }

      return queuedMsg
    }
  })

  return {
    updatedSensors,
    updatedPackets,
    notifications,
    reroutedCount,
    queuedCount
  }
}

/**
 * Evaluates all local sensor queues and queued packets when a sensor is restored or topology recovers.
 * If a valid Dijkstra path to BASE is now available, dequeues the message and launches it hop-by-hop.
 */
export function resumeStoreAndForwardQueues(
  sensors = [],
  packets = [],
  graph = null
) {
  let resumedCount = 0
  const notifications = []
  let updatedSensors = [...sensors]
  let activePacketsMap = new Map((packets || []).map((p) => [p.messageId || p.id, { ...p }]))

  // 1. Process local messageQueue on every sensor
  updatedSensors = updatedSensors.map((sensor) => {
    if (!Array.isArray(sensor.messageQueue) || sensor.messageQueue.length === 0) {
      return sensor
    }

    if (sensor.status !== 'online') {
      return sensor
    }

    const routeResult = graph?.adjacency
      ? findShortestPath(graph.adjacency, sensor.id, 'BASE')
      : { reachable: false, path: [] }

    if (!routeResult.reachable || routeResult.path.length <= 1) {
      return sensor
    }

    // Route to base exists! Forward queued messages from this sensor
    const remainingQueue = []

    for (const msg of sensor.messageQueue) {
      resumedCount++
      notifications.push(
        `ROUTE RESTORED — FORWARDING MESSAGE ${msg.messageId || msg.id} FROM SENSOR ${sensor.id}`
      )

      const inTransitMsg = {
        ...msg,
        status: MESSAGE_STATUS.IN_TRANSIT,
        currentSensorId: routeResult.path[0],
        currentNode: routeResult.path[0],
        nextNode: routeResult.path[1],
        route: [...routeResult.path],
        path: [...routeResult.path],
        currentHopIndex: 0,
        hopCount: 0,
        hopProgress: 0.0,
        totalHops: routeResult.hops,
        routeCost: routeResult.totalCost,
        retryCount: (msg.retryCount || 0) + 1,
        rerouteReason: 'Resumed after network topology recovery',
        lastAttemptAt: new Date().toISOString()
      }

      activePacketsMap.set(inTransitMsg.messageId || inTransitMsg.id, inTransitMsg)
    }

    return {
      ...sensor,
      messageQueue: remainingQueue
    }
  })

  // 2. Also check any standalone packets still marked QUEUED
  const updatedPackets = Array.from(activePacketsMap.values()).map((p) => {
    const statusUpper = String(p.status || '').toUpperCase()
    if (statusUpper !== 'QUEUED') return p

    const currentFrom = p.currentSensorId || p.currentNode || p.originSensorId || p.source
    const newRoute = graph?.adjacency
      ? findShortestPath(graph.adjacency, currentFrom, 'BASE')
      : { reachable: false, path: [] }

    if (newRoute.reachable && newRoute.path.length > 1) {
      resumedCount++
      notifications.push(
        `ROUTE RESTORED — FORWARDING MESSAGE ${p.messageId || p.id} FROM SENSOR ${currentFrom}`
      )

      return {
        ...p,
        route: newRoute.path,
        path: newRoute.path,
        currentHopIndex: 0,
        hopCount: 0,
        currentSensorId: newRoute.path[0],
        currentNode: newRoute.path[0],
        nextNode: newRoute.path[1],
        hopProgress: 0.0,
        status: MESSAGE_STATUS.IN_TRANSIT,
        totalHops: newRoute.hops,
        routeCost: newRoute.totalCost,
        rerouteReason: 'Resumed after network topology recovery',
        retryCount: (p.retryCount || 0) + 1,
        lastAttemptAt: new Date().toISOString()
      }
    }

    return p
  })

  return {
    updatedSensors,
    updatedPackets,
    resumedCount,
    notifications
  }
}

/**
 * Computes telemetry metrics for Store-and-Forward operation.
 */
export function getStoreAndForwardMetrics(sensors = [], packets = [], graph = null) {
  let totalPending = 0
  let sensorsWithQueuedMessages = 0
  let waitingForConnectivity = 0
  const allQueuedMessages = []

  sensors.forEach((s) => {
    const queue = s.messageQueue || []
    if (queue.length > 0) {
      sensorsWithQueuedMessages++
      const isReachable = graph?.reachableFromBase?.has(s.id) || false
      queue.forEach((msg) => {
        totalPending++
        if (!isReachable) waitingForConnectivity++
        allQueuedMessages.push({
          ...msg,
          sensorId: s.id,
          sensorName: s.name,
          sensorStatus: s.status
        })
      })
    }
  })

  // Also include any packets in QUEUED state that may not be in a sensor object
  packets.forEach((p) => {
    const statusUpper = String(p.status || '').toUpperCase()
    if (statusUpper === 'QUEUED') {
      const alreadyCounted = allQueuedMessages.some((m) => (m.messageId || m.id) === (p.messageId || p.id))
      if (!alreadyCounted) {
        totalPending++
        const holdingSensorId = p.currentSensorId || p.currentNode
        const isReachable = graph?.reachableFromBase?.has(holdingSensorId) || false
        if (!isReachable) waitingForConnectivity++
        allQueuedMessages.push({
          ...p,
          sensorId: holdingSensorId,
          sensorName: `Sensor ${holdingSensorId}`,
          sensorStatus: 'offline'
        })
      }
    }
  })

  const inTransitCount = packets.filter((p) => {
    const s = String(p.status || '').toUpperCase()
    return s === 'IN_TRANSIT' || s === 'REROUTING'
  }).length

  const deliveredCount = packets.filter((p) => {
    const s = String(p.status || '').toUpperCase()
    return s === 'DELIVERED'
  }).length

  const failedCount = packets.filter((p) => {
    const s = String(p.status || '').toUpperCase()
    return s === 'FAILED'
  }).length

  return {
    totalPending,
    inTransitCount,
    deliveredCount,
    sensorsWithQueuedMessages,
    waitingForConnectivity,
    failedCount,
    allQueuedMessages: sortSensorQueue(allQueuedMessages)
  }
}
