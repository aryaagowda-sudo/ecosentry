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
      const moisture = Math.max(0, 1 - distFromRiver / 12)
      const elevationShade = THREE.MathUtils.clamp((y - 2.5) / 12, 0, 1)

      if (distFromRiver < 4.2) {
        // Riverbed & wet shoreline: dark pebble & moist earth
        color.setRGB(0.18, 0.22, 0.17)
      } else if (distFromRiver < 7.5) {
        // Riparian zone: lush river meadow green
        color.setRGB(0.24, 0.42, 0.25)
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
          color.setRGB(0.14 + elevationShade * 0.045, 0.32 + elevationShade * 0.075, 0.17 + elevationShade * 0.035)
        } else if (x > 0 && z <= 0) {
          // Zone 2: East River Basin (wetland & delta green)
          color.setRGB(0.16 + moisture * 0.025, 0.35 + moisture * 0.06, 0.21 + moisture * 0.045)
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

    // 2. Build 3D Platform Skirt Walls (Sedimentary Rock Strata Cutaway)
    const skirtPositions = []
    const skirtUVs = []

    const addQuad = (p1, p2, p3, p4, u0, u1) => {
      // Triangle 1: p1, p2, p3
      skirtPositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z)
      skirtUVs.push(u0, 1.0, u1, 1.0, u1, 0.0)

      // Triangle 2: p1, p3, p4
      skirtPositions.push(p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p4.x, p4.y, p4.z)
      skirtUVs.push(u0, 1.0, u1, 0.0, u0, 0.0)
    }

    const skirtSegments = 40
    // North edge: z = -HALF_SIZE, x from -HALF_SIZE to +HALF_SIZE
    for (let i = 0; i < skirtSegments; i++) {
      const u0 = i / skirtSegments
      const u1 = (i + 1) / skirtSegments
      const x0 = -HALF_SIZE + u0 * WORLD_SIZE
      const x1 = -HALF_SIZE + u1 * WORLD_SIZE
      const y0 = getTerrainElevation(x0, -HALF_SIZE)
      const y1 = getTerrainElevation(x1, -HALF_SIZE)

      addQuad(
        new THREE.Vector3(x0, y0, -HALF_SIZE),
        new THREE.Vector3(x1, y1, -HALF_SIZE),
        new THREE.Vector3(x1, BASE_HEIGHT, -HALF_SIZE),
        new THREE.Vector3(x0, BASE_HEIGHT, -HALF_SIZE),
        u0,
        u1
      )
    }

    // South edge: z = +HALF_SIZE, x from +HALF_SIZE to -HALF_SIZE
    for (let i = 0; i < skirtSegments; i++) {
      const u0 = i / skirtSegments
      const u1 = (i + 1) / skirtSegments
      const x0 = HALF_SIZE - u0 * WORLD_SIZE
      const x1 = HALF_SIZE - u1 * WORLD_SIZE
      const y0 = getTerrainElevation(x0, HALF_SIZE)
      const y1 = getTerrainElevation(x1, HALF_SIZE)

      addQuad(
        new THREE.Vector3(x0, y0, HALF_SIZE),
        new THREE.Vector3(x1, y1, HALF_SIZE),
        new THREE.Vector3(x1, BASE_HEIGHT, HALF_SIZE),
        new THREE.Vector3(x0, BASE_HEIGHT, HALF_SIZE),
        u0,
        u1
      )
    }

    // West edge: x = -HALF_SIZE, z from +HALF_SIZE to -HALF_SIZE
    for (let i = 0; i < skirtSegments; i++) {
      const u0 = i / skirtSegments
      const u1 = (i + 1) / skirtSegments
      const z0 = HALF_SIZE - u0 * WORLD_SIZE
      const z1 = HALF_SIZE - u1 * WORLD_SIZE
      const y0 = getTerrainElevation(-HALF_SIZE, z0)
      const y1 = getTerrainElevation(-HALF_SIZE, z1)

      addQuad(
        new THREE.Vector3(-HALF_SIZE, y0, z0),
        new THREE.Vector3(-HALF_SIZE, y1, z1),
        new THREE.Vector3(-HALF_SIZE, BASE_HEIGHT, z1),
        new THREE.Vector3(-HALF_SIZE, BASE_HEIGHT, z0),
        u0,
        u1
      )
    }

    // East edge: x = +HALF_SIZE, z from -HALF_SIZE to +HALF_SIZE
    for (let i = 0; i < skirtSegments; i++) {
      const u0 = i / skirtSegments
      const u1 = (i + 1) / skirtSegments
      const z0 = -HALF_SIZE + u0 * WORLD_SIZE
      const z1 = -HALF_SIZE + u1 * WORLD_SIZE
      const y0 = getTerrainElevation(HALF_SIZE, z0)
      const y1 = getTerrainElevation(HALF_SIZE, z1)

      addQuad(
        new THREE.Vector3(HALF_SIZE, y0, z0),
        new THREE.Vector3(HALF_SIZE, y1, z1),
        new THREE.Vector3(HALF_SIZE, BASE_HEIGHT, z1),
        new THREE.Vector3(HALF_SIZE, BASE_HEIGHT, z0),
        u0,
        u1
      )
    }

    const skirtGeo = new THREE.BufferGeometry()
    skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(skirtPositions, 3))
    skirtGeo.setAttribute('uv', new THREE.Float32BufferAttribute(skirtUVs, 2))
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
          // Keep the water inside the carved channel while retaining a subtle reflective crown.
          const currCrown0 = 0.08 - Math.abs(normOffset0) * 0.03
          const currCrown1 = 0.08 - Math.abs(normOffset1) * 0.03
          const currY0 = currGround0 + currCrown0
          const currY1 = currGround1 + currCrown1

          // Previous step vertices across width
          const prevX0 = prevCenterX + normOffset0 * prevWidth
          const prevX1 = prevCenterX + normOffset1 * prevWidth
          const prevGround0 = getTerrainElevation(prevX0, prevZ)
          const prevGround1 = getTerrainElevation(prevX1, prevZ)
          const prevCrown0 = 0.08 - Math.abs(normOffset0) * 0.03
          const prevCrown1 = 0.08 - Math.abs(normOffset1) * 0.03
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

  // Realistic Sedimentary Rock Strata Canvas Texture for the Cutaway Diorama Skirt
  // Horizontally banded geological strata (humus, sandstone, siltstone, shale, basal bedrock)
  // with fine horizontal micro-laminae bedding lines, vertical joints, and mineral grain stippling.
  const rockStrataTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    // Stratigraphic horizontal deposition bands
    const bands = [
      { start: 0, end: 32, color: '#34281E' },    // Top humus & root zone beneath grass
      { start: 32, end: 58, color: '#56473A' },   // Weathered subsoil layer
      { start: 58, end: 114, color: '#998671' },  // Upper sandstone layer
      { start: 114, end: 142, color: '#45392F' }, // Dark compacted shale band
      { start: 142, end: 208, color: '#B3A18A' }, // Buff siltstone & limestone
      { start: 208, end: 246, color: '#6B5949' }, // Medium mudstone stratum
      { start: 246, end: 294, color: '#8C7763' }, // Weathered sandstone
      { start: 294, end: 326, color: '#3C3127' }, // Dense dark shale layer
      { start: 326, end: 390, color: '#A5917B' }, // Lower sandstone stratum
      { start: 390, end: 430, color: '#594A3D' }, // Siltstone layer
      { start: 430, end: 472, color: '#816E5A' }, // Lower sediment
      { start: 472, end: 512, color: '#2D231B' }  // Basal bedrock base
    ]

    for (const band of bands) {
      ctx.fillStyle = band.color
      ctx.fillRect(0, band.start, 512, band.end - band.start)
    }

    // Micro-laminae: Horizontal deposition bedding striations across all strata
    for (let y = 3; y < 512; y += 3 + Math.random() * 5) {
      const isDark = Math.random() > 0.4
      ctx.strokeStyle = isDark ? 'rgba(25, 18, 12, 0.38)' : 'rgba(240, 225, 205, 0.24)'
      ctx.lineWidth = Math.random() > 0.75 ? 1.6 : 0.8
      ctx.beginPath()
      ctx.moveTo(0, y)
      for (let x = 0; x <= 512; x += 16) {
        const wobble = Math.sin(x * 0.04 + y * 0.5) * 1.6 + Math.cos(x * 0.08) * 0.8
        ctx.lineTo(x, y + wobble)
      }
      ctx.stroke()
    }

    // Vertical geological joints & stress fractures
    for (let x = 12; x < 512; x += 24 + Math.random() * 36) {
      ctx.strokeStyle = 'rgba(18, 12, 8, 0.28)'
      ctx.lineWidth = 1.0 + Math.random() * 1.1
      ctx.beginPath()
      let curX = x
      ctx.moveTo(curX, 28)
      for (let y = 28; y < 512; y += 22) {
        curX += (Math.random() - 0.5) * 3.5
        ctx.lineTo(curX, y)
      }
      ctx.stroke()
    }

    // Natural sedimentary grain stippling
    const imgData = ctx.getImageData(0, 0, 512, 512)
    const d = imgData.data
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 18
      d[i] = Math.min(255, Math.max(0, d[i] + noise))
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise))
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise))
    }
    ctx.putImageData(imgData, 0, 0)

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.repeat.set(2, 1)
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

      {/* 2. Platform 3D Diorama Skirt (Cutaway Sedimentary Rock Strata) */}
      <mesh geometry={skirtGeometry} receiveShadow>
        <meshStandardMaterial
          map={rockStrataTexture}
          roughness={0.94}
          metalness={0.02}
          flatShading={false}
          color="#a58f78"
        />
      </mesh>

      {/* 3. Platform Solid Bottom Plate */}
      <mesh geometry={bottomGeometry}>
        <meshBasicMaterial color="#2B221A" />
      </mesh>

      {/* 4. Realistic Winding River directly inside the Recessed Ground Channel */}
      <mesh geometry={riverGeometry} receiveShadow>
        <meshStandardMaterial
          map={waterTexture}
          color="#2f8090"
          roughness={0.24}
          metalness={0.14}
          transparent
          opacity={0.9}
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

      {/* 7. Clean, Minimalist White Zone Pills Matching Image 2 */}
      <Html
        key="zone-badge-1"
        position={[-22, getTerrainElevation(-22, -26) + 4.2, -26]}
        center
        distanceFactor={65}
        zIndexRange={[80, 20]}
      >
        <div className={`compact-zone-badge ${isZone1 ? 'active' : ''}`}>
          <span className="zone-indicator-dot green" />
          <span>01 · North Canopy Reserve</span>
        </div>
      </Html>

      <Html
        key="zone-badge-2"
        position={[26, getTerrainElevation(26, -24) + 4.2, -24]}
        center
        distanceFactor={65}
        zIndexRange={[80, 20]}
      >
        <div className={`compact-zone-badge ${isZone2 ? 'active' : ''}`}>
          <span className="zone-indicator-dot teal" />
          <span>02 · East River Basin</span>
        </div>
      </Html>

      <Html
        key="zone-badge-3"
        position={[-24, getTerrainElevation(-24, 24) + 4.2, 24]}
        center
        distanceFactor={65}
        zIndexRange={[80, 20]}
      >
        <div className={`compact-zone-badge ${isZone3 ? 'active' : ''}`}>
          <span className="zone-indicator-dot purple" />
          <span>03 · Southern reserve</span>
        </div>
      </Html>

      <Html
        key="zone-badge-4"
        position={[26, getTerrainElevation(26, 24) + 4.2, 24]}
        center
        distanceFactor={65}
        zIndexRange={[80, 20]}
      >
        <div className={`compact-zone-badge ${isZone4 ? 'active' : ''}`}>
          <span className="zone-indicator-dot amber" />
          <span>04 · West Buffer Zone</span>
        </div>
      </Html>
    </group>
  )
}
