import { useRef, useState, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getTerrainElevation } from '../forest3d/terrainHelper.js'

/**
 * 3D Tactical Target Crosshair Marker on the terrain surface
 */
function TacticalTargetMarker({ position, item, isValid }) {
  const outerRingRef = useRef()
  const innerCrossRef = useRef()
  const [worldX, worldY, worldZ] = position

  const severity = String(item.defaultSeverity || item.priority || 'high').toLowerCase()
  const markerColor = !isValid
    ? '#ef4444'
    : severity === 'critical'
    ? '#ef4444'
    : severity === 'high'
    ? '#f59e0b'
    : severity === 'medium'
    ? '#00f0ff'
    : '#3b82f6'

  useFrame((state, delta) => {
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z += delta * 1.8
      const s = 1.0 + Math.sin(state.clock.elapsedTime * 4.0) * 0.16
      outerRingRef.current.scale.set(s, s, s)
    }
    if (innerCrossRef.current) {
      innerCrossRef.current.rotation.z -= delta * 1.2
    }
  })

  // Disable raycasting against the ghost marker so it never blocks terrain raycasting
  const ignoreRaycast = () => null

  return (
    <group position={[worldX, worldY, worldZ]} raycast={ignoreRaycast}>
      {/* 1. Subtle Highlighted Terrain Disc */}
      {isValid && (
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={ignoreRaycast}>
          <circleGeometry args={[3.2, 36]} />
          <meshBasicMaterial
            color={markerColor}
            transparent
            opacity={0.14}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 2. Outer Subtle Terrain Area Ring */}
      {isValid && (
        <mesh position={[0, 0.10, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={ignoreRaycast}>
          <ringGeometry args={[3.0, 3.25, 36]} />
          <meshBasicMaterial
            color={markerColor}
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 3. Pulsing Outer Target Ring */}
      <mesh ref={outerRingRef} position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={ignoreRaycast}>
        <ringGeometry args={[1.4, 1.9, 32]} />
        <meshBasicMaterial
          color={markerColor}
          transparent
          opacity={isValid ? 0.85 : 0.45}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 4. Rotating Concentric Crosshair Ring */}
      <group ref={innerCrossRef} position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={ignoreRaycast}>
        <mesh raycast={ignoreRaycast}>
          <ringGeometry args={[0.35, 0.65, 24]} />
          <meshBasicMaterial
            color={markerColor}
            transparent
            opacity={isValid ? 0.95 : 0.6}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* 4 Crosshair Tick Marks */}
        {/* North */}
        <mesh position={[0, 1.25, 0]} raycast={ignoreRaycast}>
          <planeGeometry args={[0.08, 0.9]} />
          <meshBasicMaterial color={markerColor} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
        {/* South */}
        <mesh position={[0, -1.25, 0]} raycast={ignoreRaycast}>
          <planeGeometry args={[0.08, 0.9]} />
          <meshBasicMaterial color={markerColor} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
        {/* East */}
        <mesh position={[1.25, 0, 0]} raycast={ignoreRaycast}>
          <planeGeometry args={[0.9, 0.08]} />
          <meshBasicMaterial color={markerColor} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
        {/* West */}
        <mesh position={[-1.25, 0, 0]} raycast={ignoreRaycast}>
          <planeGeometry args={[0.9, 0.08]} />
          <meshBasicMaterial color={markerColor} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* 5. Precision Center Point Marker */}
      <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={ignoreRaycast}>
        <circleGeometry args={[0.15, 16]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
      </mesh>

      {/* 6. Vertical Light Beacon Pillar */}
      <mesh position={[0, 3.2, 0]} raycast={ignoreRaycast}>
        <cylinderGeometry args={[0.05, 0.22, 6.4, 8]} />
        <meshBasicMaterial
          color={markerColor}
          transparent
          opacity={isValid ? 0.45 : 0.2}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/**
 * Controller component that computes raycasting against the terrain mesh
 * in real-time as the pointer moves across the screen.
 */
export default function TacticalDragPlacementController({
  draggingItem,
  dragPointerPos,
  terrainMeshRef,
  onTerrainHitChange
}) {
  const { camera, raycaster, gl } = useThree()
  const [ghostPos, setGhostPos] = useState(null)
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    if (!draggingItem || !dragPointerPos) {
      setGhostPos(null)
      setIsValid(false)
      onTerrainHitChange?.(null, false)
      return
    }

    const rect = gl.domElement.getBoundingClientRect()
    const { clientX, clientY } = dragPointerPos

    // Check if pointer is within the canvas DOM element bounds
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      setGhostPos(null)
      setIsValid(false)
      onTerrainHitChange?.(null, false)
      return
    }

    // Convert screen coordinates into Normalized Device Coordinates [-1, 1]
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)

    let worldX = 0
    let worldY = 0
    let worldZ = 0
    let hasHit = false

    // 1. Raycast strictly against the forest terrain surface mesh
    // Exclude sensor nodes, labels, and UI overlays
    if (terrainMeshRef?.current) {
      const intersects = raycaster.intersectObject(terrainMeshRef.current, false)
      if (intersects.length > 0) {
        worldX = intersects[0].point.x
        worldY = intersects[0].point.y
        worldZ = intersects[0].point.z
        hasHit = true
      }
    }

    // 2. Resilient fallback: intersect horizontal ground plane and compute elevation mathematically
    if (!hasHit) {
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const targetVec = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(groundPlane, targetVec)) {
        worldX = targetVec.x
        worldZ = targetVec.z
        worldY = getTerrainElevation(worldX, worldZ)
        hasHit = true
      }
    }

    if (hasHit) {
      // Validate bounds: Platform diorama spans -50 to +50 on X and Z
      const inBounds = Math.abs(worldX) <= 49.0 && Math.abs(worldZ) <= 49.0
      setGhostPos([worldX, worldY, worldZ])
      setIsValid(inBounds)
      if (inBounds) {
        onTerrainHitChange?.({ x: worldX, y: worldY, z: worldZ }, true)
      } else {
        onTerrainHitChange?.(null, false)
      }
    } else {
      setGhostPos(null)
      setIsValid(false)
      onTerrainHitChange?.(null, false)
    }
  }, [draggingItem, dragPointerPos, camera, raycaster, gl, terrainMeshRef, onTerrainHitChange])

  if (!draggingItem || !ghostPos) return null

  return (
    <TacticalTargetMarker
      position={ghostPos}
      item={draggingItem}
      isValid={isValid}
    />
  )
}
