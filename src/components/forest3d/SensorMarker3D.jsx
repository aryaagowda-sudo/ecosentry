import React, { useState } from 'react'
import { Html } from '@react-three/drei'
import { Camera, Radio, AlertTriangle } from 'lucide-react'
import { gridToWorld } from './terrainHelper'

export default function SensorMarker3D({ sensor, onSelectSensor, isSelected }) {
  const [hovered, setHovered] = useState(false)
  const [worldX, worldY, worldZ] = gridToWorld(
    sensor.coordinates.x,
    sensor.coordinates.y
  )

  const isOnline = sensor.status === 'online'
  const isCamera = sensor.type === 'camera'
  const activeHighlight = hovered || isSelected

  // Compact sensor code
  const shortId = sensor.id.replace('CAM-', 'C-').replace('AC-', 'A-')

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

      {/* Ground Footprint Ring for Selection */}
      {activeHighlight && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1.1, 16]} />
          <meshBasicMaterial
            color={isCamera ? '#39B8B0' : '#27C58A'}
            transparent
            opacity={0.6}
            side={2}
          />
        </mesh>
      )}

      {/* Floating 3D Interactive Tag / Billboard - Prioritized & Compact */}
      <Html
        position={[0, 2.5, 0]}
        center
        distanceFactor={50}
        zIndexRange={[140, 60]}
      >
        <div
          className={`marker-3d-pin sensor ${isCamera ? 'camera' : 'acoustic'} ${!isOnline ? 'offline' : ''} ${activeHighlight ? 'expanded' : 'compact'}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation()
            onSelectSensor({ itemType: 'sensor', data: sensor })
          }}
          title={`${sensor.name} (${sensor.id}) • Click to inspect`}
        >
          <div className="pin-icon-wrap">
            {!isOnline ? (
              <AlertTriangle size={11} style={{ color: 'var(--accent-red)' }} />
            ) : isCamera ? (
              <Camera size={11} style={{ color: 'var(--accent-teal)' }} />
            ) : (
              <Radio size={11} style={{ color: 'var(--accent-green)' }} />
            )}
          </div>

          {activeHighlight ? (
            <div className="pin-expanded-content">
              <span className="pin-title">{sensor.id}</span>
              <span className="pin-meta">{sensor.battery}% • {sensor.status.toUpperCase()}</span>
            </div>
          ) : (
            <span className="pin-label-mini">{shortId}</span>
          )}
        </div>
      </Html>
    </group>
  )
}
