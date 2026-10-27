import React, { useRef, useState, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { SEVERITY_LEVELS } from '../../data/toolboxEvents'
import { getTerrainElevation } from './terrainHelper'

/**
 * 3D Ghost Placement Marker rendered directly on the terrain
 * while an event is being dragged across the 3D scene.
 */
function GhostPlacementMarker({ position, item, isValid }) {
  const ringRef = useRef()
  const [worldX, worldY, worldZ] = position

  const severityObj = SEVERITY_LEVELS.find((s) => s.id === item.defaultSeverity)
  const markerColor = isValid ? severityObj?.color || '#C94232' : '#E11D48'

  // Animate target ring pulsing
  useFrame((state, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 1.8
      const s = 1 + Math.sin(state.clock.elapsedTime * 4.0) * 0.18
      ringRef.current.scale.set(s, s, s)
    }
  })

  return (
    <group position={[worldX, worldY, worldZ]}>
      {/* 1. Ground Pulsing Target Ring */}
      <mesh ref={ringRef} position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.85, 32]} />
        <meshBasicMaterial
          color={markerColor}
          transparent
          opacity={isValid ? 0.75 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Concentric Ground Target Crosshair */}
      <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.6, 24]} />
        <meshBasicMaterial
          color={markerColor}
          transparent
          opacity={isValid ? 0.9 : 0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. Subtle Target Area Highlight Overlay */}
      {isValid && (
        <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.8, 32]} />
          <meshBasicMaterial
            color={markerColor}
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 4. Vertical Light Pillar Beacon */}
      <mesh position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.04, 0.18, 5.2, 8]} />
        <meshBasicMaterial
          color={markerColor}
          transparent
          opacity={isValid ? 0.45 : 0.2}
        />
      </mesh>

      {/* 5. 3D Floating Preview Pill Badge */}
      <Html
        position={[0, 4.4, 0]}
        center
        distanceFactor={55}
        zIndexRange={[300, 200]}
      >
        <div
          className={`ghost-placement-pill ${isValid ? 'valid' : 'invalid'}`}
          style={{
            borderColor: markerColor,
            boxShadow: `0 4px 18px ${markerColor}44`
          }}
        >
          <span className="ghost-pill-emoji">{item.icon}</span>
          <div className="ghost-pill-col">
            <div className="ghost-pill-title-row">
              <span className="ghost-pill-title">{item.title}</span>
              <span
                className="ghost-pill-badge"
                style={{ backgroundColor: markerColor, color: '#FFFFFF' }}
              >
                {item.defaultSeverity.toUpperCase()}
              </span>
            </div>
            <span className="ghost-pill-instruction">
              {isValid ? 'Release to drop & log incident' : 'Outside forest reserve bounds'}
            </span>
          </div>
        </div>
      </Html>
    </group>
  )
}

/**
 * Controller component that computes raycasting against the terrain mesh
 * in real-time as the pointer moves across the screen.
 */
export default function DragPlacementController({
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

    // 1. Raycast strictly against the forest terrain top surface mesh
    // Trees, sensors, and labels are ignored
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
    <GhostPlacementMarker
      position={ghostPos}
      item={draggingItem}
      isValid={isValid}
    />
  )
}
