import React, { useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
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

    // 4. Realistic Winding Blue River Mesh directly inside the Recessed Channel
    // Built with 120 steps along the channel curves and 4 segments across the width,
    // conforming smoothly to the valley bed while remaining slightly crowned in the center.
    const riverSteps = 120
    const riverSegmentsX = 4
    const riverPositions = []
    const riverUVs = []

    for (let i = 0; i <= riverSteps; i++) {
      const t = i / riverSteps
      const z = -HALF_SIZE + t * WORLD_SIZE
      const centerX = getRiverCenterlineX(z)
      const width = 3.8 + (1 - Math.abs(z / HALF_SIZE)) * 1.4

      if (i > 0) {
        const prevT = (i - 1) / riverSteps
        const prevZ = -HALF_SIZE + prevT * WORLD_SIZE
        const prevCenterX = getRiverCenterlineX(prevZ)
        const prevWidth = 3.8 + (1 - Math.abs(prevZ / HALF_SIZE)) * 1.4

        const v0 = prevT * 12
        const v1 = t * 12

        for (let j = 0; j < riverSegmentsX; j++) {
          const u0 = j / riverSegmentsX
          const u1 = (j + 1) / riverSegmentsX

          // Relative offsets across channel width [-0.5 to +0.5]
          const normOffset0 = u0 - 0.5
          const normOffset1 = u1 - 0.5

          // Current step vertices across width
          const currX0 = centerX + normOffset0 * width
          const currX1 = centerX + normOffset1 * width
          const currGround0 = getTerrainElevation(currX0, z)
          const currGround1 = getTerrainElevation(currX1, z)
          // Crown profile: +0.24 above center bed, +0.14 at riverbank edges
          const currCrown0 = 0.24 - Math.abs(normOffset0) * 0.20
          const currCrown1 = 0.24 - Math.abs(normOffset1) * 0.20
          const currY0 = currGround0 + currCrown0
          const currY1 = currGround1 + currCrown1

          // Previous step vertices across width
          const prevX0 = prevCenterX + normOffset0 * prevWidth
          const prevX1 = prevCenterX + normOffset1 * prevWidth
          const prevGround0 = getTerrainElevation(prevX0, prevZ)
          const prevGround1 = getTerrainElevation(prevX1, prevZ)
          const prevCrown0 = 0.24 - Math.abs(normOffset0) * 0.20
          const prevCrown1 = 0.24 - Math.abs(normOffset1) * 0.20
          const prevY0 = prevGround0 + prevCrown0
          const prevY1 = prevGround1 + prevCrown1

          // Quad vertices:
          // Triangle 1
          riverPositions.push(prevX0, prevY0, prevZ, prevX1, prevY1, prevZ, currX1, currY1, z)
          riverUVs.push(u0, v0, u1, v0, u1, v1)

          // Triangle 2
          riverPositions.push(prevX0, prevY0, prevZ, currX1, currY1, z, currX0, currY0, z)
          riverUVs.push(u0, v0, u1, v1, u0, v1)
        }
      }
    }

    const rivGeo = new THREE.BufferGeometry()
    rivGeo.setAttribute('position', new THREE.Float32BufferAttribute(riverPositions, 3))
    rivGeo.setAttribute('uv', new THREE.Float32BufferAttribute(riverUVs, 2))
    rivGeo.computeVertexNormals()

    return {
      topGeometry: topGeo,
      skirtGeometry: skirtGeo,
      bottomGeometry: botGeo,
      riverGeometry: rivGeo
    }
  }, [])

  // Procedural flowing water texture with caustics, stream ribbons, and wave crests
  const waterTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    // 1. Base natural forest river gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 512)
    bgGrad.addColorStop(0, '#155264')
    bgGrad.addColorStop(0.5, '#1e758c')
    bgGrad.addColorStop(1, '#185d72')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, 512, 512)

    // 2. Longitudinal flow streamlines (parallel current ribbons)
    for (let col = 0; col < 512; col += 32) {
      ctx.strokeStyle = 'rgba(75, 185, 208, 0.22)'
      ctx.lineWidth = 12
      ctx.beginPath()
      ctx.moveTo(col, 0)
      for (let y = 0; y <= 512; y += 32) {
        const xOffset = Math.sin((y / 512) * Math.PI * 4 + col) * 6
        ctx.lineTo(col + xOffset, y)
      }
      ctx.stroke()
    }

    // 3. Flowing caustics / transverse water ripples
    for (let row = 0; row < 512; row += 20) {
      // Primary wave crest
      ctx.strokeStyle = 'rgba(215, 245, 255, 0.45)'
      ctx.lineWidth = 3.0
      ctx.beginPath()
      ctx.moveTo(0, row)
      for (let x = 0; x <= 512; x += 16) {
        const yOffset = Math.sin((x / 512) * Math.PI * 6 + row) * 4.5 + Math.cos((x / 512) * Math.PI * 10) * 2.0
        ctx.lineTo(x, row + yOffset)
      }
      ctx.stroke()

      // Subtle bright sunlight shimmer highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(0, row + 7)
      for (let x = 0; x <= 512; x += 20) {
        const yOffset = Math.sin((x / 512) * Math.PI * 8 + row * 0.7) * 3.5
        ctx.lineTo(x, row + 7 + yOffset)
      }
      ctx.stroke()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1, 4)
    return texture
  }, [])

  // Check reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Animate water flowing downstream from North to South continuously
  useFrame((_, delta) => {
    if (waterTexture && !prefersReducedMotion) {
      waterTexture.offset.y -= delta * 0.30
    }
  })

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

      {/* 4. Realistic Winding River directly inside the Recessed Ground Channel */}
      <mesh geometry={riverGeometry} receiveShadow>
        <meshStandardMaterial
          map={waterTexture}
          color="#268fa8"
          roughness={0.16}
          metalness={0.32}
          transparent
          opacity={0.94}
          side={THREE.DoubleSide}
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
        key="zone-badge-1"
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
        key="zone-badge-2"
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
        key="zone-badge-3"
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
        key="zone-badge-4"
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
