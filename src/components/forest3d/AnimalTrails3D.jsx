import React, { useMemo } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { gridToWorld, getTerrainElevation } from './terrainHelper'

export default function AnimalTrails3D({ trails }) {
  // Generate 3D Catmull-Rom spline curves from the 2D trail coordinate arrays
  const trailMeshes = useMemo(() => {
    return trails.map((trail) => {
      // Map 2D trail points (0-100) to 3D world points with terrain elevation
      const worldPoints = trail.points.map((pt) => {
        const [wx, wy, wz] = gridToWorld(pt.x, pt.y)
        return new THREE.Vector3(wx, wy + 0.18, wz) // Raise slightly above ground
      })

      const curve = new THREE.CatmullRomCurve3(worldPoints)
      const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.45, 6, false)

      // Find midpoint for floating label
      const midPoint = curve.getPoint(0.5)

      return {
        id: trail.id,
        name: trail.name,
        color: trail.color,
        geometry: tubeGeo,
        midPoint
      }
    })
  }, [trails])

  return (
    <group>
      {trailMeshes.map((t) => (
        <group key={t.id}>
          {/* 3D Trail Tube Ribbon */}
          <mesh geometry={t.geometry}>
            <meshStandardMaterial
              color={t.color}
              roughness={0.6}
              transparent
              opacity={0.85}
              emissive={t.color}
              emissiveIntensity={0.2}
            />
          </mesh>

          {/* Trail Label */}
          <group position={[t.midPoint.x, t.midPoint.y + 1.8, t.midPoint.z]}>
            <Text
              fontSize={1.4}
              color={t.color}
              anchorX="center"
              anchorY="bottom"
              fillOpacity={0.9}
              rotation={[-Math.PI / 4, 0, 0]}
            >
              {t.name}
            </Text>
          </group>
        </group>
      ))}
    </group>
  )
}
