import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  WORLD_SIZE,
  HALF_SIZE,
  BASE_HEIGHT,
  getTerrainElevation
} from '../forest3d/terrainHelper.js'

/**
 * 3D Tactical Wireframe Terrain Diorama
 * 
 * Features dark rolling topographic hills with dense cyan triangular wireframe geometry,
 * extruded platform boundary skirt walls, and a cybernetic tactical surveillance aesthetic.
 */
export default function TacticalWireframeTerrain({ terrainMeshRef, onTerrainClick }) {
  const pointerDownPos = useRef({ x: 0, y: 0 })
  const { topGeometry, wireGeometry, skirtGeometry, bottomGeometry } = useMemo(() => {
    const segments = 60 // Topographic grid resolution
    const topGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, segments, segments)
    topGeo.rotateX(-Math.PI / 2) // Orient flat on X-Z plane

    const pos = topGeo.attributes.position

    // 1. Elevate top surface using the reserve terrain elevation formula
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = getTerrainElevation(x, z)
      pos.setY(i, y)
    }

    topGeo.computeVertexNormals()
    topGeo.computeBoundingBox()
    topGeo.computeBoundingSphere()

    // 2. Wireframe geometry with identical vertices
    const wireGeo = topGeo.clone()

    // 3. Extruded platform skirt walls (Tactical Dark Strata)
    const skirtPositions = []
    const addQuad = (p1, p2, p3, p4) => {
      skirtPositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z)
      skirtPositions.push(p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p4.x, p4.y, p4.z)
    }

    const steps = 40
    const stepSize = WORLD_SIZE / steps

    // North wall (Z = -HALF_SIZE)
    for (let i = 0; i < steps; i++) {
      const x1 = -HALF_SIZE + i * stepSize
      const x2 = x1 + stepSize
      const z = -HALF_SIZE
      const y1 = getTerrainElevation(x1, z)
      const y2 = getTerrainElevation(x2, z)
      addQuad(
        new THREE.Vector3(x1, y1, z),
        new THREE.Vector3(x2, y2, z),
        new THREE.Vector3(x2, BASE_HEIGHT, z),
        new THREE.Vector3(x1, BASE_HEIGHT, z)
      )
    }

    // South wall (Z = +HALF_SIZE)
    for (let i = 0; i < steps; i++) {
      const x1 = -HALF_SIZE + i * stepSize
      const x2 = x1 + stepSize
      const z = HALF_SIZE
      const y1 = getTerrainElevation(x1, z)
      const y2 = getTerrainElevation(x2, z)
      addQuad(
        new THREE.Vector3(x2, y2, z),
        new THREE.Vector3(x1, y1, z),
        new THREE.Vector3(x1, BASE_HEIGHT, z),
        new THREE.Vector3(x2, BASE_HEIGHT, z)
      )
    }

    // West wall (X = -HALF_SIZE)
    for (let i = 0; i < steps; i++) {
      const z1 = -HALF_SIZE + i * stepSize
      const z2 = z1 + stepSize
      const x = -HALF_SIZE
      const y1 = getTerrainElevation(x, z1)
      const y2 = getTerrainElevation(x, z2)
      addQuad(
        new THREE.Vector3(x, y2, z2),
        new THREE.Vector3(x, y1, z1),
        new THREE.Vector3(x, BASE_HEIGHT, z1),
        new THREE.Vector3(x, BASE_HEIGHT, z2)
      )
    }

    // East wall (X = +HALF_SIZE)
    for (let i = 0; i < steps; i++) {
      const z1 = -HALF_SIZE + i * stepSize
      const z2 = z1 + stepSize
      const x = HALF_SIZE
      const y1 = getTerrainElevation(x, z1)
      const y2 = getTerrainElevation(x, z2)
      addQuad(
        new THREE.Vector3(x, y1, z1),
        new THREE.Vector3(x, y2, z2),
        new THREE.Vector3(x, BASE_HEIGHT, z2),
        new THREE.Vector3(x, BASE_HEIGHT, z1)
      )
    }

    const skirtGeo = new THREE.BufferGeometry()
    skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(skirtPositions, 3))
    skirtGeo.computeVertexNormals()

    // 4. Bottom base slab
    const bottomGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE)
    bottomGeo.rotateX(Math.PI / 2)
    bottomGeo.translate(0, BASE_HEIGHT, 0)

    return { topGeometry: topGeo, wireGeometry: wireGeo, skirtGeometry: skirtGeo, bottomGeometry: bottomGeo }
  }, [])

  return (
    <group>
      {/* 1. Dark Sub-surface Terrain Base (Receives Shadows & Raycasts) */}
      <mesh
        ref={terrainMeshRef}
        geometry={topGeometry}
        onPointerDown={(e) => {
          pointerDownPos.current = { x: e.clientX, y: e.clientY }
        }}
        onClick={(e) => {
          const dx = Math.abs(e.clientX - pointerDownPos.current.x)
          const dy = Math.abs(e.clientY - pointerDownPos.current.y)
          if (dx <= 5 && dy <= 5) {
            onTerrainClick?.()
          }
        }}
      >
        <meshStandardMaterial
          color="#040e14"
          roughness={0.88}
          metalness={0.25}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      {/* 2. Glowing Cyan Tactical Wireframe Overlay */}
      <mesh geometry={wireGeometry}>
        <meshBasicMaterial
          color="#06b6d4"
          wireframe
          transparent
          opacity={0.32}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Platform Cutaway Skirt Walls */}
      <mesh geometry={skirtGeometry}>
        <meshStandardMaterial
          color="#02080d"
          roughness={0.92}
          metalness={0.15}
        />
      </mesh>

      {/* 4. Bottom Base Slab */}
      <mesh geometry={bottomGeometry}>
        <meshStandardMaterial color="#010406" />
      </mesh>

      {/* 5. Subtle Perimeter Boundary Grid Line */}
      <gridHelper
        args={[WORLD_SIZE, 20, '#0e7490', '#083344']}
        position={[0, BASE_HEIGHT - 0.1, 0]}
      />
    </group>
  )
}
