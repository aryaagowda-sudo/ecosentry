import React, { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import {
  WORLD_SIZE,
  HALF_SIZE,
  getTerrainElevation,
  getRiverCenterlineX,
  gridToWorld
} from './terrainHelper'
import { INITIAL_SENSORS, INITIAL_EVENTS, ANIMAL_TRAILS } from '../../data/mockData'

export default function Vegetation() {
  const pineTrunkRef = useRef()
  const pineFoliageRef = useRef()
  const broadleafTrunkRef = useRef()
  const broadleafFoliageRef = useRef()
  const riverTreeTrunkRef = useRef()
  const riverTreeFoliageRef = useRef()
  const shrubRef = useRef()

  // Pre-calculate sensor, threat, and trail clearing zones so markers remain unobstructed
  const { clearedZones } = useMemo(() => {
    const list = []

    // 1. Sensor locations
    INITIAL_SENSORS.forEach((s) => {
      const [wx, , wz] = gridToWorld(s.coordinates.x, s.coordinates.y)
      list.push({ x: wx, z: wz, radius: 4.2 })
    })

    // 2. Threat event locations
    INITIAL_EVENTS.forEach((e) => {
      const [wx, , wz] = gridToWorld(e.coordinates.x, e.coordinates.y)
      list.push({ x: wx, z: wz, radius: 3.8 })
    })

    return { clearedZones: list }
  }, [])

  // Generate dense, realistic forest tree positions across the 4 sectors
  const { pineList, broadleafList, riverTreeList, shrubList } = useMemo(() => {
    const pines = []
    const broadleafs = []
    const riverTrees = []
    const shrubs = []

    // Deterministic pseudo-random number generator
    let seed = 123456
    function rnd() {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    // Helper to check if a location is cleared
    function isNearClearedLocation(x, z) {
      // 1. Avoid riverbed water and immediate riparian channel banks
      const riverX = getRiverCenterlineX(z)
      if (Math.abs(x - riverX) < 4.8) return true

      // 2. Avoid sensor & event clearings so markers are unobstructed
      for (let i = 0; i < clearedZones.length; i++) {
        const cz = clearedZones[i]
        const d2 = (x - cz.x) * (x - cz.x) + (z - cz.z) * (z - cz.z)
        if (d2 < cz.radius * cz.radius) return true
      }

      // 3. Keep slightly within outer platform boundary
      if (Math.abs(x) > 44 || Math.abs(z) > 44) return true

      return false
    }

    // Keep a readable canopy so the terrain, river, zone labels, and sensor network stay visible.
    const targetCount = 500
    let attempts = 0

    while ((pines.length + broadleafs.length + riverTrees.length + shrubs.length) < targetCount && attempts < 1800) {
      attempts++
      const x = -44 + rnd() * 88
      const z = -44 + rnd() * 88

      if (isNearClearedLocation(x, z)) continue

      const y = getTerrainElevation(x, z)
      const riverX = getRiverCenterlineX(z)
      const distFromRiver = Math.abs(x - riverX)

      const scale = 0.65 + rnd() * 0.35
      const rot = rnd() * Math.PI * 2

      if (distFromRiver < 9.0) {
        // Riparian riverbank tree (willows & wetland canopy)
        riverTrees.push({ x, y, z, scale: scale * 0.95, rot })
      } else if (x < 8 && z < 8) {
        // Zone 1 & High Ridges: dense mix of tall pines and rainforest broadleaf
        if (rnd() > 0.42 || y > 7.0) {
          pines.push({ x, y, z, scale: scale * 1.1, rot })
        } else {
          broadleafs.push({ x, y, z, scale: scale * 1.0, rot })
        }
      } else if (x <= 5 && z > 5) {
        // Zone 3: Wildlife Corridor (rich forest with shrub undergrowth)
        if (rnd() > 0.5) {
          broadleafs.push({ x, y, z, scale, rot })
        } else if (rnd() > 0.4) {
          pines.push({ x, y, z, scale: scale * 1.05, rot })
        } else {
          shrubs.push({ x, y, z, scale: scale * 0.75, rot })
        }
      } else if (x > 5 && z <= 5) {
        // Zone 2: River Basin eastern forests
        if (rnd() > 0.4) {
          broadleafs.push({ x, y, z, scale, rot })
        } else {
          pines.push({ x, y, z, scale: scale * 0.95, rot })
        }
      } else {
        // Zone 4: West Buffer Zone (woodland clusters with open patches)
        if (rnd() > 0.55) {
          broadleafs.push({ x, y, z, scale: scale * 0.9, rot })
        } else if (rnd() > 0.6) {
          shrubs.push({ x, y, z, scale: scale * 0.7, rot })
        }
      }
    }

    return {
      pineList: pines,
      broadleafList: broadleafs,
      riverTreeList: riverTrees,
      shrubList: shrubs
    }
  }, [clearedZones])

  // Populate instanced matrix transforms
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()

    // 1. Pines
    if (pineTrunkRef.current && pineFoliageRef.current) {
      pineList.forEach((tree, i) => {
        // Trunk
        dummy.position.set(tree.x, tree.y + 1.2 * tree.scale, tree.z)
        dummy.rotation.set(0, tree.rot, 0)
        dummy.scale.set(tree.scale * 0.9, tree.scale * 1.08, tree.scale * 0.9)
        dummy.updateMatrix()
        pineTrunkRef.current.setMatrixAt(i, dummy.matrix)

        // Foliage
        dummy.position.set(tree.x, tree.y + 2.8 * tree.scale, tree.z)
        dummy.scale.set(tree.scale * 1.04, tree.scale * 1.12, tree.scale * 1.04)
        dummy.updateMatrix()
        pineFoliageRef.current.setMatrixAt(i, dummy.matrix)
      })
      pineTrunkRef.current.instanceMatrix.needsUpdate = true
      pineFoliageRef.current.instanceMatrix.needsUpdate = true
    }

    // 2. Broadleaf Trees
    if (broadleafTrunkRef.current && broadleafFoliageRef.current) {
      broadleafList.forEach((tree, i) => {
        // Trunk
        dummy.position.set(tree.x, tree.y + 1.1 * tree.scale, tree.z)
        dummy.rotation.set(0, tree.rot, 0)
        dummy.scale.set(tree.scale * 0.92, tree.scale * 1.05, tree.scale * 0.92)
        dummy.updateMatrix()
        broadleafTrunkRef.current.setMatrixAt(i, dummy.matrix)

        // Foliage
        dummy.position.set(tree.x, tree.y + 2.5 * tree.scale, tree.z)
        dummy.scale.set(tree.scale * 1.12, tree.scale * 0.92, tree.scale * 1.12)
        dummy.updateMatrix()
        broadleafFoliageRef.current.setMatrixAt(i, dummy.matrix)
      })
      broadleafTrunkRef.current.instanceMatrix.needsUpdate = true
      broadleafFoliageRef.current.instanceMatrix.needsUpdate = true
    }

    // 3. River Trees
    if (riverTreeTrunkRef.current && riverTreeFoliageRef.current) {
      riverTreeList.forEach((tree, i) => {
        dummy.position.set(tree.x, tree.y + 0.9 * tree.scale, tree.z)
        dummy.rotation.set(0, tree.rot, 0)
        dummy.scale.set(tree.scale, tree.scale, tree.scale)
        dummy.updateMatrix()
        riverTreeTrunkRef.current.setMatrixAt(i, dummy.matrix)

        dummy.position.set(tree.x, tree.y + 2.1 * tree.scale, tree.z)
        dummy.updateMatrix()
        riverTreeFoliageRef.current.setMatrixAt(i, dummy.matrix)
      })
      riverTreeTrunkRef.current.instanceMatrix.needsUpdate = true
      riverTreeFoliageRef.current.instanceMatrix.needsUpdate = true
    }

    // 4. Shrubs / Understory
    if (shrubRef.current) {
      shrubList.forEach((bush, i) => {
        dummy.position.set(bush.x, bush.y + 0.6 * bush.scale, bush.z)
        dummy.rotation.set(0, bush.rot, 0)
        dummy.scale.set(bush.scale, bush.scale, bush.scale)
        dummy.updateMatrix()
        shrubRef.current.setMatrixAt(i, dummy.matrix)
      })
      shrubRef.current.instanceMatrix.needsUpdate = true
    }
  }, [pineList, broadleafList, riverTreeList, shrubList])

  // Geometries for instancing
  const geometries = useMemo(() => {
    return {
      trunk: new THREE.CylinderGeometry(0.18, 0.28, 2.2, 5),
      pineFoliage: new THREE.ConeGeometry(1.35, 3.6, 10),
      broadleafFoliage: new THREE.SphereGeometry(1.7, 12, 8),
      riverFoliage: new THREE.SphereGeometry(1.45, 12, 8),
      shrubFoliage: new THREE.SphereGeometry(1.15, 12, 8)
    }
  }, [])

  return (
    <group>
      {/* 1. Tall Conifer Pines */}
      <instancedMesh
        ref={pineTrunkRef}
        args={[geometries.trunk, null, pineList.length]}
        castShadow
      >
        <meshStandardMaterial color="#2d2216" roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        ref={pineFoliageRef}
        args={[geometries.pineFoliage, null, pineList.length]}
        castShadow
      >
        <meshStandardMaterial
          color="#1c5134" // Deep pine conifer green
          roughness={0.72}
          metalness={0.04}
          flatShading={false}
        />
      </instancedMesh>

      {/* 2. Dense Canopy Broadleaf Trees */}
      <instancedMesh
        ref={broadleafTrunkRef}
        args={[geometries.trunk, null, broadleafList.length]}
        castShadow
      >
        <meshStandardMaterial color="#36291a" roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        ref={broadleafFoliageRef}
        args={[geometries.broadleafFoliage, null, broadleafList.length]}
        castShadow
      >
        <meshStandardMaterial
          color="#2b6842" // Rich emerald rainforest canopy
          roughness={0.76}
          metalness={0.06}
          flatShading={false}
        />
      </instancedMesh>

      {/* 3. Riparian Riverbank Trees */}
      <instancedMesh
        ref={riverTreeTrunkRef}
        args={[geometries.trunk, null, riverTreeList.length]}
        castShadow
      >
        <meshStandardMaterial color="#33271c" roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        ref={riverTreeFoliageRef}
        args={[geometries.riverFoliage, null, riverTreeList.length]}
        castShadow
      >
        <meshStandardMaterial
          color="#29663f" // Lush river delta green
          roughness={0.74}
          metalness={0.05}
          flatShading
        />
      </instancedMesh>

      {/* 4. Understory Shrubs & Bush Clusters */}
      <instancedMesh
        ref={shrubRef}
        args={[geometries.shrubFoliage, null, shrubList.length]}
        castShadow
      >
        <meshStandardMaterial
          color="#1e4d2b"
          roughness={0.8}
          metalness={0.02}
          flatShading
        />
      </instancedMesh>
    </group>
  )
}
