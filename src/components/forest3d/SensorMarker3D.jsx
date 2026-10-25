import React, { useState } from 'react'
import { Html } from '@react-three/drei'
import { Camera, Radio, AlertTriangle } from 'lucide-react'
import { gridToWorld, getSensorDisplayTag } from './terrainHelper'

export default function SensorMarker3D({ sensor, onSelectSensor, isSelected }) {
  const [hovered, setHovered] = useState(false)
  const [worldX, worldY, worldZ] = gridToWorld(
    sensor.coordinates.x,
    sensor.coordinates.y
  )

  const isOnline = sensor.status === 'online'
  const isCamera = sensor.type === 'camera'
  const activeHighlight = hovered || isSelected
  const displayTag = getSensorDisplayTag(sensor.id)

  return (
    <group position={[worldX, worldY, worldZ]}>
      {/* 3D Physical Sensor Mounting Post on the terrain */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.14, 2.0, 6]} />
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
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.4, 4]} />
            <meshStandardMaterial color="#94a39b" />
          </mesh>
        </group>
      )}

      {/* Ground Footprint Ring for Selection */}
      {activeHighlight && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1.2, 20]} />
          <meshBasicMaterial
            color={!isOnline ? '#B77A20' : isCamera ? '#1F7A78' : '#245E45'}
            transparent
            opacity={0.65}
            side={2}
          />
        </mesh>
      )}

      {/* Compact, Clean Marker Card — Matching Image 2 */}
      <Html
        position={[0, 2.8, 0]}
        center
        distanceFactor={52}
        zIndexRange={[180, 80]}
      >
        <div
          className={`compact-sensor-tag ${isCamera ? 'camera' : 'acoustic'} ${!isOnline ? 'offline' : ''} ${activeHighlight ? 'selected' : ''}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation()
            onSelectSensor({ itemType: 'sensor', data: sensor })
          }}
          title={`${sensor.name} (${sensor.id}) • Click to inspect telemetry`}
        >
          <div className="tag-icon">
            {!isOnline ? (
              <AlertTriangle size={11} style={{ color: 'var(--accent-amber)' }} />
            ) : isCamera ? (
              <Camera size={11} style={{ color: 'var(--accent-teal)' }} />
            ) : (
              <Radio size={11} style={{ color: 'var(--accent-green)' }} />
            )}
          </div>

          <span className="tag-id-text">{displayTag}</span>

          {/* Tooltip on hover/selection for rich parameters without permanent clutter */}
          {activeHighlight && (
            <div className="tag-hover-tooltip">
              <div className="tooltip-title">{sensor.name}</div>
              <div className="tooltip-meta">
                <span>ID: {sensor.id}</span>
                <span>•</span>
                <span>Batt: {sensor.battery}%</span>
                <span>•</span>
                <span style={{ textTransform: 'uppercase' }}>{sensor.status}</span>
              </div>
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}
