import React, { useMemo } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import {
  WORLD_SIZE,
  HALF_SIZE,
  BASE_HEIGHT,
  getTerrainElevation,
  getRiverCenterlineX
} from './terrainHelper'

export default function Terrain({ selectedZone }) {
  // Generate the 3D Isometric Terrain Diorama:
  // 1. Top undulating surface with realistic hills, peaks, and river canyon
  // 2. Extruded vertical rock side skirts (North, South, East, West)
  // 3. Bottom slab base
  // 4. Winding blue river surface
  const { topGeometry, skirtGeometry, bottomGeometry, riverGeometry } = useMemo(() => {
    const segments = 80 // Crisp topography resolution
    const topGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, segments, segments)
    topGeo.rotateX(-Math.PI / 2) // Orient flat on X-Z plane

    const pos = topGeo.attributes.position
    const colors = []

    // 1. Elevate top surface and apply multi-tone natural earth & forest vertex coloring
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = getTerrainElevation(x, z)
      pos.setY(i, y)

      // Calculate distance from river for riparian soil tinting
      const riverX = getRiverCenterlineX(z)
      const distFromRiver = Math.abs(x - riverX)

      const color = new THREE.Color()

      if (distFromRiver < 4.2) {
        // Riverbed & wet shoreline: dark pebble & moist earth
        color.setRGB(0.18, 0.22, 0.17)
      } else if (distFromRiver < 7.5) {
        // Riparian zone: lush river meadow green
        color.setRGB(0.20, 0.38, 0.22)
      } else if (y > 9.5) {
        // High mountain peaks / exposed ridges: rugged rocky stone with moss
        const rockMix = Math.min(1, (y - 9.5) / 3.5)
        const baseGreen = new THREE.Color(0.16, 0.32, 0.18)
        const rockyStone = new THREE.Color(0.32, 0.36, 0.31)
        color.copy(baseGreen).lerp(rockyStone, rockMix)
      } else {
        // Forest terrain: rich natural canopy greens with zone-specific nuances
        if (x <= 0 && z <= 0) {
          // Zone 1: Dense North Canopy (rich dark emerald forest)
          color.setRGB(0.12 + (y * 0.008), 0.32 + (y * 0.012), 0.16 + (y * 0.006))
        } else if (x > 0 && z <= 0) {
          // Zone 2: East River Basin (wetland & delta green)
          color.setRGB(0.14 + (y * 0.008), 0.34 + (y * 0.010), 0.20 + (y * 0.008))
        } else if (x <= 0 && z > 0) {
          // Zone 3: South Wildlife Corridor (deep migration forest)
          color.setRGB(0.13 + (y * 0.008), 0.30 + (y * 0.011), 0.15 + (y * 0.006))
        } else {
          // Zone 4: West Buffer Zone (woodland / savannah olive)
          color.setRGB(0.16 + (y * 0.008), 0.31 + (y * 0.010), 0.14 + (y * 0.006))
        }
      }

      colors.push(color.r, color.g, color.b)
    }

    topGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    topGeo.computeVertexNormals()

    // 2. Build 3D Platform Skirt Walls (extruding the edges down to BASE_HEIGHT)
    const skirtPositions = []
    const skirtColors = []
    const wallCol = new THREE.Color('#252b26')
    const wallBaseCol = new THREE.Color('#1a1f1b')

    const addQuad = (p1, p2, p3, p4) => {
      // Triangle 1: p1, p2, p3
      skirtPositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z)
      // Triangle 2: p1, p3, p4
      skirtPositions.push(p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p4.x, p4.y, p4.z)

      for (let k = 0; k < 6; k++) {
        skirtColors.push(wallCol.r, wallCol.g, wallCol.b)
      }
    }

    const skirtSegments = 40
    // North edge: z = -HALF_SIZE, x from -HALF_SIZE to +HALF_SIZE
    for (let i = 0; i < skirtSegments; i++) {
      const x0 = -HALF_SIZE + (i / skirtSegments) * WORLD_SIZE
      const x1 = -HALF_SIZE + ((i + 1) / skirtSegments) * WORLD_SIZE
      const y0 = getTerrainElevation(x0, -HALF_SIZE)
      const y1 = getTerrainElevation(x1, -HALF_SIZE)

      addQuad(
        new THREE.Vector3(x0, y0, -HALF_SIZE),
        new THREE.Vector3(x1, y1, -HALF_SIZE),
        new THREE.Vector3(x1, BASE_HEIGHT, -HALF_SIZE),
        new THREE.Vector3(x0, BASE_HEIGHT, -HALF_SIZE)
      )
    }

    // South edge: z = +HALF_SIZE, x from +HALF_SIZE to -HALF_SIZE
    for (let i = 0; i < skirtSegments; i++) {
      const x0 = HALF_SIZE - (i / skirtSegments) * WORLD_SIZE
      const x1 = HALF_SIZE - ((i + 1) / skirtSegments) * WORLD_SIZE
      const y0 = getTerrainElevation(x0, HALF_SIZE)
      const y1 = getTerrainElevation(x1, HALF_SIZE)

      addQuad(
        new THREE.Vector3(x0, y0, HALF_SIZE),
        new THREE.Vector3(x1, y1, HALF_SIZE),
        new THREE.Vector3(x1, BASE_HEIGHT, HALF_SIZE),
        new THREE.Vector3(x0, BASE_HEIGHT, HALF_SIZE)
      )
    }

    // West edge: x = -HALF_SIZE, z from +HALF_SIZE to -HALF_SIZE
    for (let i = 0; i < skirtSegments; i++) {
      const z0 = HALF_SIZE - (i / skirtSegments) * WORLD_SIZE
      const z1 = HALF_SIZE - ((i + 1) / skirtSegments) * WORLD_SIZE
      const y0 = getTerrainElevation(-HALF_SIZE, z0)
      const y1 = getTerrainElevation(-HALF_SIZE, z1)

      addQuad(
        new THREE.Vector3(-HALF_SIZE, y0, z0),
        new THREE.Vector3(-HALF_SIZE, y1, z1),
        new THREE.Vector3(-HALF_SIZE, BASE_HEIGHT, z1),
        new THREE.Vector3(-HALF_SIZE, BASE_HEIGHT, z0)
      )
    }

    // East edge: x = +HALF_SIZE, z from -HALF_SIZE to +HALF_SIZE
    for (let i = 0; i < skirtSegments; i++) {
      const z0 = -HALF_SIZE + (i / skirtSegments) * WORLD_SIZE
      const z1 = -HALF_SIZE + ((i + 1) / skirtSegments) * WORLD_SIZE
      const y0 = getTerrainElevation(HALF_SIZE, z0)
      const y1 = getTerrainElevation(HALF_SIZE, z1)

      addQuad(
        new THREE.Vector3(HALF_SIZE, y0, z0),
        new THREE.Vector3(HALF_SIZE, y1, z1),
        new THREE.Vector3(HALF_SIZE, BASE_HEIGHT, z1),
        new THREE.Vector3(HALF_SIZE, BASE_HEIGHT, z0)
      )
    }

    const skirtGeo = new THREE.BufferGeometry()
    skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(skirtPositions, 3))
    skirtGeo.setAttribute('color', new THREE.Float32BufferAttribute(skirtColors, 3))
    skirtGeo.computeVertexNormals()

    // 3. Platform Base (Bottom plate at BASE_HEIGHT)
    const botGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE)
    botGeo.rotateX(Math.PI / 2) // Facing down
    botGeo.translate(0, BASE_HEIGHT, 0)

    // 4. Realistic Winding Blue River Ribbon
    // Generates a smooth ribbon adhering to the valley floor with variable width
    const riverSteps = 60
    const riverPositions = []
    const riverNormals = []
    const riverUVs = []

    for (let i = 0; i <= riverSteps; i++) {
      const t = i / riverSteps
      const z = -HALF_SIZE + t * WORLD_SIZE
      const centerX = getRiverCenterlineX(z)
      const waterY = Math.min(2.1, getTerrainElevation(centerX, z) + 0.35)

      // Slight width expansion in the wetland delta (Zone 2)
      const width = 3.8 + (1 - Math.abs(z / HALF_SIZE)) * 1.6

      const leftX = centerX - width / 2
      const rightX = centerX + width / 2

      // Quad vertices for river segment
      if (i > 0) {
        const prevT = (i - 1) / riverSteps
        const prevZ = -HALF_SIZE + prevT * WORLD_SIZE
        const prevCenterX = getRiverCenterlineX(prevZ)
        const prevWaterY = Math.min(2.1, getTerrainElevation(prevCenterX, prevZ) + 0.35)
        const prevWidth = 3.8 + (1 - Math.abs(prevZ / HALF_SIZE)) * 1.6

        const pL0 = new THREE.Vector3(prevCenterX - prevWidth / 2, prevWaterY, prevZ)
        const pR0 = new THREE.Vector3(prevCenterX + prevWidth / 2, prevWaterY, prevZ)
        const pL1 = new THREE.Vector3(leftX, waterY, z)
        const pR1 = new THREE.Vector3(rightX, waterY, z)

        // Triangle 1
        riverPositions.push(pL0.x, pL0.y, pL0.z, pR0.x, pR0.y, pR0.z, pR1.x, pR1.y, pR1.z)
        // Triangle 2
        riverPositions.push(pL0.x, pL0.y, pL0.z, pR1.x, pR1.y, pR1.z, pL1.x, pL1.y, pL1.z)

        for (let k = 0; k < 6; k++) {
          riverNormals.push(0, 1, 0)
          riverUVs.push(0.5, t)
        }
      }
    }

    const rivGeo = new THREE.BufferGeometry()
    rivGeo.setAttribute('position', new THREE.Float32BufferAttribute(riverPositions, 3))
    rivGeo.setAttribute('normal', new THREE.Float32BufferAttribute(riverNormals, 3))
    rivGeo.setAttribute('uv', new THREE.Float32BufferAttribute(riverUVs, 2))

    return {
      topGeometry: topGeo,
      skirtGeometry: skirtGeo,
      bottomGeometry: botGeo,
      riverGeometry: rivGeo
    }
  }, [])

  // Zone selection state
  const isZone1 = selectedZone === 'zone-1'
  const isZone2 = selectedZone === 'zone-2'
  const isZone3 = selectedZone === 'zone-3'
  const isZone4 = selectedZone === 'zone-4'

  return (
    <group>
      {/* 1. Main Realistic Undulating Terrain Surface */}
      <mesh geometry={topGeometry} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.82}
          metalness={0.06}
          flatShading={false}
        />
      </mesh>

      {/* 2. Platform 3D Diorama Skirt (Earth/Rock Side Walls) */}
      <mesh geometry={skirtGeometry} receiveShadow>
        <meshStandardMaterial
          color="#222823"
          roughness={0.9}
          metalness={0.05}
          flatShading={false}
        />
      </mesh>

      {/* 3. Platform Solid Bottom Plate */}
      <mesh geometry={bottomGeometry}>
        <meshBasicMaterial color="#181c19" />
      </mesh>

      {/* 4. Realistic Winding Blue River */}
      <mesh geometry={riverGeometry}>
        <meshStandardMaterial
          color="#1e7892"
          roughness={0.12}
          metalness={0.35}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* 5. Subtle Zone Divider Lines (Low-opacity dashed grid dividing the 4 sectors) */}
      <mesh position={[0, 3.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[WORLD_SIZE * 0.94, 0.2]} />
        <meshBasicMaterial color="#ffffff" opacity={0.18} transparent />
      </mesh>
      <mesh position={[0, 3.8, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[WORLD_SIZE * 0.94, 0.2]} />
        <meshBasicMaterial color="#ffffff" opacity={0.18} transparent />
      </mesh>

      {/* 6. Subtle Zone Ground Highlight Overlays (Active Sector Focus) */}
      {isZone1 && (
        <mesh position={[-25, 3.7, -25]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[46, 46]} />
          <meshBasicMaterial color="#245E45" opacity={0.09} transparent />
        </mesh>
      )}
      {isZone2 && (
        <mesh position={[25, 3.7, -25]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[46, 46]} />
          <meshBasicMaterial color="#1F7A78" opacity={0.09} transparent />
        </mesh>
      )}
      {isZone3 && (
        <mesh position={[-25, 3.7, 25]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[46, 46]} />
          <meshBasicMaterial color="#754EB4" opacity={0.09} transparent />
        </mesh>
      )}
      {isZone4 && (
        <mesh position={[25, 3.7, 25]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[46, 46]} />
          <meshBasicMaterial color="#B77A20" opacity={0.09} transparent />
        </mesh>
      )}

      {/* 7. Compact, Professional White Zone Labels (Positioned neatly without overlapping sensors or river) */}
      <Html
        position={[-30, getTerrainElevation(-30, -32) + 2.5, -32]}
        center
        distanceFactor={60}
        zIndexRange={[80, 20]}
      >
        <div className={`compact-zone-badge ${isZone1 ? 'active' : ''}`}>
          <span className="zone-indicator-dot green" />
          <span>Zone 1 · North Canopy</span>
        </div>
      </Html>

      <Html
        position={[32, getTerrainElevation(32, -32) + 2.5, -32]}
        center
        distanceFactor={60}
        zIndexRange={[80, 20]}
      >
        <div className={`compact-zone-badge ${isZone2 ? 'active' : ''}`}>
          <span className="zone-indicator-dot teal" />
          <span>Zone 2 · River Basin</span>
        </div>
      </Html>

      <Html
        position={[-30, getTerrainElevation(-30, 34) + 2.5, 34]}
        center
        distanceFactor={60}
        zIndexRange={[80, 20]}
      >
        <div className={`compact-zone-badge ${isZone3 ? 'active' : ''}`}>
          <span className="zone-indicator-dot purple" />
          <span>Zone 3 · South Corridor</span>
        </div>
      </Html>

      <Html
        position={[32, getTerrainElevation(32, 34) + 2.5, 34]}
        center
        distanceFactor={60}
        zIndexRange={[80, 20]}
      >
        <div className={`compact-zone-badge ${isZone4 ? 'active' : ''}`}>
          <span className="zone-indicator-dot amber" />
          <span>Zone 4 · West Buffer</span>
        </div>
      </Html>
    </group>
  )
}
