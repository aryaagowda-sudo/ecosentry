import React, { useMemo } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { WORLD_SIZE, HALF_SIZE, getTerrainElevation } from './terrainHelper'

export default function Terrain({ selectedZone }) {
  // Generate procedural undulating terrain geometry with custom elevation and vertex coloring
  const { geometry, riverMesh } = useMemo(() => {
    const segments = 56
    const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, segments, segments)
    geo.rotateX(-Math.PI / 2) // Orient flat on X-Z plane

    const pos = geo.attributes.position
    const colors = []

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = getTerrainElevation(x, z)
      pos.setY(i, y)

      // Vertex color blending based on forest zone and elevation
      const color = new THREE.Color()
      if (x <= 0 && z <= 0) {
        // Zone 1: Lush North Canopy
        color.setHSL(0.38, 0.45, 0.12 + Math.max(0, y * 0.02))
      } else if (x > 0 && z <= 0) {
        // Zone 2: East River Basin (greener/cooler wetland)
        color.setHSL(0.44, 0.42, 0.11 + Math.max(0, y * 0.02))
      } else if (x <= 0 && z > 0) {
        // Zone 3: South Wildlife Corridor
        color.setHSL(0.35, 0.38, 0.14 + Math.max(0, y * 0.02))
      } else {
        // Zone 4: West Buffer Zone (drier boundary savanna)
        color.setHSL(0.24, 0.35, 0.15 + Math.max(0, y * 0.02))
      }

      colors.push(color.r, color.g, color.b)
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geo.computeVertexNormals()

    // Create stylized curved river path
    const riverCurvePoints = []
    const numRiverPoints = 32
    for (let i = 0; i <= numRiverPoints; i++) {
      const t = i / numRiverPoints
      const z = -HALF_SIZE + t * WORLD_SIZE
      const x = 12 + t * 24 + Math.sin(t * Math.PI * 2.5) * 6
      const y = getTerrainElevation(x, z) + 0.25 // Sit just above riverbed
      riverCurvePoints.push(new THREE.Vector3(x, y, z))
    }
    const riverCurve = new THREE.CatmullRomCurve3(riverCurvePoints)
    const riverGeo = new THREE.TubeGeometry(riverCurve, 40, 2.8, 8, false)

    return { geometry: geo, riverMesh: riverGeo }
  }, [])

  // Zone boundary highlight calculations
  const isZone1 = selectedZone === 'zone-1'
  const isZone2 = selectedZone === 'zone-2'
  const isZone3 = selectedZone === 'zone-3'
  const isZone4 = selectedZone === 'zone-4'

  return (
    <group>
      {/* 1. Base Terrain Mesh */}
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.88}
          metalness={0.06}
          flatShading={false}
        />
      </mesh>

      {/* 2. Stylized Water River Surface */}
      <mesh geometry={riverMesh}>
        <meshStandardMaterial
          color="#0ea5e9"
          roughness={0.12}
          metalness={0.3}
          transparent
          opacity={0.82}
        />
      </mesh>

      {/* 3. Outer Sanctuary Boundary Fence */}
      <lineSegments>
        <edgesGeometry
          args={[new THREE.BoxGeometry(WORLD_SIZE, 0.8, WORLD_SIZE)]}
        />
        <lineBasicMaterial color="#34d399" opacity={0.35} transparent />
      </lineSegments>

      {/* 4. Crosshair Zone Dividers (Subtle Boundary Grid at X=0 and Z=0) */}
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[WORLD_SIZE, 0.35]} />
        <meshBasicMaterial color="#10b981" opacity={0.25} transparent />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[WORLD_SIZE, 0.35]} />
        <meshBasicMaterial color="#10b981" opacity={0.25} transparent />
      </mesh>

      {/* 5. Zone Ground Highlight Boxes (when a specific zone is selected) */}
      {isZone1 && (
        <mesh position={[-25, 0.15, -25]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[49, 49]} />
          <meshBasicMaterial color="#10b981" opacity={0.12} transparent />
        </mesh>
      )}
      {isZone2 && (
        <mesh position={[25, 0.15, -25]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[49, 49]} />
          <meshBasicMaterial color="#06b6d4" opacity={0.12} transparent />
        </mesh>
      )}
      {isZone3 && (
        <mesh position={[-25, 0.15, 25]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[49, 49]} />
          <meshBasicMaterial color="#a855f7" opacity={0.12} transparent />
        </mesh>
      )}
      {isZone4 && (
        <mesh position={[25, 0.15, 25]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[49, 49]} />
          <meshBasicMaterial color="#f59e0b" opacity={0.12} transparent />
        </mesh>
      )}

      {/* 6. Zone 3D Text Labels Floating Over Terrain */}
      <group position={[-26, 4.5, -26]}>
        <Text
          fontSize={2.4}
          color="#10b981"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.85}
          rotation={[-Math.PI / 4, 0, 0]}
        >
          ZONE 1: NORTH CANOPY
        </Text>
      </group>

      <group position={[26, 4.5, -26]}>
        <Text
          fontSize={2.4}
          color="#06b6d4"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.85}
          rotation={[-Math.PI / 4, 0, 0]}
        >
          ZONE 2: EAST RIVER BASIN
        </Text>
      </group>

      <group position={[-26, 4.5, 26]}>
        <Text
          fontSize={2.4}
          color="#a855f7"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.85}
          rotation={[-Math.PI / 4, 0, 0]}
        >
          ZONE 3: SOUTH CORRIDOR
        </Text>
      </group>

      <group position={[26, 4.5, 26]}>
        <Text
          fontSize={2.4}
          color="#f59e0b"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.85}
          rotation={[-Math.PI / 4, 0, 0]}
        >
          ZONE 4: WEST BUFFER ZONE
        </Text>
      </group>
    </group>
  )
}
