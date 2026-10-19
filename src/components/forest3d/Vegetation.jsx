import React, { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { getTerrainElevation } from './terrainHelper'

export default function Vegetation() {
  const broadleafTrunkRef = useRef()
  const broadleafFoliageRef = useRef()
  const pineTrunkRef = useRef()
  const pineFoliageRef = useRef()

  // Generate deterministic tree coordinates spread across the four zones
  const { broadleafTransforms, pineTransforms } = useMemo(() => {
    const broadleafList = []
    const pineList = []

    // Seeded pseudo-random generator for consistent layout
    let seed = 42
    function rnd() {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    // Helper to test if a point is in the riverbed
    function isInRiver(x, z) {
      const t = (z + 50) / 100
      const riverCenterlineX = 12 + t * 24 + Math.sin(t * Math.PI * 2.5) * 6
      return Math.abs(x - riverCenterlineX) < 7.5
    }

    // Zone 1: North Canopy (Dense Old-Growth broadleaf & tall pines)
    for (let i = 0; i < 55; i++) {
      const x = -44 + rnd() * 40
      const z = -44 + rnd() * 40
      const y = getTerrainElevation(x, z)
      const scale = 0.85 + rnd() * 0.4
      if (rnd() > 0.4) {
        broadleafList.push({ x, y, z, scale, rot: rnd() * Math.PI * 2 })
      } else {
        pineList.push({ x, y, z, scale: scale * 1.1, rot: rnd() * Math.PI * 2 })
      }
    }

    // Zone 2: East River Basin (River bank willow & wetland trees, avoiding river channel)
    for (let i = 0; i < 40; i++) {
      const x = 4 + rnd() * 42
      const z = -44 + rnd() * 40
      if (!isInRiver(x, z)) {
        const y = getTerrainElevation(x, z)
        const scale = 0.8 + rnd() * 0.35
        broadleafList.push({ x, y, z, scale, rot: rnd() * Math.PI * 2 })
      }
    }

    // Zone 3: South Wildlife Corridor (Open glades with perimeter tree clusters)
    for (let i = 0; i < 35; i++) {
      const x = -44 + rnd() * 40
      const z = 6 + rnd() * 40
      // Leave center clearing for elephant trail
      if (Math.abs(x + 20) > 8 || Math.abs(z - 25) > 12) {
        const y = getTerrainElevation(x, z)
        const scale = 0.75 + rnd() * 0.35
        if (rnd() > 0.5) {
          broadleafList.push({ x, y, z, scale, rot: rnd() * Math.PI * 2 })
        } else {
          pineList.push({ x, y, z, scale, rot: rnd() * Math.PI * 2 })
        }
      }
    }

    // Zone 4: West Buffer Zone (Sparse acacia / dry scrub trees near boundary)
    for (let i = 0; i < 28; i++) {
      const x = 8 + rnd() * 38
      const z = 8 + rnd() * 38
      if (!isInRiver(x, z)) {
        const y = getTerrainElevation(x, z)
        const scale = 0.65 + rnd() * 0.3
        broadleafList.push({ x, y, z, scale, rot: rnd() * Math.PI * 2 })
      }
    }

    return { broadleafTransforms: broadleafList, pineTransforms: pineList }
  }, [])

  // Position instances in instanced meshes
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()

    // 1. Broadleaf Trunks & Foliage
    if (broadleafTrunkRef.current && broadleafFoliageRef.current) {
      broadleafTransforms.forEach((tree, idx) => {
        // Trunk
        dummy.position.set(tree.x, tree.y + 1.2 * tree.scale, tree.z)
        dummy.rotation.set(0, tree.rot, 0)
        dummy.scale.set(tree.scale, tree.scale, tree.scale)
        dummy.updateMatrix()
        broadleafTrunkRef.current.setMatrixAt(idx, dummy.matrix)

        // Foliage sitting atop trunk
        dummy.position.set(tree.x, tree.y + 2.8 * tree.scale, tree.z)
        dummy.updateMatrix()
        broadleafFoliageRef.current.setMatrixAt(idx, dummy.matrix)
      })
      broadleafTrunkRef.current.instanceMatrix.needsUpdate = true
      broadleafFoliageRef.current.instanceMatrix.needsUpdate = true
    }

    // 2. Pine Trunks & Foliage
    if (pineTrunkRef.current && pineFoliageRef.current) {
      pineTransforms.forEach((tree, idx) => {
        // Trunk
        dummy.position.set(tree.x, tree.y + 1.4 * tree.scale, tree.z)
        dummy.rotation.set(0, tree.rot, 0)
        dummy.scale.set(tree.scale, tree.scale, tree.scale)
        dummy.updateMatrix()
        pineTrunkRef.current.setMatrixAt(idx, dummy.matrix)

        // Pine Foliage Cone
        dummy.position.set(tree.x, tree.y + 3.2 * tree.scale, tree.z)
        dummy.updateMatrix()
        pineFoliageRef.current.setMatrixAt(idx, dummy.matrix)
      })
      pineTrunkRef.current.instanceMatrix.needsUpdate = true
      pineFoliageRef.current.instanceMatrix.needsUpdate = true
    }
  }, [broadleafTransforms, pineTransforms])

  // Shared Geometries & Materials (Single allocation for entire forest)
  const geometries = useMemo(() => {
    return {
      broadleafTrunk: new THREE.CylinderGeometry(0.22, 0.32, 2.4, 5),
      broadleafFoliage: new THREE.DodecahedronGeometry(1.6, 1),
      pineTrunk: new THREE.CylinderGeometry(0.18, 0.28, 2.8, 5),
      pineFoliage: new THREE.ConeGeometry(1.5, 3.2, 5)
    }
  }, [])

  return (
    <group>
      {/* Broadleaf Trees Instanced Mesh */}
      <instancedMesh
        ref={broadleafTrunkRef}
        args={[geometries.broadleafTrunk, null, broadleafTransforms.length]}
        castShadow
      >
        <meshStandardMaterial color="#3b2b1d" roughness={0.9} />
      </instancedMesh>

      <instancedMesh
        ref={broadleafFoliageRef}
        args={[geometries.broadleafFoliage, null, broadleafTransforms.length]}
        castShadow
      >
        <meshStandardMaterial
          color="#164e33"
          roughness={0.78}
          metalness={0.08}
          flatShading
        />
      </instancedMesh>

      {/* Pine Trees Instanced Mesh */}
      <instancedMesh
        ref={pineTrunkRef}
        args={[geometries.pineTrunk, null, pineTransforms.length]}
        castShadow
      >
        <meshStandardMaterial color="#2d2217" roughness={0.9} />
      </instancedMesh>

      <instancedMesh
        ref={pineFoliageRef}
        args={[geometries.pineFoliage, null, pineTransforms.length]}
        castShadow
      >
        <meshStandardMaterial
          color="#0f3b25"
          roughness={0.75}
          metalness={0.05}
          flatShading
        />
      </instancedMesh>
    </group>
  )
}
