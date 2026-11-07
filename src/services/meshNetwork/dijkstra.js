/**
 * EcoSentry Mesh Network - Dijkstra Shortest-Path Algorithm
 * 
 * Computes optimal, lowest-cost routing paths through the operational mesh graph.
 * Non-negative Euclidean link distances are used as edge weights.
 * Excludes failed nodes and disabled edges.
 */

/**
 * Executes Dijkstra's algorithm from sourceNodeId to destinationNodeId.
 * 
 * @param {Map<string, Array<{ nodeId: string, cost: number, distance: number }>>} adjacency 
 * @param {string} sourceId Source node ID
 * @param {string} destId Destination node ID (typically 'BASE')
 * @returns {{
 *   path: Array<string>,
 *   totalCost: number,
 *   hops: number,
 *   reachable: boolean,
 *   error: string|null
 * }}
 */
export function findShortestPath(adjacency, sourceId, destId = 'BASE') {
  if (!adjacency || !sourceId || !destId) {
    return {
      path: [],
      totalCost: Infinity,
      hops: 0,
      reachable: false,
      error: 'INVALID_PARAMETERS'
    }
  }

  if (sourceId === destId) {
    return {
      path: [sourceId],
      totalCost: 0,
      hops: 0,
      reachable: true,
      error: null
    }
  }

  if (!adjacency.has(sourceId)) {
    return {
      path: [],
      totalCost: Infinity,
      hops: 0,
      reachable: false,
      error: `SOURCE_NOT_IN_GRAPH: ${sourceId}`
    }
  }

  if (!adjacency.has(destId)) {
    return {
      path: [],
      totalCost: Infinity,
      hops: 0,
      reachable: false,
      error: `DEST_NOT_IN_GRAPH: ${destId}`
    }
  }

  const distances = new Map()
  const previous = new Map()
  const unvisited = new Set()

  adjacency.forEach((_, nodeId) => {
    distances.set(nodeId, Infinity)
    previous.set(nodeId, null)
    unvisited.add(nodeId)
  })

  distances.set(sourceId, 0)

  while (unvisited.size > 0) {
    // Extract node with smallest tentative distance
    let current = null
    let smallestDist = Infinity

    for (const node of unvisited) {
      const d = distances.get(node)
      if (d < smallestDist) {
        smallestDist = d
        current = node
      }
    }

    // If smallest distance is infinity or unvisited is disconnected
    if (current === null || smallestDist === Infinity) {
      break
    }

    // Reached destination early
    if (current === destId) {
      break
    }

    unvisited.delete(current)

    const neighbors = adjacency.get(current) || []
    for (const edge of neighbors) {
      if (!unvisited.has(edge.nodeId)) continue

      const alt = smallestDist + (edge.cost >= 0 ? edge.cost : 0)
      if (alt < distances.get(edge.nodeId)) {
        distances.set(edge.nodeId, alt)
        previous.set(edge.nodeId, current)
      }
    }
  }

  const targetDist = distances.get(destId)
  if (targetDist === Infinity || previous.get(destId) === null) {
    return {
      path: [],
      totalCost: Infinity,
      hops: 0,
      reachable: false,
      error: `NO_ROUTE_TO_DESTINATION: ${sourceId} -> ${destId}`
    }
  }

  // Reconstruct path backwards from destId
  const path = []
  let curr = destId
  while (curr !== null) {
    path.unshift(curr)
    curr = previous.get(curr)
  }

  return {
    path,
    totalCost: Number(targetDist.toFixed(2)),
    hops: Math.max(0, path.length - 1),
    reachable: true,
    error: null
  }
}

/**
 * Checks whether an alternative path to BASE exists for a sensor,
 * specifically if a specified node or link along the primary route were to fail.
 * 
 * @param {Map<string, Array<{ nodeId: string, cost: number }>>} adjacency
 * @param {string} sourceId
 * @param {string} excludeNodeId Node to bypass
 * @param {string} [destId='BASE']
 * @returns {{ hasAlternative: boolean, alternativePath: Array<string>|null, cost: number }}
 */
export function findAlternativeRoute(adjacency, sourceId, excludeNodeId, destId = 'BASE') {
  // Create a clone of adjacency without excludeNodeId
  const tempAdjacency = new Map()

  adjacency.forEach((neighbors, nodeId) => {
    if (nodeId === excludeNodeId) return
    tempAdjacency.set(
      nodeId,
      neighbors.filter((n) => n.nodeId !== excludeNodeId)
    )
  })

  const result = findShortestPath(tempAdjacency, sourceId, destId)
  return {
    hasAlternative: result.reachable,
    alternativePath: result.reachable ? result.path : null,
    cost: result.totalCost,
    hops: result.hops
  }
}

/**
 * Graph-theoretic determination of two internally vertex-disjoint paths from sourceId to destId.
 * Two paths P1 and P2 are internally vertex-disjoint if they share NO intermediate sensors:
 *   (P1 \ {sourceId, destId}) ∩ (P2 \ {sourceId, destId}) = ∅
 * 
 * @param {Map<string, Array<{ nodeId: string, cost: number }>>} adjacency
 * @param {string} sourceId
 * @param {string} [destId='BASE']
 * @returns {boolean} True if at least two vertex-disjoint paths exist
 */
export function hasTwoVertexDisjointPaths(adjacency, sourceId, destId = 'BASE') {
  if (!adjacency || !sourceId || !destId || sourceId === destId) return false
  if (!adjacency.has(sourceId) || !adjacency.has(destId)) return false

  const p1 = findShortestPath(adjacency, sourceId, destId)
  if (!p1.reachable || p1.path.length < 2) return false

  // Case 1: Direct link to destination (0 intermediate vertices)
  if (p1.path.length === 2) {
    const tempAdj = new Map()
    adjacency.forEach((nbrs, u) => {
      if (u === sourceId) {
        tempAdj.set(u, nbrs.filter((n) => n.nodeId !== destId))
      } else {
        tempAdj.set(u, [...nbrs])
      }
    })
    return findShortestPath(tempAdj, sourceId, destId).reachable
  }

  // Case 2: Multi-hop path: remove all intermediate vertices P1[1 .. length-2]
  const intermediate = new Set(p1.path.slice(1, -1))
  const tempAdj = new Map()
  adjacency.forEach((nbrs, u) => {
    if (intermediate.has(u)) return
    tempAdj.set(u, nbrs.filter((n) => !intermediate.has(n.nodeId)))
  })

  if (findShortestPath(tempAdj, sourceId, destId).reachable) return true

  // Fallback: Test alternative first hops in case P1 picked a vertex that blocked P2
  const sourceNeighbors = adjacency.get(sourceId) || []
  const firstHop = p1.path[1]

  for (const nbr of sourceNeighbors) {
    if (nbr.nodeId === firstHop || intermediate.has(nbr.nodeId)) continue
    const altAdj = new Map()
    adjacency.forEach((nbrs, u) => {
      if (u === sourceId) {
        altAdj.set(u, nbrs.filter((n) => n.nodeId === nbr.nodeId))
      } else {
        altAdj.set(u, [...nbrs])
      }
    })
    const altP1 = findShortestPath(altAdj, sourceId, destId)
    if (altP1.reachable) {
      const altIntermediate = new Set(altP1.path.slice(1, -1))
      const altRemaining = new Map()
      adjacency.forEach((nbrs, u) => {
        if (altIntermediate.has(u)) return
        altRemaining.set(u, nbrs.filter((n) => !altIntermediate.has(n.nodeId)))
      })
      if (findShortestPath(altRemaining, sourceId, destId).reachable) return true
    }
  }

  return false
}
