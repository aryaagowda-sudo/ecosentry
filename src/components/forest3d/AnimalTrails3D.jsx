import React, { useMemo } from 'react'
import * as THREE from 'three'
import { gridToWorld, getTerrainElevation } from './terrainHelper'

export default function AnimalTrails3D({ trails }) {
  // Generate subtle, natural 3D curved pathways adhering to the elevated terrain
  const trailMeshes = useMemo(() => {
    return trails.map((trail) => {
      // Map 2D trail points (0-100) to 3D world points following terrain elevation
      const worldPoints = trail.points.map((pt) => {
        const [wx, wy, wz] = gridToWorld(pt.x, pt.y)
        return new THREE.Vector3(wx, wy + 0.12, wz) // Raised just slightly above ground
      })

      // Interpolate extra points along the spline so the trail hugs hilly terrain tightly
      const rawCurve = new THREE.CatmullRomCurve3(worldPoints)
      const densePoints = []
      const steps = 40
      for (let i = 0; i <= steps; i++) {
        const p = rawCurve.getPoint(i / steps)
        const groundY = getTerrainElevation(p.x, p.z)
        densePoints.push(new THREE.Vector3(p.x, groundY + 0.12, p.z))
      }

      const fittedCurve = new THREE.CatmullRomCurve3(densePoints)
      const tubeGeo = new THREE.TubeGeometry(fittedCurve, 44, 0.28, 6, false)

      return {
        id: trail.id,
        name: trail.name,
        color: trail.color,
        geometry: tubeGeo
      }
    })
  }, [trails])

  return (
    <group>
      {trailMeshes.map((t) => (
        <mesh key={t.id} geometry={t.geometry}>
          <meshStandardMaterial
            color={t.color}
            roughness={0.7}
            transparent
            opacity={0.75}
          />
        </mesh>
      ))}
    </group>
  )
}
