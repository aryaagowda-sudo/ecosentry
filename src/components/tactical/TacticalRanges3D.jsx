import * as THREE from 'three'

/**
 * 3D Tactical Sensor Range Visualizer
 * 
 * Accurately renders:
 * 1. Bluetooth-Like Communication Range: Translucent Cyan Spheres
 * 2. Acoustic Detection Range: Translucent Emerald / Amber Spheres
 * 
 * Supports independent visibility controls:
 * - 'none'
 * - 'selected'
 * - 'incident' (sensors detecting the active incident)
 * - 'all'
 */
export default function TacticalRanges3D({
  sensors = [],
  selectedSensorId = null,
  detectingSensorIds = [],
  commRangeMode = 'none', // 'none' | 'selected' | 'all'
  acousticRangeMode = 'none' // 'none' | 'selected' | 'incident' | 'all'
}) {
  // 1. Determine which sensors show communication range
  const commSensors = sensors.filter((sensor) => {
    if (commRangeMode === 'none') return false
    if (commRangeMode === 'all') return true
    if (commRangeMode === 'selected') return sensor.id === selectedSensorId
    return false
  })

  // 2. Determine which sensors show acoustic hearing range
  const acousticSensors = sensors.filter((sensor) => {
    if (acousticRangeMode === 'none') return false
    if (acousticRangeMode === 'all') return true
    if (acousticRangeMode === 'selected') return sensor.id === selectedSensorId
    if (acousticRangeMode === 'incident') return detectingSensorIds.includes(sensor.id)
    return false
  })

  return (
    <group>
      {/* 1. Bluetooth-like Communication Ranges (Translucent Cyan Spheres) */}
      {commSensors.map((sensor) => {
        const radius = sensor.communicationRange || 22.0
        const { x, y, z } = sensor.position

        return (
          <group key={`comm-range-${sensor.id}`} position={[x, y, z]}>
            {/* 3D Sphere */}
            <mesh>
              <sphereGeometry args={[radius, 24, 24]} />
              <meshBasicMaterial
                color="#06b6d4"
                transparent
                opacity={0.08}
                wireframe={false}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Wireframe Outline Rim */}
            <mesh>
              <sphereGeometry args={[radius, 16, 16]} />
              <meshBasicMaterial
                color="#22d3ee"
                wireframe
                transparent
                opacity={0.16}
                depthWrite={false}
              />
            </mesh>

            {/* Ground Footprint Ring */}
            <mesh position={[0, -y + 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radius - 0.2, radius + 0.2, 48]} />
              <meshBasicMaterial
                color="#06b6d4"
                transparent
                opacity={0.35}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        )
      })}

      {/* 2. Acoustic Hearing Ranges (Translucent Green/Amber Spheres) */}
      {acousticSensors.map((sensor) => {
        const radius = sensor.acousticDetectionRange || 28.0
        const isDetecting = detectingSensorIds.includes(sensor.id)
        const acousticColor = isDetecting ? '#f59e0b' : '#10b981'
        const { x, y, z } = sensor.position

        return (
          <group key={`acoustic-range-${sensor.id}`} position={[x, y, z]}>
            {/* 3D Detection Horizon Sphere */}
            <mesh>
              <sphereGeometry args={[radius, 24, 24]} />
              <meshBasicMaterial
                color={acousticColor}
                transparent
                opacity={0.07}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Wireframe Grid */}
            <mesh>
              <sphereGeometry args={[radius, 16, 16]} />
              <meshBasicMaterial
                color={acousticColor}
                wireframe
                transparent
                opacity={0.15}
                depthWrite={false}
              />
            </mesh>

            {/* Ground Footprint Disc */}
            <mesh position={[0, -y + 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radius - 0.25, radius + 0.25, 48]} />
              <meshBasicMaterial
                color={acousticColor}
                transparent
                opacity={0.4}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
