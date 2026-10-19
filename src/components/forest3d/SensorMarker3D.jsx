import React from 'react'
import { Html } from '@react-three/drei'
import { Camera, Radio, AlertTriangle } from 'lucide-react'
import { gridToWorld } from './terrainHelper'

export default function SensorMarker3D({ sensor, onSelectSensor }) {
  const [worldX, worldY, worldZ] = gridToWorld(
    sensor.coordinates.x,
    sensor.coordinates.y
  )

  const isOnline = sensor.status === 'online'
  const isCamera = sensor.type === 'camera'

  // Visual Theme
  const accentColor = isOnline ? (isCamera ? '#06b6d4' : '#10b981') : '#64746b'

  return (
    <group position={[worldX, worldY, worldZ]}>
      {/* 3D Physical Sensor Mounting Post */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 2.0, 6]} />
        <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.4} />
      </mesh>

      {/* 3D Sensor Head Unit */}
      {isCamera ? (
        // Camera Trap Box Model
        <group position={[0, 2.0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.55, 0.45, 0.45]} />
            <meshStandardMaterial color={isOnline ? '#0f172a' : '#334155'} roughness={0.5} />
          </mesh>
          {/* Camera Lens */}
          <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.12, 10]} />
            <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ) : (
        // Acoustic Array Sensor Dome Model
        <group position={[0, 2.0, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.35, 10, 8]} />
            <meshStandardMaterial color={isOnline ? '#064e3b' : '#334155'} roughness={0.5} />
          </mesh>
          {/* Microphones Antenna Pins */}
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.4, 4]} />
            <meshStandardMaterial color="#94a39b" />
          </mesh>
        </group>
      )}

      {/* Floating 3D Interactive Tag / Billboard */}
      <Html
        position={[0, 2.9, 0]}
        center
        distanceFactor={45}
        zIndexRange={[100, 0]}
      >
        <div
          className={`marker-3d-tag sensor ${isOnline ? (isCamera ? 'camera' : 'acoustic') : 'offline'}`}
          onClick={(e) => {
            e.stopPropagation()
            onSelectSensor({ itemType: 'sensor', data: sensor })
          }}
          title={`Click to view ${sensor.id} details`}
        >
          <div className="tag-icon">
            {!isOnline ? (
              <AlertTriangle size={12} color="#f87171" />
            ) : isCamera ? (
              <Camera size={12} color="#38bdf8" />
            ) : (
              <Radio size={12} color="#34d399" />
            )}
          </div>
          <span className="tag-label">{sensor.id}</span>
          {!isOnline && <span className="tag-status-flag">OFFLINE</span>}
        </div>
      </Html>
    </group>
  )
}
