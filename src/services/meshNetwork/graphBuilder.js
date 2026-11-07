/**
 * EcoSentry Mesh Network - Graph Construction & Topology Telemetry
 * 
 * Constructs the mesh graph adjacency list and edges from operational nodes.
 * Enforces bidirectional communication link constraint:
 *   distance(A, B) <= min(A.communicationRange, B.communicationRange)
 * Recomputes network connectivity, components, and reachability.
 */

import { calculate3DDistance } from './distanceMath.js'
import { findShortestPath, findAlternativeRoute, hasTwoVertexDisjointPaths } from './dijkstra.js'
import { calculateAcousticCoverage } from './acousticCoverage.js'

/**
 * Builds the graph adjacency list and edge collection from nodes and base station.
 * 
 * @param {Array<Object>} sensors List of acoustic sensors
 * @param {Object} baseStation Base station node
 * @param {Set<string>} [disabledLinkKeys=new Set()] Set of manually disabled link keys ("nodeA-nodeB")
 * @returns {Object} Graph data structure: { nodes, edges, adjacency, stats }
 */
export function buildMeshGraph(sensors, baseStation, disabledLinkKeys = new Set()) {
  const allNodes = [...sensors]
  if (baseStation) {
    allNodes.push(baseStation)
  }

  const nodesMap = new Map()
  allNodes.forEach((node) => nodesMap.set(node.id, node))

  const adjacency = new Map()
  allNodes.forEach((node) => adjacency.set(node.id, []))

  const edges = []
  const edgeKeySet = new Set()

  // Evaluate all unique node pairs (O(V^2), for V ~ 30 this is < 500 checks, instantaneous)
  for (let i = 0; i < allNodes.length; i++) {
    const nodeA = allNodes[i]
    for (let j = i + 1; j < allNodes.length; j++) {
      const nodeB = allNodes[j]

      // 1. Check distance against range rule: distance <= min(rangeA, rangeB)
      const dist = calculate3DDistance(nodeA.position, nodeB.position)
      const maxAllowedDist = Math.min(
        nodeA.communicationRange || 0,
        nodeB.communicationRange || 0
      )

      if (dist <= maxAllowedDist) {
        const linkKey1 = `${nodeA.id}-${nodeB.id}`
        const linkKey2 = `${nodeB.id}-${nodeA.id}`
        const isManuallyDisabled = disabledLinkKeys.has(linkKey1) || disabledLinkKeys.has(linkKey2)

        const isBothOnline = nodeA.status === 'online' && nodeB.status === 'online'
        const linkStatus = isManuallyDisabled || !isBothOnline ? 'failed' : 'active'

        const edge = {
          id: linkKey1,
          source: nodeA.id,
          target: nodeB.id,
          distance: Number(dist.toFixed(2)),
          cost: Number(dist.toFixed(2)), // Link distance is the primary routing metric
          status: linkStatus,
          isOperational: linkStatus === 'active',
          sourcePos: nodeA.position,
          targetPos: nodeB.position
        }

        edges.push(edge)
        edgeKeySet.add(linkKey1)

        // Only add to active routing adjacency if operational
        if (linkStatus === 'active') {
          adjacency.get(nodeA.id).push({
            nodeId: nodeB.id,
            distance: edge.distance,
            cost: edge.cost
          })
          adjacency.get(nodeB.id).push({
            nodeId: nodeA.id,
            distance: edge.distance,
            cost: edge.cost
          })
        }
      }
    }
  }

  // Update neighbors array on each sensor object
  sensors.forEach((s) => {
    const activeNeighbors = adjacency.get(s.id) || []
    s.neighbors = activeNeighbors.map((n) => n.nodeId)
  })

  // Compute Network Graph Telemetry Statistics
  const operationalSensors = sensors.filter((s) => s.status === 'online')
  const failedSensors = sensors.filter((s) => s.status === 'failed')
  const offlineSensors = sensors.filter((s) => s.status === 'offline')
  const activeEdges = edges.filter((e) => e.status === 'active')

  // Find all nodes reachable from the Base Station using BFS
  const reachableFromBase = new Set()
  if (baseStation && baseStation.status === 'online') {
    const queue = [baseStation.id]
    reachableFromBase.add(baseStation.id)

    while (queue.length > 0) {
      const curr = queue.shift()
      const neighbors = adjacency.get(curr) || []
      for (const nbr of neighbors) {
        if (!reachableFromBase.has(nbr.nodeId)) {
          reachableFromBase.add(nbr.nodeId)
          queue.push(nbr.nodeId)
        }
      }
    }
  }

  // Count isolated sensors (operational but zero active neighbors)
  const isolatedSensors = operationalSensors.filter((s) => {
    const nbrs = adjacency.get(s.id) || []
    return nbrs.length === 0
  })

  // Connected components analysis among operational nodes
  const visited = new Set()
  let componentCount = 0

  operationalSensors.forEach((s) => {
    if (!visited.has(s.id)) {
      componentCount++
      const q = [s.id]
      visited.add(s.id)
      while (q.length > 0) {
        const u = q.shift()
        const nbrs = adjacency.get(u) || []
        nbrs.forEach((nbr) => {
          if (!visited.has(nbr.nodeId)) {
            visited.add(nbr.nodeId)
            q.push(nbr.nodeId)
          }
        })
      }
    }
  })

  // Reachable operational sensors count (excluding BASE itself)
  const reachableSensorCount = operationalSensors.filter((s) => reachableFromBase.has(s.id)).length
  const connectivityPct = operationalSensors.length > 0
    ? Math.round((reachableSensorCount / operationalSensors.length) * 100)
    : 0

  const avgDegree = operationalSensors.length > 0
    ? Number(
        (
          operationalSensors.reduce((acc, s) => acc + (adjacency.get(s.id)?.length || 0), 0) /
          operationalSensors.length
        ).toFixed(2)
      )
    : 0

  // Calculate sensors with multiple routes to the Base Station (Multipath Redundancy)
  let redundantSensorsCount = 0
  const redundantSensorIds = []

  if (baseStation && baseStation.status === 'online') {
    operationalSensors.forEach((s) => {
      const sp = findShortestPath(adjacency, s.id, baseStation.id)
      if (sp.reachable) {
        if (sp.path.length > 2) {
          // Relayed path: check if bypassing the first hop still reaches BASE
          const nextHop = sp.path[1]
          const alt = findAlternativeRoute(adjacency, s.id, nextHop, baseStation.id)
          if (alt.hasAlternative) {
            redundantSensorsCount++
            redundantSensorIds.push(s.id)
          }
        } else if (sp.path.length === 2) {
          // Direct link to BASE: check if an alternative route exists through another sensor
          const alt = findAlternativeRoute(adjacency, s.id, baseStation.id, baseStation.id)
          if (alt.hasAlternative) {
            redundantSensorsCount++
            redundantSensorIds.push(s.id)
          }
        }
      }
    })
  }

  const redundancyPercentage = operationalSensors.length > 0
    ? Math.round((redundantSensorsCount / operationalSensors.length) * 100)
    : 0

  // Explainable Network Quality Status:
  // - OPTIMAL: All online sensors can reach the base station AND redundancy is acceptable (>= 70%)
  // - CONNECTED: All online sensors can reach the base station, but redundancy is limited (< 70%)
  // - DEGRADED: Some sensors cannot reach the base station (0 < reachability < 100%)
  // - DISCONNECTED: Base station is unreachable from the sensor network
  let networkStatus = 'OPTIMAL'
  if (!baseStation || baseStation.status !== 'online' || reachableSensorCount === 0) {
    networkStatus = 'DISCONNECTED'
  } else if (connectivityPct < 100) {
    networkStatus = 'DEGRADED'
  } else if (redundancyPercentage >= 70) {
    networkStatus = 'OPTIMAL'
  } else {
    networkStatus = 'CONNECTED'
  }

  // Calculate vertex-disjoint independent routes to the Base Station (Objective B)
  let twoIndependentRoutesCount = 0
  const twoIndependentRouteSensorIds = []

  if (baseStation && baseStation.status === 'online') {
    operationalSensors.forEach((s) => {
      if (hasTwoVertexDisjointPaths(adjacency, s.id, baseStation.id)) {
        twoIndependentRoutesCount++
        twoIndependentRouteSensorIds.push(s.id)
      }
    })
  }

  const twoIndependentRoutesPercentage = operationalSensors.length > 0
    ? Math.round((twoIndependentRoutesCount / operationalSensors.length) * 100)
    : 0

  // Calculate 3D terrain acoustic detection coverage across all 4 zones (Objective C)
  const coverage = calculateAcousticCoverage(sensors)

  const stats = {
    totalSensors: sensors.length,
    operationalSensors: operationalSensors.length,
    failedSensors: failedSensors.length,
    offlineSensors: offlineSensors.length,
    activeLinks: activeEdges.length,
    totalLinks: edges.length,
    isolatedSensorsCount: isolatedSensors.length,
    isolatedSensorIds: isolatedSensors.map((s) => s.id),
    reachableSensorCount,
    reachableFromBaseSet: reachableFromBase,
    connectivityPercentage: connectivityPct,
    connectedComponents: componentCount,
    averageNodeDegree: avgDegree,
    baseStationOnline: baseStation?.status === 'online',
    redundantSensorsCount,
    redundantSensorIds,
    redundancyPercentage,
    twoIndependentRoutesCount,
    twoIndependentRouteSensorIds,
    twoIndependentRoutesPercentage,
    coverage,
    networkStatus
  }

  return {
    nodes: allNodes,
    nodesMap,
    edges,
    adjacency,
    stats,
    reachableFromBase
  }
}
