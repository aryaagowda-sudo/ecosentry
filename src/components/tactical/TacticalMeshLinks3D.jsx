import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * 3D Tactical Mesh Network Communication Links
 * 
 * Renders:
 * 1. Background mesh edges: thin cyan lines for active links, red for failed links.
 * 2. Active Dijkstra shortest path: glowing, luminous thick line highlighting
 *    the incident's packet route from source to BASE.
 */
export default function TacticalMeshLinks3D({
  edges = [],
  selectedPath = [],
  nodesMap = new Map(),
  showLinks = true,
  showFailedLinks = true
}) {
  // 1. Build line segment buffers for active and failed links
  const { activeLinesGeometry, failedLinesGeometry } = useMemo(() => {
    const activePositions = []
    const failedPositions = []

    edges.forEach((edge) => {
      const srcNode = nodesMap.get(edge.source)
      const tgtNode = nodesMap.get(edge.target)

      if (!srcNode || !tgtNode) return

      // Slightly elevate above ground for clean visibility
      const elevationOffset = 0.6
      const x1 = srcNode.position.x
      const y1 = srcNode.position.y + elevationOffset
      const z1 = srcNode.position.z

      const x2 = tgtNode.position.x
      const y2 = tgtNode.position.y + elevationOffset
      const z2 = tgtNode.position.z

      if (edge.status === 'active') {
        activePositions.push(x1, y1, z1, x2, y2, z2)
      } else if (edge.status === 'failed') {
        failedPositions.push(x1, y1, z1, x2, y2, z2)
      }
    })

    const activeGeo = new THREE.BufferGeometry()
    if (activePositions.length > 0) {
      activeGeo.setAttribute('position', new THREE.Float32BufferAttribute(activePositions, 3))
    }

    const failedGeo = new THREE.BufferGeometry()
    if (failedPositions.length > 0) {
      failedGeo.setAttribute('position', new THREE.Float32BufferAttribute(failedPositions, 3))
    }

    return { activeLinesGeometry: activeGeo, failedLinesGeometry: failedGeo }
  }, [edges, nodesMap])

  // 2. Build geometry for the selected shortest path (e.g. S-004 -> S-009 -> S-015 -> BASE)
  const pathGeometry = useMemo(() => {
    if (!selectedPath || selectedPath.length < 2) return null

    const points = []
    for (let i = 0; i < selectedPath.length; i++) {
      const nodeId = selectedPath[i]
      const node = nodesMap.get(nodeId)
      if (node) {
        // Elevate path line slightly above generic link lines for maximum clarity
        points.push(new THREE.Vector3(node.position.x, node.position.y + 0.9, node.position.z))
      }
    }

    if (points.length < 2) return null
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [selectedPath, nodesMap])

  return (
    <group>
      {/* 1. All Active Communication Links (Thin Cyan Lines) */}
      {showLinks && activeLinesGeometry?.attributes?.position && (
        <lineSegments geometry={activeLinesGeometry}>
          <lineBasicMaterial
            color="#06b6d4"
            transparent
            opacity={0.38}
            depthWrite={false}
          />
        </lineSegments>
      )}

      {/* 2. Failed Communication Links (Red Dashed/Faint Lines) */}
      {showLinks && showFailedLinks && failedLinesGeometry?.attributes?.position && (
        <lineSegments geometry={failedLinesGeometry}>
          <lineBasicMaterial
            color="#ef4444"
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </lineSegments>
      )}

      {/* 3. Selected Dijkstra Shortest-Path Route (Glowing Luminous Cyan) */}
      {pathGeometry && (
        <group>
          {/* Main Bright Path Line */}
          <line geometry={pathGeometry}>
            <lineBasicMaterial
              color="#00f0ff"
              linewidth={2}
              transparent
              opacity={0.95}
              depthWrite={false}
            />
          </line>

          {/* Path Waypoint Nodes Highlight Glow */}
          {selectedPath.map((nodeId) => {
            const node = nodesMap.get(nodeId)
            if (!node) return null
            return (
              <mesh
                key={`route-wpt-${nodeId}`}
                position={[node.position.x, node.position.y + 0.9, node.position.z]}
              >
                <sphereGeometry args={[0.26, 12, 12]} />
                <meshBasicMaterial color="#00f0ff" />
              </mesh>
            )
          })}
        </group>
      )}
    </group>
  )
}
